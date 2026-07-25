import os
import urllib.request
import json
from datetime import datetime, timedelta

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "0fc0ba8109mshc0a96d4fddda16ep197aeajsncc7e2400156e")
HEADERS = {
    'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY
}

def load_cache():
    cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "event_cache.json")
    if os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_cache(cache):
    cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "event_cache.json")
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def fetch_live_matches():
    """Busca partidos usando SportAPI7 y la Memoria Caché para Fútbol, Basket y Tenis."""
    fetched_matches = []
    
    ALLOWED_LEAGUES = [
        "Premier League", "LaLiga", "Serie A", "Bundesliga", "Ligue 1", 
        "UEFA Champions League", "UEFA Europa League", "Copa America", 
        "Eurocopa", "World Cup", "Liga Profesional de Fútbol", 
        "Brasileirão", "Major League Soccer", "Liga MX",
        "Copa Libertadores", "Copa Sudamericana", "Primera A",
        "Liga 1", "Primera División", "Liga Pro", "LigaPro", "Copa Ecuador",
        "Copa do Brasil", "Copa Colombia", "Copa Argentina", "Copa Chile",
        "NBA", "WNBA", "NCAA", "Euroleague", "Liga Basquet", "Liga Nacional de Baloncesto", "Baloncesto",
        "ATP", "WTA", "US Open", "Wimbledon", "Roland Garros", "Australian Open"
    ]
    
    today = datetime.now().strftime("%Y-%m-%d")
    cache = load_cache()
    new_events_found = 0
    
    sports_to_fetch = ["football", "basketball", "tennis"]
    
    for api_sport in sports_to_fetch:
        odds_url = f"https://sportapi7.p.rapidapi.com/api/v1/sport/{api_sport}/odds/1/{today}"
        print(f"[INFO] Fetching cuotas de {api_sport} de SportAPI7 para {today}...")
        req = urllib.request.Request(odds_url, headers=HEADERS)
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode('utf-8'))
                odds_dict = data.get("odds", {})
                print(f"[INFO] {api_sport}: Encontrados {len(odds_dict)} eventos con cuotas.")
        except Exception as e:
            print(f"[Error] Falló la petición de cuotas para {api_sport}: {e}")
            continue

        for eid, odd_data in odds_dict.items():
            if eid in cache:
                event_info = cache[eid]
            else:
                event_url = f"https://sportapi7.p.rapidapi.com/api/v1/event/{eid}"
                ereq = urllib.request.Request(event_url, headers=HEADERS)
                try:
                    with urllib.request.urlopen(ereq, timeout=10) as eresponse:
                        edata = json.loads(eresponse.read().decode('utf-8'))
                        e_obj = edata.get("event", {})
                        
                        home = e_obj.get("homeTeam", {}).get("name")
                        away = e_obj.get("awayTeam", {}).get("name")
                        league = e_obj.get("tournament", {}).get("name", "Unknown")
                        status = e_obj.get("status", {}).get("type", "notstarted")
                        
                        start_ts = e_obj.get("startTimestamp")
                        if start_ts:
                            dt = datetime.fromtimestamp(start_ts)
                            time_display = dt.strftime("%H:%M")
                        else:
                            time_display = "19:00"
                        
                        if home and away:
                            event_info = {
                                "homeTeam": home,
                                "awayTeam": away,
                                "league": league,
                                "time": time_display,
                                "status": status,
                                "sport": api_sport.capitalize()
                            }
                            cache[eid] = event_info
                            new_events_found += 1
                        else:
                            continue
                except Exception as e:
                    continue

            is_allowed = False
            # Allow all tennis matches if they are ATP or WTA or if user wants all of them.
            # Usually tennis has hundreds of matches, so we filter by ATP/WTA.
            if event_info["sport"] == "Tennis":
                if "ATP" in event_info["league"] or "WTA" in event_info["league"] or "Open" in event_info["league"]:
                    is_allowed = True
            else:
                for al in ALLOWED_LEAGUES:
                    if al.lower() in event_info["league"].lower():
                        is_allowed = True
                        break
                    
            if not is_allowed:
                continue
                
            real_odds = {}
            choices = odd_data.get("choices", [])
            for choice in choices:
                name = choice.get("name")
                frac = choice.get("fractionalValue")
                if not frac:
                    continue
                try:
                    num, den = str(frac).split("/")
                    decimal_odd = round((float(num) / float(den)) + 1.0, 2)
                    if name == "1": real_odds['h2h_home'] = decimal_odd
                    elif name == "X": real_odds['h2h_draw'] = decimal_odd
                    elif name == "2": real_odds['h2h_away'] = decimal_odd
                except:
                    pass

            api_status = event_info.get("status", "notstarted")
            if api_status == "inprogress": st = "in"
            elif api_status == "finished": st = "post"
            else: st = "pre"
            
            h_col, h_acc, a_col, a_acc = "#1F2937", "#3B82F6", "#1F2937", "#EF4444"
            if event_info["sport"] == "Tennis":
                h_col, h_acc, a_col, a_acc = "#84CC16", "#A3E635", "#10B981", "#34D399"
            elif event_info["sport"] == "Basketball":
                h_col, h_acc, a_col, a_acc = "#F59E0B", "#FCD34D", "#8B5CF6", "#C4B5FD"

            fetched_matches.append({
                "home": event_info["homeTeam"],
                "away": event_info["awayTeam"],
                "home_color": h_col,
                "home_accent": h_acc,
                "away_color": a_col,
                "away_accent": a_acc,
                "league": event_info["league"],
                "sport": event_info["sport"],
                "time": event_info["time"],
                "stadium": "Cancha Principal",
                "status": st,
                "home_score": 0 if st == "pre" else None,
                "away_score": 0 if st == "pre" else None,
                "is_cup": False,
                "home_form_raw": "",
                "away_form_raw": "",
                "real_odds": real_odds
            })

    if new_events_found > 0:
        save_cache(cache)
        
    return fetched_matches
