import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print('Data date:', d.get('date'))
now_utc = datetime.now(timezone.utc)
now_f = now_utc.hour + now_utc.minute/60
print(f'Now UTC: {now_utc.strftime("%H:%M")} ({now_f:.2f}h)')
print()

targets = ['Crici', 'CSA vs', 'San Carlos', 'Orense', 'Cajamarca', 'Estudiantes']
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '?')
    if any(x in key for x in targets):
        try:
            h, mi = t.split(':')
            hour = int(h) + int(mi)/60
            ec_h = int(h) - 5
            if ec_h < 0: ec_h += 24
            status = 'FUTURO' if hour > now_f else 'YA JUGO'
            print(f'{status} | UTC {t} (EC {ec_h}:{mi}) | {key}')
        except:
            print(f'??? | {t} UTC | {key}')

print()
print('=== ALL future matches (UTC > now) ===')
future = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '?')
    try:
        h, mi = t.split(':')
        hour = int(h) + int(mi)/60
        if hour > now_f + 0.25:  # at least 15 min in the future
            ec_h = int(h) - 5
            if ec_h < 0: ec_h += 24
            best = max(m.get('picks',[]), key=lambda p: p.get('probability',0), default={})
            future.append((hour, t, key, ec_h, mi, best.get('probability',0), best.get('odd',0)))
    except:
        pass

future.sort()
print(f'Found {len(future)} future matches:')
for f2 in future[:15]:
    print(f"  UTC {f2[1]} (EC {f2[3]}:{f2[4]}) | {f2[2]} | best @{f2[6]} {f2[5]}%")
