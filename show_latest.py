import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Show ALL matches sorted by time descending - see the latest ones
matches = d.get('matches', [])
def safe_time(m):
    t = m.get('time','00:00')
    try:
        h, mi = t.split(':')
        return int(h)*60 + int(mi)
    except:
        return 0

matches_sorted = sorted(matches, key=safe_time, reverse=True)
print(f"Total matches: {len(matches_sorted)}")
print("\nLast 25 by time (latest games):")
for m in matches_sorted[:25]:
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time','?')
    try:
        h = int(t.split(':')[0])
        ec = h - 5
        if ec < 0: ec += 24
        ec_str = f"{ec}:{t.split(':')[1]}"
    except:
        ec_str = '?'
    best = max(m.get('picks',[]), key=lambda p: p.get('probability',0), default={})
    print(f"  {t} UTC ({ec_str} EC) | {key} | best: {best.get('market',''[:30])} @{best.get('odd','?')} {best.get('probability','?')}% valid:{best.get('valid_for_ticket','?')}")
