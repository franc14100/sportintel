import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Find ALL picks with any valid_for_ticket and show times > 22:00
print("All picks after 22:00 UTC with prob >= 60:")
found = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '?')
    try:
        h, mi = t.split(':')
        hour = int(h) + int(mi)/60
        if hour >= 22.0:
            for p in m.get('picks', []):
                if p.get('probability', 0) >= 60:
                    found.append((t, key, p.get('market',''), p.get('selection',''), p.get('odd',0), p.get('probability',0), p.get('valid_for_ticket',False)))
                    break
    except:
        pass

found.sort(key=lambda x: x[0])
for f in found:
    print(f"  {f[0]} | {f[1]} | {f[2]} | {f[3]} @{f[4]} {f[5]}% valid:{f[6]}")
print(f"\nTotal: {len(found)}")
