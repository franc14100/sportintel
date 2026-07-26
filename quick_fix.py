import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Get currently valid matches (only future/today matches that exist in data)
valid_matches = {f"{m['home']} vs {m['away']}" for m in data.get('matches', [])}

# Current used matches from T1 and T2
used = set()
for k in ['star_ticket_1', 'star_ticket_2']:
    t = data.get(k, {})
    for s in t.get('selections', []):
        used.add(s['match'])

print("Used in T1+T2:", used)
print("T3 current:", [s['match'] for s in data.get('star_ticket_3', {}).get('selections', [])])
print("T4 current:", [s['match'] for s in data.get('star_ticket_4', {}).get('selections', [])])

# Filter T3 - remove any match not in valid_matches
t3 = data.get('star_ticket_3', {})
t3_sels = [s for s in t3.get('selections', []) if s['match'] in valid_matches and s['match'] not in used]
print("T3 after filter:", [s['match'] for s in t3_sels])

# Filter T4 - remove any match not in valid_matches AND not in used/T3
t3_matches = {s['match'] for s in t3_sels}
t4 = data.get('star_ticket_4', {})
t4_sels = [s for s in t4.get('selections', []) if s['match'] in valid_matches and s['match'] not in used and s['match'] not in t3_matches]
# Limit to 4 best picks
t4_sels = t4_sels[:4]
print("T4 after filter:", [s['match'] for s in t4_sels])

# Recalculate odds
def recalc_odd(sels):
    o = 1.0
    for s in sels:
        o *= s.get('odd', 1.0)
    return round(o, 2)

if t3_sels:
    data['star_ticket_3']['selections'] = t3_sels
    data['star_ticket_3']['total_odd'] = recalc_odd(t3_sels)

if t4_sels:
    data['star_ticket_4']['selections'] = t4_sels
    data['star_ticket_4']['total_odd'] = recalc_odd(t4_sels)
    data['star_ticket_4']['reasoning'] = f"Apuesta Sonadora del Dolar (Cuota Total: @{recalc_odd(t4_sels):.2f}). Combinamos {len(t4_sels)} selecciones de alta probabilidad para buscar multiplicar $1.00."

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done. Final T3 odd:", data['star_ticket_3']['total_odd'])
print("Final T4 odd:", data['star_ticket_4']['total_odd'])
