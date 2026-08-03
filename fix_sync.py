import json, urllib.request

url = 'https://sportintel-alpha.vercel.app/api/sync'

# Get current state
req_get = urllib.request.Request(url, method='GET')
with urllib.request.urlopen(req_get) as resp:
    state = json.loads(resp.read().decode('utf-8'))

# Set deleted: true for the problematic tickets
found = False
if 'ub' in state:
    for bet in state['ub']:
        if bet.get('id') in (1722265001001, 1722265001002):
            bet['deleted'] = True
            found = True

if found:
    print('Found and modified the tickets. Pushing back to sync API...')
    state['ts'] = 9999999999999 # force bypass cloudTs check
    json_data = json.dumps(state)
    req_post = urllib.request.Request(url, data=json_data.encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req_post) as set_resp:
        print('Post response:', set_resp.read().decode('utf-8'))
else:
    print('Tickets not found in cloud state!')
