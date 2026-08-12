import urllib.request, json

url = 'https://sportintel-alpha.vercel.app/data.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read().decode('utf-8'))

htr = data.get('historical_tickets_registry', [])
print(f'=== VERCEL LIVE DATA === Total tickets: {len(htr)}')
for t in htr:
    date = t.get('date', '?')
    name = t.get('name', '?')
    sels = len(t.get('selections', []))
    odd = t.get('total_odd', 0)
    status = t.get('status', '?')
    print(f'  {date} | {name} | sels:{sels} | @{odd} | {status}')
