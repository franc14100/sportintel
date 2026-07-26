import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# T1: Aucas + Londrina (first registered bet @1.52)
data['star_ticket_1'] = {
    "type": "Combinado",
    "selections": [
        {"match": "Aucas vs Macar\u00e1", "sport": "Football", "market": "Doble Oportunidad", "pick": "Aucas o Empate", "odd": 1.29, "reasoning": "La Doble Oportunidad es el mercado m\u00e1s seguro para este partido dado el desequilibrio de fuerzas."},
        {"match": "Londrina vs Gr\u00eamio Novorizontino", "sport": "Football", "market": "Doble Oportunidad", "pick": "Gr\u00eamio Novorizontino o Empate", "odd": 1.29, "reasoning": "La ventaja t\u00e1ctica de Gr\u00eamio Novorizontino hace casi imposible un resultado diferente al cubierto por esta apuesta."}
    ],
    "total_odd": 1.52, "confidence": 82,
    "reasoning": "Combinada de Bajo Riesgo @1.52. Dos selecciones de Doble Oportunidad con alta probabilidad de \u00e9xito.",
    "recommendation_stake": 4.0
}

# T2: Orense + CD Fuerte (second registered bet @1.62)
data['star_ticket_2'] = {
    "type": "Combinado",
    "selections": [
        {"match": "Orense SC vs Independiente del Valle", "sport": "Football", "market": "Doble Oportunidad", "pick": "Independiente del Valle o Empate", "odd": 1.18, "reasoning": "La ventaja t\u00e1ctica de Independiente del Valle hace casi imposible un resultado diferente al cubierto por esta apuesta."},
        {"match": "CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20", "sport": "Football", "market": "H\u00e1ndicap Asi\u00e1tico", "pick": "C.D. Platense Zacatecoluca U20", "odd": 1.38, "reasoning": "H\u00e1ndicap 2(0): Independiente del Valle / H\u00e1ndicap 2(1+): C.D. Platense Zacatecoluca U20 o Empate"}
    ],
    "total_odd": 1.62, "confidence": 80,
    "reasoning": "Combinada @1.62.",
    "recommendation_stake": 3.0
}

# All used matches from T1+T2
used = {"Aucas vs Macar\u00e1", "Londrina vs Gr\u00eamio Novorizontino", "Orense SC vs Independiente del Valle", "CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20"}
valid = {f"{m['home']} vs {m['away']}" for m in data.get('matches', [])}

# Build T3 from usable_picks in matches, excluding used matches
t3_candidates = []
for m in data.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    if key in used or key not in valid:
        continue
    for p in m.get('picks', []):
        if p.get('valid_for_ticket') and p.get('odd', 0) >= 1.20 and p.get('probability', 0) >= 65:
            t3_candidates.append({"match": key, "sport": "Football", "market": p['market'], "pick": p['selection'], "odd": p['odd'], "reasoning": p.get('reasoning', {}).get('tactical', '') if isinstance(p.get('reasoning'), dict) else p.get('reasoning',''), "probability": p.get('probability', 70)})
            break

t3_candidates.sort(key=lambda x: x['probability'], reverse=True)
# Pick 2 best unique matches for T3
t3_sels = []
t3_used = set()
for c in t3_candidates:
    if c['match'] not in t3_used and len(t3_sels) < 2:
        t3_sels.append(c)
        t3_used.add(c['match'])

t3_odd = round(t3_sels[0]['odd'] * t3_sels[1]['odd'], 2) if len(t3_sels) >= 2 else (t3_sels[0]['odd'] if t3_sels else 1.5)
data['star_ticket_3'] = {
    "type": "Combinado", "selections": [{k:v for k,v in s.items() if k != 'probability'} for s in t3_sels],
    "total_odd": t3_odd, "confidence": 78,
    "reasoning": f"Boleto Extra del D\u00eda @{t3_odd:.2f}. Picks distintos sin repetir ning\u00fan partido de los otros boletos.",
    "recommendation_stake": 2.0
}

# T4 Sonadora: different matches, build from remaining
all_used = used | t3_used
t4_candidates = []
for m in data.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    if key in all_used or key not in valid:
        continue
    for p in m.get('picks', []):
        if p.get('odd', 0) >= 1.25 and p.get('probability', 0) >= 60:
            t4_candidates.append({"match": key, "sport": "Football", "market": p['market'], "pick": p['selection'], "odd": p['odd'], "reasoning": p.get('reasoning', {}).get('tactical', '') if isinstance(p.get('reasoning'), dict) else p.get('reasoning',''), "probability": p.get('probability', 65)})
            break

t4_candidates.sort(key=lambda x: x['probability'], reverse=True)
t4_sels = []
t4_used = set()
for c in t4_candidates:
    if c['match'] not in t4_used and len(t4_sels) < 4:
        t4_sels.append(c)
        t4_used.add(c['match'])

t4_odd = 1.0
for s in t4_sels:
    t4_odd *= s['odd']
t4_odd = round(t4_odd, 2)

data['star_ticket_4'] = {
    "type": "Combinado So\u00f1ador", "selections": [{k:v for k,v in s.items() if k != 'probability'} for s in t4_sels],
    "total_odd": t4_odd, "confidence": 60,
    "reasoning": f"Apuesta So\u00f1adora del D\u00f3lar (Cuota Total: @{t4_odd:.2f}). Combinamos {len(t4_sels)} selecciones \u00fanicas.",
    "recommendation_stake": 1.0
}

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("T1:", [s['match'] for s in data['star_ticket_1']['selections']], "odd:", data['star_ticket_1']['total_odd'])
print("T2:", [s['match'] for s in data['star_ticket_2']['selections']], "odd:", data['star_ticket_2']['total_odd'])
print("T3:", [s['match'] for s in data['star_ticket_3']['selections']], "odd:", data['star_ticket_3']['total_odd'])
print("T4:", [s['match'] for s in data['star_ticket_4']['selections']], "odd:", data['star_ticket_4']['total_odd'])

# Verify no duplicates
all_matches = []
for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
    for s in data[k]['selections']:
        if s['match'] in all_matches:
            print(f"DUPLICATE: {s['match']} in {k}")
        all_matches.append(s['match'])
print("No duplicates!" if len(all_matches) == len(set(all_matches)) else "HAS DUPLICATES")
