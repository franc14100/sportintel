import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
matches = sorted(d.get('matches',[]), key=lambda m: m.get('time','99:99'))
print('Partidos con hora > 22:30 UTC:')
for m in matches:
    t = m.get('time','?')
    try:
        h,mi = t.split(':')
        if int(h) >= 22 and int(mi) >= 30 or int(h) >= 23:
            key = f"{m['home']} vs {m['away']}"
            best = max(m.get('picks',[]), key=lambda p: p.get('probability',0), default={})
            prob = best.get('probability','?')
            odd = best.get('odd','?')
            mkt = best.get('market','')
            print(f"  {t} | {key} | {mkt} @{odd} {prob}%")
    except:
        pass
