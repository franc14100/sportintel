import json
import urllib.request
import time

api_url = 'https://sportintel-alpha.vercel.app/api/sync'

kauno = {
    "id": 1785337966792,
    "match": "FK Kauno \u017dalgiris vs Klaksv\u00edkar \u00cdtr\u00f3ttarfelag + Mirassol vs Remo",
    "market": "Doble Oportunidad: FK Kauno \u017dalgiris o Empate / C\u00f3rners del Equipo (Individual): Mirassol M\u00e1s de 4.5 C\u00f3rners",
    "odd": 1.503,
    "stake": 4.00,
    "status": "pending",
    "date": "2026-07-29"
}

gornik = {
    "id": 1785338354949,
    "match": "G\u00f3rnik Zabrze vs Fenerbah\u00e7e + Arsenal de Sarand\u00ed Reserve vs Villa Dalmine Reserve",
    "market": "C\u00f3rners del Equipo (Individual): Fenerbah\u00e7e M\u00e1s de 4.5 C\u00f3rners / C\u00f3rners del Equipo (Individual): Arsenal de Sarand\u00ed Reserve M\u00e1s de 4.5 C\u00f3rners",
    "odd": 1.786,
    "stake": 4.00,
    "status": "won",
    "date": "2026-07-29"
}

get_req = urllib.request.Request(api_url, headers={'Content-Type': 'application/json'}, method='GET')
with urllib.request.urlopen(get_req) as resp:
    currentData = json.loads(resp.read().decode('utf-8'))

if 'ub' not in currentData or not isinstance(currentData['ub'], list):
    currentData['ub'] = []

clean_ub = [b for b in currentData['ub'] if b and isinstance(b, dict) and not (
    'Kauno' in str(b.get('match', '')) or 
    'Gornik' in str(b.get('match', '')) or 
    'Górnik' in str(b.get('match', '')) or
    'G\u00f3rnik' in str(b.get('match', '')) or
    'Grnik' in str(b.get('match', ''))
)]
clean_ub.append(kauno)
clean_ub.append(gornik)

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

# Step 2: Wipe
print("Wiping array...")
s2 = dict(currentData)
s2['ts'] = 9999999999990
s2['ub'] = None
s2['force_override'] = True
post_sync(s2)
time.sleep(1)

# Step 3: Write clean
print("Writing clean...")
s3 = dict(currentData)
s3['ts'] = 9999999999999
s3['ub'] = clean_ub
s3['force_override'] = True
post_sync(s3)
time.sleep(1)

print("Done.")
