import urllib.request, json
from datetime import datetime, timezone

KEY = '772f454b27430654047db726a5bdb0046da8ab9e4dbf80ba19692483aec2aaae'
url = f'https://api.odds-api.io/v3/events?apiKey={KEY}&sport=football&status=pending'

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'test'})
    resp = urllib.request.urlopen(req, timeout=12)
    events = json.loads(resp.read().decode())
    
    print("=== HORARIOS DE LOS EVENTOS DE LA FASE 1 ===")
    
    for ev in events:
        home = ev.get('home', '').lower()
        away = ev.get('away', '').lower()
        
        if 'real madrid' in home and 'malaga' in away:
            print(f"Real Madrid vs Malaga: {ev['date']}")
        if 'telstar' in home and 'ajax' in away:
            print(f"Telstar vs Ajax: {ev['date']}")
        if 'samsunspor' in home and 'fenerbahce' in away:
            print(f"Samsunspor vs Fenerbahce: {ev['date']}")

except Exception as e:
    print('Error:', e)
