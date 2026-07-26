import json, subprocess, sys

# 1. Back up T1 and T2
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

t1_backup = {
    "type": "Combinado",
    "selections": [
        {"match": "Aucas vs Macar\u00e1", "sport": "Football", "market": "Doble Oportunidad", "pick": "Aucas o Empate", "odd": 1.29, "reasoning": "La Doble Oportunidad es el mercado m\u00e1s seguro para este partido."},
        {"match": "Londrina vs Gr\u00eamio Novorizontino", "sport": "Football", "market": "Doble Oportunidad", "pick": "Gr\u00eamio Novorizontino o Empate", "odd": 1.29, "reasoning": "La ventaja t\u00e1ctica de Gr\u00eamio Novorizontino hace casi imposible un resultado diferente."}
    ],
    "total_odd": 1.52, "confidence": 82,
    "reasoning": "Combinada de Bajo Riesgo @1.52.",
    "recommendation_stake": 4.0
}
t2_backup = {
    "type": "Combinado",
    "selections": [
        {"match": "Orense SC vs Independiente del Valle", "sport": "Football", "market": "Doble Oportunidad", "pick": "Independiente del Valle o Empate", "odd": 1.18, "reasoning": "La ventaja t\u00e1ctica de Independiente del Valle."},
        {"match": "CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20", "sport": "Football", "market": "H\u00e1ndicap Asi\u00e1tico", "pick": "C.D. Platense Zacatecoluca U20", "odd": 1.38, "reasoning": "H\u00e1ndicap favorable para Platense."}
    ],
    "total_odd": 1.62, "confidence": 80,
    "reasoning": "Combinada @1.62.",
    "recommendation_stake": 3.0
}

# 2. Remove T3 and T4 to force fresh generation
data.pop('star_ticket_3', None)
data.pop('star_ticket_4', None)
# Also clear date so generator creates fresh
data['date'] = ''

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Running generator for fresh today data...")
result = subprocess.run(['python', 'backend/data_generator.py'], capture_output=True, text=True, encoding='utf-8', errors='replace')
print(result.stdout[-1500:])
if result.returncode != 0:
    print('ERROR:', result.stderr[-500:])
    sys.exit(1)

# 3. Restore T1 and T2
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

data['star_ticket_1'] = t1_backup
data['star_ticket_2'] = t2_backup

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 4. Verify
print("\n=== TICKETS FINALES ===")
for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
    t = data.get(k)
    if t:
        matches = [s['match'] for s in t.get('selections',[])]
        print(f"{k}: {matches} @{t.get('total_odd','?')}")

all_m = []
for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
    for s in data.get(k,{}).get('selections',[]):
        all_m.append(s['match'])
dupes = [m for m in set(all_m) if all_m.count(m) > 1]
print("Duplicados:", dupes if dupes else "NINGUNO")
