import urllib.request, json

KEY = '772f454b27430654047db726a5bdb0046da8ab9e4dbf80ba19692483aec2aaae'
url = f'https://api.odds-api.io/v3/events?apiKey={KEY}&sport=tennis&status=pending'

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'test'})
    resp = urllib.request.urlopen(req, timeout=12)
    events = json.loads(resp.read().decode())
    
    leagues = set([ev.get('league', {}).get('name', 'Unknown') for ev in events])
    print(f"Torneos de tenis activos ahora mismo: {leagues}")
except Exception as e:
    print(f"Error: {e}")
