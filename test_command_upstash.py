import json, urllib.request

kv_url = "https://glowing-husky-167195.upstash.io"
kv_token = "AaE7AAIncDFiNTZhOTlhNTMyM2I0YzI2YjQ0OTRhY2Y0ZDhjMzFmM3AxMTY3MTk1"

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

payload_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
command = ["SET", "sportintel_data", payload_str]

req = urllib.request.Request(
    kv_url,
    data=json.dumps(command).encode('utf-8'),
    headers={'Authorization': f'Bearer {kv_token}', 'Content-Type': 'application/json'},
    method='POST'
)

with urllib.request.urlopen(req, timeout=10) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("Upstash Command Result:", res)
