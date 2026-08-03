import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
for suffix in ['3', '4']:
    t = data.get(f'star_ticket_{suffix}')
    if t:
        print(f"Ticket {suffix} has {len(t.get('selections', []))} selections")
        for s in t.get('selections', []):
            print(f"  - {s['match']} | {s['pick']}")
