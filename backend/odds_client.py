import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
import unicodedata

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "odds_config.json")
CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "odds_cache.json")
STATUS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "keys_status.json")

PRIORITY_LEAGUES = [
    "premier league", "laliga", "serie a", "bundesliga", "ligue 1",
    "champions league", "europa league", "conference league",
    "mls", "argentina", "brasileirao", "liga mx", "turkey", "denmark",
    "colombia", "ecuador", "peru", "chile", "nba", "wnba", "atp", "wta"
]

class KeyRotationManager:
    def __init__(self, config_path=CONFIG_PATH):
        self.config_path = config_path
        self.keys = []
        self.current_index = 0
        self.key_status = {}
        self.preferred_bookmakers = "1xbet,Bet365"
        self.cache_ttl_minutes = 120
        self.max_fetch_per_run = 45
        self.load_config()
        self.load_status()

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    self.keys = cfg.get("api_keys", [])
                    self.preferred_bookmakers = cfg.get("preferred_bookmakers", "1xbet,Bet365")
                    self.cache_ttl_minutes = cfg.get("cache_ttl_minutes", 120)
                    self.max_fetch_per_run = cfg.get("max_odds_fetch_per_run", 45)
            except Exception as e:
                print(f"[ODDS] Error cargando config: {e}")
        
        self.keys = [k for k in self.keys if k and not k.startswith("YOUR_ODDS_API_KEY")]

    def load_status(self):
        if os.path.exists(STATUS_PATH):
            try:
                with open(STATUS_PATH, "r", encoding="utf-8") as f:
                    self.key_status = json.load(f)
            except Exception:
                self.key_status = {}

    def save_status(self):
        try:
            with open(STATUS_PATH, "w", encoding="utf-8") as f:
                json.dump(self.key_status, f, indent=2)
        except Exception as e:
            print(f"[ODDS] Error guardando status de keys: {e}")

    def get_active_key(self):
        if not self.keys:
            return None
        now = time.time()
        for _ in range(len(self.keys)):
            k = self.keys[self.current_index % len(self.keys)]
            st = self.key_status.get(k, {})
            # Si tiene cooldown temporal por 429
            if st.get("rate_limited_until", 0) > now:
                self.current_index = (self.current_index + 1) % len(self.keys)
                continue
            return k
        # Si todas estan en cooldown, retornar la actual
        return self.keys[self.current_index % len(self.keys)]

    def record_usage(self, key, is_success=True):
        if not key:
            return
        if key not in self.key_status:
            self.key_status[key] = {"total_calls": 0, "errors": 0}
        self.key_status[key]["total_calls"] = self.key_status[key].get("total_calls", 0) + 1
        self.key_status[key]["last_used"] = datetime.now(timezone.utc).isoformat()
        self.save_status()

    def mark_rate_limited(self, key, cooldown_seconds=60):
        print(f"[ODDS] [RATE LIMIT] Cooldown en clave {key[:8]} (rotando a la siguiente)...")
        if key not in self.key_status:
            self.key_status[key] = {"total_calls": 0, "errors": 0}
        self.key_status[key]["rate_limited_until"] = time.time() + cooldown_seconds
        self.save_status()
        self.rotate()

    def mark_exhausted(self, key):
        print(f"[ODDS] [WARN] Clave invalida/agotada: {key[:8]}... Rotando...")
        if key not in self.key_status:
            self.key_status[key] = {"total_calls": 0, "errors": 0}
        self.key_status[key]["exhausted"] = True
        self.key_status[key]["last_exhausted"] = datetime.now(timezone.utc).isoformat()
        self.save_status()
        self.rotate()

    def rotate(self):
        if not self.keys:
            return None
        self.current_index = (self.current_index + 1) % len(self.keys)
        new_key = self.get_active_key()
        return new_key

class OddsClient:
    def __init__(self):
        self.manager = KeyRotationManager()
        self.cache = self.load_cache()
        self.events_cache = {}
        self._events_index = []
        self.calls_this_session = 0

    def load_cache(self):
        if os.path.exists(CACHE_PATH):
            try:
                with open(CACHE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def save_cache(self):
        try:
            with open(CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[ODDS] Error guardando cache: {e}")

    def clean_cache(self):
        now = time.time()
        ttl_seconds = self.manager.cache_ttl_minutes * 60
        expired = []
        for key, item in self.cache.items():
            if now - item.get("timestamp", 0) > ttl_seconds:
                expired.append(key)
        for k in expired:
            del self.cache[k]
        if expired:
            self.save_cache()

    def _normalize(self, name):
        if not name:
            return ""
        n = unicodedata.normalize('NFD', str(name))
        n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
        n = n.lower().replace(".", "").replace("-", " ").replace("fc", "").replace("cf", "").replace("cd", "").replace("ca", "").strip()
        return " ".join(n.split())

    def preload_all_events(self):
        """Descarga e indexa eventos de una sola vez."""
        if self._events_index:
            return
        
        all_events = []
        for sport in ["football", "basketball", "tennis"]:
            evs = self.fetch_pending_events(sport=sport)
            all_events.extend(evs)

        self._events_index = []
        for ev in all_events:
            self._events_index.append({
                "id": ev.get("id"),
                "norm_home": self._normalize(ev.get("home", "")),
                "norm_away": self._normalize(ev.get("away", "")),
                "league": ev.get("league", {}).get("name", "").lower(),
                "raw": ev
            })
        print(f"[ODDS] [INDEX] {len(self._events_index)} eventos indexados en memoria.")

    def fetch_pending_events(self, sport="football"):
        """Descarga eventos pendientes con cache de 60 min."""
        now = time.time()
        cache_key = f"events_{sport}"
        if cache_key in self.events_cache:
            entry = self.events_cache[cache_key]
            if now - entry.get("timestamp", 0) < (60 * 60):
                return entry.get("data", [])

        active_key = self.manager.get_active_key()
        if not active_key:
            return []

        attempts = len(self.manager.keys)
        for _ in range(attempts):
            active_key = self.manager.get_active_key()
            if not active_key:
                break

            url = f"https://api.odds-api.io/v3/events?apiKey={active_key}&sport={sport}&status=pending"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "AntigravityBetBot/2.0"})
                with urllib.request.urlopen(req, timeout=12) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    self.manager.record_usage(active_key, is_success=True)
                    print(f"[ODDS API] [ONLINE] Eventos recibidos ({sport}): {len(data)} partidos disponibles.")
                    self.events_cache[cache_key] = {"timestamp": now, "data": data}
                    return data
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    self.manager.mark_rate_limited(active_key, cooldown_seconds=60)
                elif e.code == 401:
                    self.manager.mark_exhausted(active_key)
                else:
                    break
            except Exception as e:
                break

        return []

    def fetch_odds_for_event(self, event_id):
        """Consulta cuotas detalladas para un eventId especifico con proteccion de presupuesto."""
        self.clean_cache()
        cache_key = f"event_odds_{event_id}"
        
        # 1. Si ya esta en cache y no ha expirado (2 horas), devolver inmediatamente
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if time.time() - entry.get("timestamp", 0) < (self.manager.cache_ttl_minutes * 60):
                return entry.get("data")

        # 2. Control de presupuesto de llamadas por ejecucion
        if self.calls_this_session >= self.manager.max_fetch_per_run:
            return None

        attempts = len(self.manager.keys)
        for _ in range(attempts):
            active_key = self.manager.get_active_key()
            if not active_key:
                break

            url = f"https://api.odds-api.io/v3/odds?apiKey={active_key}&eventId={event_id}&bookmakers={self.manager.preferred_bookmakers}"
            try:
                time.sleep(0.10)  # Pacing seguro
                req = urllib.request.Request(url, headers={"User-Agent": "AntigravityBetBot/2.0"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    self.manager.record_usage(active_key, is_success=True)
                    self.calls_this_session += 1
                    self.cache[cache_key] = {"timestamp": time.time(), "data": data}
                    self.save_cache()
                    return data
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    self.manager.mark_rate_limited(active_key, cooldown_seconds=60)
                elif e.code == 401:
                    self.manager.mark_exhausted(active_key)
                else:
                    break
            except Exception as e:
                break

        return None

    def get_real_odds_for_match(self, home_team, away_team, league_name=None):
        """Busca cuotas reales priorizando ligas destacadas y respetando el presupuesto."""
        if not self._events_index:
            self.preload_all_events()

        norm_home = self._normalize(home_team)
        norm_away = self._normalize(away_team)

        if not norm_home or not norm_away:
            return None

        # Priorizar si es liga principal o match relevante
        for ev in self._events_index:
            e_home = ev["norm_home"]
            e_away = ev["norm_away"]

            match_h = (norm_home in e_home or e_home in norm_home) if norm_home and e_home else False
            match_a = (norm_away in e_away or e_away in norm_away) if norm_away and e_away else False

            if match_h and match_a:
                event_id = ev["id"]
                raw_odds = self.fetch_odds_for_event(event_id)
                if raw_odds:
                    extracted = self._parse_bookmaker_odds(raw_odds, ev["raw"])
                    if extracted:
                        return extracted

        return None

    def _parse_bookmaker_odds(self, data, event_meta):
        bookmakers = data.get("bookmakers", {})
        if not bookmakers:
            return None

        selected_bm_name = "1xbet" if "1xbet" in bookmakers else ("Bet365" if "Bet365" in bookmakers else (list(bookmakers.keys())[0] if bookmakers else None))
        if not selected_bm_name:
            return None

        markets_list = bookmakers.get(selected_bm_name, [])
        result = {
            "bookmaker": selected_bm_name,
            "source": f"Odds-API.io ({selected_bm_name})",
            "event_name": f"{event_meta.get('home')} vs {event_meta.get('away')}",
            "date": event_meta.get("date")
        }

        for m in markets_list:
            m_name = m.get("name", "").lower()
            odds_entries = m.get("odds", [])
            if not odds_entries:
                continue
            entry = odds_entries[0]

            if m_name in ["ml", "1x2", "moneyline"]:
                if "home" in entry: result["home_win"] = float(entry["home"]); result["h2h_home"] = float(entry["home"])
                if "draw" in entry: result["draw"] = float(entry["draw"]); result["h2h_draw"] = float(entry["draw"])
                if "away" in entry: result["away_win"] = float(entry["away"]); result["h2h_away"] = float(entry["away"])

            elif "double chance" in m_name:
                if "1X" in entry: result["dc_1x"] = float(entry["1X"])
                if "X2" in entry: result["dc_x2"] = float(entry["X2"])
                if "12" in entry: result["dc_12"] = float(entry["12"])

            elif "both teams to score" in m_name or "btts" in m_name:
                if "yes" in entry: result["btts_yes"] = float(entry["yes"])
                if "no" in entry: result["btts_no"] = float(entry["no"])

            elif "total" in m_name or "over/under" in m_name:
                for line_entry in odds_entries:
                    total_line = line_entry.get("line") or line_entry.get("total") or 2.5
                    try:
                        total_float = float(total_line)
                        if total_float == 2.5:
                            if "over" in line_entry: result["over_2.5"] = float(line_entry["over"])
                            if "under" in line_entry: result["under_2.5"] = float(line_entry["under"])
                        elif total_float == 1.5:
                            if "over" in line_entry: result["over_1.5"] = float(line_entry["over"])
                            if "under" in line_entry: result["under_1.5"] = float(line_entry["under"])
                        elif total_float == 3.5:
                            if "over" in line_entry: result["over_3.5"] = float(line_entry["over"])
                            if "under" in line_entry: result["under_3.5"] = float(line_entry["under"])
                    except Exception:
                        pass

        h_odd = result.get("h2h_home")
        d_odd = result.get("h2h_draw")
        a_odd = result.get("h2h_away")
        if h_odd and d_odd and a_odd:
            if "dc_1x" not in result:
                result["dc_1x"] = round((h_odd * d_odd) / (h_odd + d_odd), 2)
            if "dc_x2" not in result:
                result["dc_x2"] = round((a_odd * d_odd) / (a_odd + d_odd), 2)
            if "dnb_home" not in result:
                result["dnb_home"] = round(h_odd * (1.0 - (1.0 / d_odd)), 2)
            if "dnb_away" not in result:
                result["dnb_away"] = round(a_odd * (1.0 - (1.0 / d_odd)), 2)

        return result

# Instancia singleton
odds_client = OddsClient()
