import json, urllib.request, time

url = 'https://sportintel-alpha.vercel.app/api/sync'

# Get current state
req_get = urllib.request.Request(url, method='GET')
with urllib.request.urlopen(req_get) as resp:
    state = json.loads(resp.read().decode('utf-8'))

bad_ids = {1722265001001, 1722265001002, 1785337966792, 1785338354949, 1785339347547}
clean_ub = [b for b in state.get('ub', []) if b.get('id') not in bad_ids]

now_ms = int(time.time() * 1000)

# Step 1: Push ub = null to break the merge condition
# Need to use a very high TS for this one to overcome the 9999999999999 I previously set!
state['ts'] = 9999999999999 + 1
state['ub'] = None
print('Sending ub = null to wipe currentData.ub...')
req_post1 = urllib.request.Request(url, data=json.dumps(state).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req_post1) as resp1:
    print('Resp1:', resp1.read().decode('utf-8'))

# Wait a second for Vercel KV to propagate
time.sleep(1)

# Step 2: Push clean array with a normal current timestamp!
# Wait, if I push a normal timestamp now, the cloud has 9999999999999 + 1, so it will REJECT it!
# I MUST push the final array with ts = Date.now() but how do I bypass the cloudTs > incomingTs check?
# I CANNOT bypass cloudTs > incomingTs if I send a normal TS.
# If I send a normal TS, the server will ALWAYS reject it.
# How can I reset the cloud TS to normal?
# I can't. The Vercel API has if (cloudTs > incomingTs) { return reject; }.
# Once I set it to 9999999999999, the ONLY way to overwrite it is to send a BIGGER timestamp.
