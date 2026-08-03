import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Inject Ticket 1 into star_ticket_1
data['star_ticket_1'] = {
    'ticket_id': '85040140221',
    'type': 'Combinado',
    'selections': [
        {'match': 'Jablonec - NK Varazdin', 'sport': 'Football', 'market': 'Total individual 1 más de (4.5) Saques de esquina Jablonec', 'pick': 'Más de 4.5 Córners', 'odd': 1.28},
        {'match': 'Nordsjaelland - GAIS', 'sport': 'Football', 'market': 'Total individual 1 más de (4.5) Saques de esquina Nordsjaelland', 'pick': 'Más de 4.5 Córners', 'odd': 1.21}
    ],
    'total_odd': 1.549,
    'confidence': 85,
    'recommendation_stake': 4
}

# Inject Ticket 2 into star_ticket_2
data['star_ticket_2'] = {
    'ticket_id': '85040371415',
    'type': 'Combinado',
    'selections': [
        {'match': 'Auda - FCSB', 'sport': 'Football', 'market': 'Total individual 2 más de (4.5) Saques de esquina FCSB', 'pick': 'Más de 4.5 Córners', 'odd': 1.42},
        {'match': 'Ludogorets 1945 - Hapoel Tel Aviv', 'sport': 'Football', 'market': 'Total individual 1 más de (4.5) Saques de esquina Ludogorets 1945', 'pick': 'Más de 4.5 Córners', 'odd': 1.28}
    ],
    'total_odd': 1.818,
    'confidence': 82,
    'recommendation_stake': 4
}

# Inject Ticket 3 into star_ticket_3
data['star_ticket_3'] = {
    'ticket_id': '85041008103',
    'type': 'Combinado',
    'selections': [
        {'match': 'KRC Gent - LNZ', 'sport': 'Football', 'market': 'Total 1. Saques de esquina: Total individual 1 más de (5.5)', 'pick': 'Más de 5.5 Córners', 'odd': 1.33},
        {'match': "Independiente - Newell's Old Boys", 'sport': 'Football', 'market': 'Total 1. Saques de esquina: Total individual 1 más de (4.5)', 'pick': 'Más de 4.5 Córners', 'odd': 1.38}
    ],
    'total_odd': 1.835,
    'confidence': 80,
    'recommendation_stake': 4
}

# Delete star_ticket_4 so it doesn't render empty
data['star_ticket_4'] = None

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Tickets successfully injected into star_ticket_1, 2, 3!')
