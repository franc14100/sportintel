import urllib.request
import json
import os
from datetime import datetime

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "0fc0ba8109mshc0a96d4fddda16ep197aeajsncc7e2400156e")
HEADERS = {
    'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY
}

def load_cache():
    if os.path.exists('backend/event_cache.json'):
        with open('backend/event_cache.json', 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_cache(cache):
    with open('backend/event_cache.json', 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def test_fetch():
    today = datetime.now().strftime("%Y-%m-%d")
    cache = load_cache()
    
    odds_url = f"https://sportapi7.p.rapidapi.com/api/v1/sport/football/odds/1/{today}"
    print(f"Fetching odds from {odds_url}")
    req = urllib.request.Request(odds_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            odds_dict = data.get("odds", {})
            print(f"Found {len(odds_dict)} events with odds.")
    except Exception as e:
        print(f"Failed to fetch odds: {e}")
        return

    event_ids = list(odds_dict.keys())[:3]
    print(f"Testing with 3 event IDs: {event_ids}")
    
    for eid in event_ids:
        if eid in cache:
            print(f"Event {eid} is in cache! {cache[eid]['homeTeam']} vs {cache[eid]['awayTeam']}")
        else:
            print(f"Event {eid} not in cache. Fetching details...")
            event_url = f"https://sportapi7.p.rapidapi.com/api/v1/event/{eid}"
            ereq = urllib.request.Request(event_url, headers=HEADERS)
            try:
                with urllib.request.urlopen(ereq, timeout=10) as eresponse:
                    edata = json.loads(eresponse.read().decode('utf-8'))
                    event_info = edata.get("event", {})
                    
                    home = event_info.get("homeTeam", {}).get("name")
                    away = event_info.get("awayTeam", {}).get("name")
                    league = event_info.get("tournament", {}).get("name")
                    
                    if home and away:
                        cache[eid] = {
                            "homeTeam": home,
                            "awayTeam": away,
                            "league": league
                        }
                        print(f"Successfully cached {home} vs {away}")
                        save_cache(cache)
            except Exception as e:
                print(f"Failed to fetch event {eid}: {e}")

if __name__ == '__main__':
    test_fetch()
