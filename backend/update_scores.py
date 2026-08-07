import json
import urllib.request
import unicodedata
import os
import re
from datetime import datetime, timezone, timedelta

def normalize_name(name):
    if not name: return ""
    name = unicodedata.normalize('NFKD', str(name)).encode('ASCII', 'ignore').decode('utf-8')
    name = name.lower()
    words_to_remove = ["fc", "cd", "ca", "cf", "club", "atletico", "deportivo", "sporting", "real", "city", "united", "town", "bc", "w"]
    for w in words_to_remove:
        name = re.sub(rf'\b{w}\b', '', name)
    return re.sub(r'[^a-z0-9]', '', name).strip()

def evaluate_pick(market, selection, home_score, away_score, home_team, away_team, sport="Football"):
    if home_score is None or away_score is None:
        return "pending"
    
    try:
        hs = int(home_score)
        aws = int(away_score)
    except Exception:
        return "pending"

    mkt = str(market).lower()
    sel = str(selection).lower()
    h_norm = normalize_name(home_team)
    a_norm = normalize_name(away_team)
    
    # Regla Especial Tenis (hs y as son sets ganados, ej. 2-0 o 2-1)
    if sport == "Tennis" or "sets" in mkt or "hándicap de sets" in mkt or "hándicap de juegos" in mkt:
        total_sets = hs + aws
        est_total_games = 27 if total_sets >= 3 else (19 if total_sets == 2 else hs + aws)
        winner_is_home = hs > aws
        winner_is_away = aws > hs
        
        if "sets" in mkt or "set" in mkt:
            if "menos de 2.5" in sel:
                return "won" if total_sets < 2.5 else "lost"
            if "más de 2.5" in sel:
                return "won" if total_sets > 2.5 else "lost"
            if "-1.5" in sel or "2-0" in sel or "gana 2-0" in sel:
                if (winner_is_home and hs == 2 and aws == 0 and h_norm in sel) or (winner_is_away and aws == 2 and hs == 0 and a_norm in sel):
                    return "won"
                return "lost"
            if "+1.5" in sel:
                if (h_norm in sel and hs >= 1) or (a_norm in sel and aws >= 1):
                    return "won"
                return "lost"

        if "juegos" in mkt or "hándicap" in mkt:
            if "más de 12.5" in sel or "over 12.5" in sel: return "won" if est_total_games > 12.5 else "lost"
            if "más de 8.5" in sel or "más de 9.5" in sel or "más de 10.5" in sel: return "won" if est_total_games > 8.5 else "lost"
            if "+1.5" in sel or "+2.5" in sel or "+3.5" in sel: return "won"
            if "-1.5" in sel or "-2.5" in sel or "-3.5" in sel: return "won" if (winner_is_home and h_norm in sel) or (winner_is_away and a_norm in sel) else "lost"

        if "ganador" in mkt or "moneyline" in mkt or "1er set" in mkt:
            if h_norm in sel or sel == "1" or "local" in sel: return "won" if hs > aws else "lost"
            if a_norm in sel or sel == "2" or "visitante" in sel: return "won" if aws > hs else "lost"
        
        return "won" if (winner_is_home and h_norm in sel) or (winner_is_away and a_norm in sel) else "lost"

    
    # 1. Doble Oportunidad
    if "doble oportunidad" in mkt or " o empate" in sel or "1x" in sel or "x2" in sel or "12" in sel:
        if "1x" in sel or "local o empate" in sel or (h_norm in sel and "empate" in sel) or (sel.startswith("1") and "x" in sel):
            return "won" if hs >= aws else "lost"
        if "x2" in sel or "visitante o empate" in sel or (a_norm in sel and "empate" in sel) or (sel.startswith("x") and "2" in sel):
            return "won" if aws >= hs else "lost"
        if "12" in sel or "local o visitante" in sel:
            return "won" if hs != aws else "lost"
        if h_norm in sel and "empate" in sel: return "won" if hs >= aws else "lost"
        if a_norm in sel and "empate" in sel: return "won" if aws >= hs else "lost"

    # 2. Goles / Puntos / Totales
    if "goles" in mkt or "total" in mkt or "juegos" in mkt or "puntos" in mkt:
        tot = hs + aws
        if "más de 2.5" in sel or "over 2.5" in sel: return "won" if tot > 2.5 else "lost"
        if "menos de 2.5" in sel or "under 2.5" in sel: return "won" if tot < 2.5 else "lost"
        if "más de 1.5" in sel or "over 1.5" in sel: return "won" if tot > 1.5 else "lost"
        if "menos de 1.5" in sel or "under 1.5" in sel: return "won" if tot < 1.5 else "lost"
        if "más de 3.5" in sel or "over 3.5" in sel: return "won" if tot > 3.5 else "lost"
        if "menos de 3.5" in sel or "under 3.5" in sel: return "won" if tot < 3.5 else "lost"
        if "más de 0.5" in sel or "over 0.5" in sel: return "won" if tot > 0.5 else "lost"
        if "menos de 0.5" in sel or "under 0.5" in sel: return "won" if tot < 0.5 else "lost"

    # 3. Both Teams to Score (BTTS)
    if "ambos equipos anotan" in mkt or "ambos anotan" in mkt or "btts" in mkt:
        if "sí" in sel or "si" in sel or "yes" in sel: return "won" if hs > 0 and aws > 0 else "lost"
        if "no" in sel: return "won" if hs == 0 or aws == 0 else "lost"

    # 4. Draw No Bet (Empate No Apuesta)
    if "empate no apuesta" in mkt or "dnb" in mkt:
        if hs == aws: return "void"
        if h_norm in sel or sel == "1" or "local" in sel: return "won" if hs > aws else "lost"
        if a_norm in sel or sel == "2" or "visitante" in sel: return "won" if aws > hs else "lost"

    # 5. Resultado Final (1X2 / Moneyline)
    if "resultado final" in mkt or "1x2" in mkt or "ganador" in mkt:
        if sel == "1" or h_norm in sel or "local" in sel: return "won" if hs > aws else "lost"
        if sel == "2" or a_norm in sel or "visitante" in sel: return "won" if aws > hs else "lost"
        if sel == "x" or "empate" in sel: return "won" if hs == aws else "lost"

    return "pending"

def get_espn_events(sport_endpoint):
    url = f'https://site.api.espn.com/apis/site/v2/sports/{sport_endpoint}/scoreboard?limit=1000'
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('events', [])
    except Exception as e:
        print(f"[!] Error fetching {sport_endpoint}: {e}")
        return []

def update_scores():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'data.json')
    if not os.path.exists(data_path):
        print(f"[!] Archivo {data_path} no encontrado.")
        return

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    matches = data.get('matches', [])
    if not matches:
        print("[!] No hay partidos para actualizar.")
        return

    # Extraer todos los eventos de ESPN (Fútbol, Tenis, Basketball)
    espn_events = []
    for ep in ['soccer/all', 'tennis/atp', 'tennis/wta', 'basketball/wnba', 'basketball/nba', 'basketball/mens-college-basketball']:
        espn_events.extend(get_espn_events(ep))

    # Crear diccionario para búsqueda rápida
    live_dict = {}
    
    def process_comp(comps, status_desc):
        competitors = comps.get('competitors', [])
        if len(competitors) >= 2:
            t1, t2 = competitors[0], competitors[1]
            if t1.get('homeAway') == 'away':
                away = t1; home = t2
            else:
                home = t1; away = t2
                
            home_name = home.get('team', {}).get('name') or home.get('team', {}).get('displayName') or home.get('athlete', {}).get('displayName', '')
            away_name = away.get('team', {}).get('name') or away.get('team', {}).get('displayName') or away.get('athlete', {}).get('displayName', '')
            
            def extract_espn_score(comp):
                if not comp: return 0
                sc = comp.get('score')
                if sc is not None and str(sc).isdigit():
                    return int(sc)
                lines = comp.get('linescores', [])
                if lines:
                    sets_won = sum(1 for l in lines if l.get('winner') is True)
                    if sets_won > 0: return sets_won
                    total_val = sum(int(l.get('value', 0)) for l in lines if l.get('value') and str(l.get('value')).isdigit())
                    if total_val > 0: return total_val
                if comp.get('winner') is True:
                    return 2
                return 0

            home_score = extract_espn_score(home)
            away_score = extract_espn_score(away)

            norm_home = normalize_name(home_name)
            norm_away = normalize_name(away_name)
            
            if norm_home and norm_away:
                live_dict[f"{norm_home}-{norm_away}"] = {
                    'status_desc': status_desc,
                    'home_score': home_score,
                    'away_score': away_score
                }
                live_dict[f"{norm_away}-{norm_home}"] = {
                    'status_desc': status_desc,
                    'home_score': away_score,
                    'away_score': home_score
                }

    for ev in espn_events:
        try:
            status_desc = ev.get('status', {}).get('type', {}).get('description', '')
            for comps in ev.get('competitions', []):
                process_comp(comps, status_desc)
            for gr in ev.get('groupings', []):
                for comps in gr.get('competitions', []):
                    process_comp(comps, status_desc)
        except Exception:
            continue

    updates = 0
    now_utc = datetime.now(timezone.utc) - timedelta(hours=5)
    current_mins = now_utc.hour * 60 + now_utc.minute

    for m in matches:
        home_team = m.get('home') or m.get('home_team_name') or m.get('home_team') or ''
        away_team = m.get('away') or m.get('away_team_name') or m.get('away_team') or ''
        
        m_home = normalize_name(home_team)
        m_away = normalize_name(away_team)
        
        key = f"{m_home}-{m_away}"
        live_found = live_dict.get(key)
        
        if live_found:
            desc = live_found['status_desc'].lower()
            if 'scheduled' in desc or 'pre' in desc:
                new_status = 'pre'
            elif 'progress' in desc or 'half' in desc or 'live' in desc:
                new_status = 'in'
            elif 'full' in desc or 'final' in desc:
                new_status = 'post'
            elif 'postponed' in desc:
                new_status = 'postponed'
            elif 'cancel' in desc:
                new_status = 'canceled'
            else:
                new_status = 'in'

            m['status'] = new_status
            m['home_score'] = live_found['home_score']
            m['away_score'] = live_found['away_score']
            updates += 1
            print(f"[+] Actualizado ESPN: {home_team} {live_found['home_score']} - {live_found['away_score']} {away_team} ({new_status})")
        else:
            # Check elapsed time fallback: if match started > 115 mins ago, mark post!
            if m.get('time') and ':' in str(m['time']):
                try:
                    parts = str(m['time']).split(':')
                    match_mins = int(parts[0]) * 60 + int(parts[1])
                    if current_mins >= match_mins + 115 and m.get('status') != 'post':
                        m['status'] = 'post'
                        updates += 1
                except Exception:
                    pass

        # Auto-grade all picks in this match
        hs = m.get('home_score')
        aws = m.get('away_score')
        m_status = m.get('status')
        
        if m_status == 'post' or hs is not None:
            for p in m.get('picks', []):
                p_stat = evaluate_pick(p.get('market', ''), p.get('selection', p.get('pick', '')), hs, aws, home_team, away_team)
                if p_stat != 'pending':
                    p['status'] = p_stat

    # Grade Star Tickets
    for st_key in ['star_ticket_1', 'star_ticket_2', 'star_ticket_3', 'star_ticket_4']:
        st = data.get(st_key)
        if isinstance(st, dict) and 'selections' in st:
            all_graded = True
            ticket_won = True
            for sel in st['selections']:
                found_match = None
                for m in matches:
                    if f"{m.get('home')} vs {m.get('away')}" == sel.get('match'):
                        found_match = m
                        break
                if found_match and found_match.get('status') == 'post':
                    res = evaluate_pick(sel.get('market', ''), sel.get('pick', ''), found_match.get('home_score'), found_match.get('away_score'), found_match.get('home'), found_match.get('away'))
                    if res == 'lost':
                        ticket_won = False
                    elif res == 'pending':
                        all_graded = False
                else:
                    all_graded = False
            
            if all_graded:
                st['status'] = 'won' if ticket_won else 'lost'
                status_str = "GANADO" if ticket_won else "FALLADO"
                print(f"[INFO] {st_key} autoevaluado: {status_str}")

    # Actualizar Base de Datos de Aprendizaje Autónomo Persistente
    try:
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        try:
            from backend.data_generator import update_learning_database
        except ImportError:
            from data_generator import update_learning_database
        db_stats = update_learning_database(matches)
        print(f"[INFO] Base de Aprendizaje Autónomo actualizada: {db_stats.get('total_graded_picks', 0)} picks acumulados, {db_stats.get('total_won', 0)} ganados, {db_stats.get('total_lost', 0)} perdidos.")
    except Exception as e:
        print(f"[!] Error al actualizar aprendizaje en update_scores: {e}")

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Proceso de actualización finalizado. Partidos procesados: {len(matches)}.")

if __name__ == '__main__':
    update_scores()
