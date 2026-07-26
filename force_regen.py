import json
import subprocess
import sys

# 1. Backup tickets 1 and 2 ONLY
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

backup1 = data.get('star_ticket_1')
backup2 = data.get('star_ticket_2')

print("Tickets 1 and 2 backed up.")
print("T1 matches:", [s['match'] for s in (backup1 or {}).get('selections', [])])
print("T2 matches:", [s['match'] for s in (backup2 or {}).get('selections', [])])

# 2. Remove star_ticket_3 and star_ticket_4 to force fresh generation
data.pop('star_ticket_3', None)
data.pop('star_ticket_4', None)

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Removed T3 and T4. Running generator...")

# 3. Run generator (will also lock T1 and T2 since they exist in the state)
result = subprocess.run(['python', 'backend/data_generator.py'], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print('ERROR:', result.stderr)
    sys.exit(1)

# 4. Restore T1 and T2 — just in case generator touched them
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

data['star_ticket_1'] = backup1
data['star_ticket_2'] = backup2

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 5. Verify - make sure no match appears in multiple tickets
print("\n=== VERIFICACIÓN ===")
all_keys = ['star_ticket_1', 'star_ticket_2', 'star_ticket_3', 'star_ticket_4']
seen = {}
ok = True
for k in all_keys:
    t = data.get(k)
    if not t:
        print(f"{k}: NOT FOUND")
        continue
    matches = [s['match'] for s in t.get('selections', [])]
    print(f"{k}: {matches}")
    for m in matches:
        if m in seen:
            print(f"  ⚠️  DUPLICATE: '{m}' also in {seen[m]}")
            ok = False
        seen[m] = k

if ok:
    print("\n✅ No hay partidos repetidos entre boletos!")
else:
    print("\n❌ Hay partidos repetidos!")
