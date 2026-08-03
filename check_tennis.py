import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
for m in data.get('matches', []):
    if m.get('sport') == 'Tennis':
        print(f"Match: {m['home']} vs {m['away']}")
        for p in m.get('picks', []):
            print(f"  - Pick: {p['selection']} (Odd: {p['odd']}, Prob: {p['probability']}%, valid_for_ticket: {p.get('valid_for_ticket')})")
        break
