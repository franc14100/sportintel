import json, urllib.request, os

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Local matches to push: {len(data.get('matches', []))}")
print("Football:", len([m for m in data.get('matches', []) if str(m.get('sport')).lower() == 'football']))
print("Tennis:", len([m for m in data.get('matches', []) if str(m.get('sport')).lower() == 'tennis']))

kv_url = "https://glowing-husky-167195.upstash.io"
kv_token = "AaE7AAIncDFiNTZhOTlhNTMyM2I0YzI2YjQ0OTRhY2Y0ZDhjMzFmM3AxMTY3MTk1"

base_url = kv_url.rstrip('/')
request_url = f"{base_url}/set/sportintel_data"

json_data = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
req = urllib.request.Request(request_url, data=json_data.encode('utf-8'), headers={'Authorization': f'Bearer {kv_token}', 'Content-Type': 'application/json'}, method='POST')

with urllib.request.urlopen(req, timeout=10) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("Push to Upstash Redis response:", res)
