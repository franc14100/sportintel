import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Agregar Boleto 3 al registro
boleto3 = {
    "date": "2026-07-29",
    "ticket_id": "TK-381299",
    "name": "Boleto Estrella 3 - Tenis",
    "type": "Simple",
    "selections": [
        {
            "match": "Zane Stevens vs Moerani Bouzige",
            "sport": "Tennis",
            "market": "Juegos del Jugador (Individual)",
            "pick": "Zane Stevens Más de 12.5 Juegos",
            "odd": 1.62
        }
    ],
    "total_odd": 1.62,
    "confidence": 78,
    "recommendation_stake": 4,
    "status": "pending"
}

# Registry: solo los 3 boletos de hoy, en orden
today_registry = [
    {
        "date": "2026-07-29",
        "ticket_id": "TK-193813",
        "name": "Boleto Estrella 1 - Seguro",
        "type": "Combinado",
        "selections": [
            {
                "match": "Górnik Zabrze vs Fenerbahçe",
                "sport": "Football",
                "market": "Córners del Equipo (Individual)",
                "pick": "Fenerbahçe Más de 4.5 Córners",
                "odd": 1.36
            },
            {
                "match": "Arsenal de Sarandí Reserve vs Villa Dalmine Reserve",
                "sport": "Football",
                "market": "Córners del Equipo (Individual)",
                "pick": "Arsenal de Sarandí Reserve Más de 4.5 Córners",
                "odd": 1.33
            }
        ],
        "total_odd": 1.79,
        "confidence": 78,
        "recommendation_stake": 4,
        "status": "pending"
    },
    {
        "date": "2026-07-29",
        "ticket_id": "TK-670264",
        "name": "Boleto Estrella 2 - Valor",
        "type": "Combinado",
        "selections": [
            {
                "match": "FK Kauno Žalgiris vs Klaksvíkar Ítróttarfelag",
                "sport": "Football",
                "market": "Doble Oportunidad",
                "pick": "FK Kauno Žalgiris o Empate",
                "odd": 1.18
            },
            {
                "match": "Mirassol vs Remo",
                "sport": "Football",
                "market": "Córners del Equipo (Individual)",
                "pick": "Mirassol Más de 4.5 Córners",
                "odd": 1.29
            }
        ],
        "total_odd": 1.50,
        "confidence": 75,
        "recommendation_stake": 4,
        "status": "pending"
    },
    boleto3
]

data['historical_tickets_registry'] = today_registry

# Reset de global_stats para que la grafica empiece en blanco
data['global_stats'] = {
    "analyzed_today": 0,
    "avg_accuracy_40d": 0,
    "total_picks_won": 0,
    "total_picks_lost": 0,
    "roi_percentage": 0
}

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Listo: 3 boletos en registro, global_stats reseteado")
