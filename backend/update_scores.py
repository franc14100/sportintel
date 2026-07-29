import json
import urllib.request
import unicodedata
import os
import re

def normalize_name(name):
    if not name: return ""
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    name = name.lower()
    # Eliminar palabras comunes para mejorar el match
    words_to_remove = ["fc", "cd", "ca", "cf", "club", "atletico", "deportivo", "sporting", "real", "city", "united"]
    for w in words_to_remove:
        name = re.sub(rf'\b{w}\b', '', name)
    return re.sub(r'[^a-z0-9]', '', name).strip()

def get_espn_data(sport_endpoint):
    url = f'https://site.api.espn.com/apis/site/v2/sports/{sport_endpoint}/scoreboard'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
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

    # Extraer todos los eventos de ESPN
    espn_events = []
    espn_events.extend(get_espn_data('soccer/all'))
    espn_events.extend(get_espn_data('tennis/atp'))
    espn_events.extend(get_espn_data('tennis/wta'))

    # Crear diccionario para busqueda rpida
    live_dict = {}
    for ev in espn_events:
        try:
            status_desc = ev['status']['type']['description']
            comps = ev['competitions'][0]['competitors']
            t1 = comps[0]
            t2 = comps[1]
            
            # Determinar home y away en ESPN (generalmente t1 es Home, pero verificamos homeAway si existe)
            if t1.get('homeAway') == 'away':
                away = t1; home = t2
            else:
                home = t1; away = t2
                
            home_name = home['team']['name'] if 'team' in home else home.get('athlete', {}).get('displayName', '')
            away_name = away['team']['name'] if 'team' in away else away.get('athlete', {}).get('displayName', '')
            
            home_score = int(home.get('score', 0) or 0)
            away_score = int(away.get('score', 0) or 0)
            
            norm_home = normalize_name(home_name)
            norm_away = normalize_name(away_name)
            
            live_dict[f"{norm_home}-{norm_away}"] = {
                'status_desc': status_desc,
                'home_score': home_score,
                'away_score': away_score
            }
            # Tambin guardar la versin inversa por si acaso
            live_dict[f"{norm_away}-{norm_home}"] = {
                'status_desc': status_desc,
                'home_score': away_score,
                'away_score': home_score
            }
        except Exception as e:
            continue

    updates = 0
    for m in matches:
        m_home = normalize_name(m.get('home_team_name', m.get('home_team', '')))
        m_away = normalize_name(m.get('away_team_name', m.get('away_team', '')))
        
        key = f"{m_home}-{m_away}"
        if key in live_dict:
            live = live_dict[key]
            
            # Convertir status de ESPN a nuestro status
            desc = live['status_desc'].lower()
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
            m['home_score'] = live['home_score']
            m['away_score'] = live['away_score']
            updates += 1
            print(f"[+] Actualizado: {m.get('home_team_name', '')} {live['home_score']} - {live['away_score']} {m.get('away_team_name', '')} ({new_status})")

    if updates > 0:
        with open(data_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[INFO] Se actualizaron {updates} partidos exitosamente.")
    else:
        print("[INFO] No se encontraron coincidencias para actualizar marcadores.")

if __name__ == '__main__':
    update_scores()
