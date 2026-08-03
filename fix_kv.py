import json, urllib.request

kv_url = 'https://glowing-husky-167195.upstash.io'
kv_token = 'AaE7AAIncDFiNTZhOTlhNTMyM2I0YzI2YjQ0OTRhY2Y0ZDhjMzFmM3AxMTY3MTk1'

get_req = urllib.request.Request(f'{kv_url}/get/sportintel_sync', headers={'Authorization': f'Bearer {kv_token}'})
with urllib.request.urlopen(get_req) as resp:
    data = json.loads(resp.read().decode('utf-8'))['result']
    state = json.loads(data) if isinstance(data, str) else data

original_len = len(state.get('ub', []))
state['ub'] = [b for b in state.get('ub', []) if b.get('id') not in (1722265001001, 1722265001002)]
print(f"Removed {original_len - len(state['ub'])} bets")

state['ts'] = 9999999999999
json_data = json.dumps(state, separators=(',', ':'))
set_req = urllib.request.Request(f'{kv_url}/set/sportintel_sync', data=json_data.encode('utf-8'), headers={'Authorization': f'Bearer {kv_token}', 'Content-Type': 'application/json'}, method='POST')

with urllib.request.urlopen(set_req) as set_resp:
    print('Set response:', set_resp.read().decode('utf-8'))
