import json
import urllib.request
import time

api_url = 'https://sportintel-alpha.vercel.app/api/sync'

get_req = urllib.request.Request(api_url, headers={'Content-Type': 'application/json'}, method='GET')
with urllib.request.urlopen(get_req) as resp:
    currentData = json.loads(resp.read().decode('utf-8'))

def post_sync(state_obj):
    req = urllib.request.Request(api_url, data=json.dumps(state_obj).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print("Error POSTing:", e)
        return None

# Step 1: Poison
print("Poisoning TS...")
s1 = dict(currentData)
s1['ts'] = 'invalid'
post_sync(s1)
time.sleep(1)

# Step 2: Bump TS massively to force all devices to pull and reload
print("Bumping TS...")
s2 = dict(currentData)
s2['ts'] = 99999999999999 # 14 nines
s2['force_override'] = True
post_sync(s2)

print("Done. Forced TS bump.")
