import json, urllib.request, time

url = 'https://sportintel-alpha.vercel.app/api/sync'

# Get current state
req_get = urllib.request.Request(url, method='GET')
with urllib.request.urlopen(req_get) as resp:
    currentData = json.loads(resp.read().decode('utf-8'))

# Clean array
bad_ids = {1722265001001, 1722265001002, 1785337966792, 1785338354949, 1785339347547}
clean_ub = [b for b in currentData.get('ub', []) if b.get('id') not in bad_ids]

print(f"Current tickets: {len(currentData.get('ub', []))}, Clean tickets: {len(clean_ub)}")

def post_sync(state_obj):
    req = urllib.request.Request(url, data=json.dumps(state_obj).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print("Error POSTing:", e)
        return None

# Step 1: Poison the cloud TS with 'NaN' so future checks fail
print("Step 1: Poisoning TS...")
poison_state = dict(currentData)
poison_state['ts'] = 'invalid'
res1 = post_sync(poison_state)
print("Res1:", res1)
time.sleep(1)

# Step 2: Now that cloudTs is NaN (which makes cloudTs > incomingTs evaluate to FALSE),
# we can send a normal TS but with ub = null to break the additive merge!
print("Step 2: Wiping the array...")
wipe_state = dict(currentData)
wipe_state['ts'] = int(time.time() * 1000)
wipe_state['ub'] = None
res2 = post_sync(wipe_state)
print("Res2:", res2)
time.sleep(1)

# Step 3: Now that cloud array is null, we can write the clean array!
print("Step 3: Writing clean array...")
final_state = dict(currentData)
final_state['ts'] = int(time.time() * 1000) + 1000
final_state['ub'] = clean_ub
res3 = post_sync(final_state)
print("Res3:", res3)
time.sleep(1)

print("Done. Verification:")
with urllib.request.urlopen(req_get) as resp:
    finalData = json.loads(resp.read().decode('utf-8'))
    print("Final TS:", finalData.get('ts'))
    print("Final tickets length:", len(finalData.get('ub', [])))
    print("Contains bad IDs?", any(b.get('id') in bad_ids for b in finalData.get('ub', [])))
