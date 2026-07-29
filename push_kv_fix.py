import json, urllib.request

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

kv_url = "https://glowing-husky-167195.upstash.io"
kv_token = "AaE7AAIncDFiNTZhOTlhNTMyM2I0YzI2YjQ0OTRhY2Y0ZDhjMzFmM3AxMTY3MTk1"

# Upstash REST API set key endpoint expects POST with raw JSON
req = urllib.request.Request(
    f"{kv_url}/set/sportintel_data",
    data=json.dumps(json.dumps(data, ensure_ascii=False)).encode('utf-8'),
    headers={'Authorization': f'Bearer {kv_token}', 'Content-Type': 'application/json'},
    method='POST'
)

with urllib.request.urlopen(req, timeout=10) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("Upstash Push Result:", res)
