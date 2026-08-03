import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

new_tickets = [
    {
        'ticket_id': '85040140221',
        'name': 'Boleto 85040140221',
        'type': 'Combinado',
        'selections': [
            {'match': 'Jablonec vs NK Varazdin', 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'Jablonec Más de 4.5 Córners', 'odd': 1.28},
            {'match': 'Nordsjaelland vs GAIS', 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'Nordsjaelland Más de 4.5 Córners', 'odd': 1.21}
        ],
        'total_odd': 1.549,
        'confidence': 85,
        'recommendation_stake': 4
    },
    {
        'ticket_id': '85040371415',
        'name': 'Boleto 85040371415',
        'type': 'Combinado',
        'selections': [
            {'match': 'Auda vs FCSB', 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'FCSB Más de 4.5 Córners', 'odd': 1.42},
            {'match': 'Ludogorets 1945 vs Hapoel Tel Aviv', 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'Ludogorets 1945 Más de 4.5 Córners', 'odd': 1.28}
        ],
        'total_odd': 1.818,
        'confidence': 82,
        'recommendation_stake': 4
    },
    {
        'ticket_id': '85041008103',
        'name': 'Boleto 85041008103',
        'type': 'Combinado',
        'selections': [
            {'match': 'KRC Gent vs LNZ', 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'KRC Gent Más de 5.5 Córners', 'odd': 1.33},
            {'match': "Independiente vs Newell's Old Boys", 'sport': 'Football', 'market': 'Córners del Equipo (Individual)', 'pick': 'Independiente Más de 4.5 Córners', 'odd': 1.38}
        ],
        'total_odd': 1.835,
        'confidence': 80,
        'recommendation_stake': 4
    }
]

data['tickets'] = new_tickets

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Tickets injected successfully!')
