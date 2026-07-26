import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# ===== RESTORE TICKET 1: Aucas + Londrina @1.52 =====
data['star_ticket_1'] = {
    "type": "Combinado",
    "selections": [
        {
            "match": "Aucas vs Macarä",
            "sport": "Football",
            "market": "Doble Oportunidad",
            "pick": "Aucas o Empate",
            "odd": 1.29,
            "reasoning": "La Doble Oportunidad es el mercado más seguro para este partido dado el desequilibrio de fuerzas."
        },
        {
            "match": "Londrina vs Grêmio Novorizontino",
            "sport": "Football",
            "market": "Doble Oportunidad",
            "pick": "Grêmio Novorizontino o Empate",
            "odd": 1.29,
            "reasoning": "La ventaja táctica de Grêmio Novorizontino hace casi imposible un resultado diferente al cubierto por esta apuesta."
        }
    ],
    "total_odd": 1.52,
    "confidence": 82,
    "reasoning": "Combinada de Bajo Riesgo @1.52. Dos selecciones de Doble Oportunidad con alta probabilidad de éxito.",
    "recommendation_stake": 4.0
}

# ===== RESTORE TICKET 2: Orense + CD Fuerte U20 @1.62 =====
data['star_ticket_2'] = {
    "type": "Combinado",
    "selections": [
        {
            "match": "Orense SC vs Independiente del Valle",
            "sport": "Football",
            "market": "Doble Oportunidad",
            "pick": "Independiente del Valle o Empate",
            "odd": 1.18,
            "reasoning": "La ventaja táctica de Independiente del Valle hace casi imposible un resultado diferente al cubierto por esta apuesta."
        },
        {
            "match": "CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20",
            "sport": "Football",
            "market": "Hándicap Asiático",
            "pick": "C.D. Platense Zacatecoluca U20",
            "odd": 1.38,
            "reasoning": "Hándicap 2(0): Independiente del Valle / Hándicap 2(1+): C.D. Platense Zacatecoluca U20 o Empate"
        }
    ],
    "total_odd": 1.62,
    "confidence": 80,
    "reasoning": "Combinada @1.62. Selecciones de Doble Oportunidad y Hándicap con alta probabilidad de éxito.",
    "recommendation_stake": 3.0
}

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Tickets 1 and 2 restored successfully.')
print('T1:', [s['match'] for s in data['star_ticket_1']['selections']])
print('T2:', [s['match'] for s in data['star_ticket_2']['selections']])
print('T3:', [s['match'] for s in data.get('star_ticket_3', {}).get('selections', [])])
print('T4:', [s['match'] for s in data.get('star_ticket_4', {}).get('selections', [])])
