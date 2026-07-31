import json

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hr = data.get('historical_tickets_registry', [])

# Los 3 boletos de las FOTOS del usuario (mañana del 30/07/2026)
new_tickets = [
    {
        'date': '2026-07-30',
        'ticket_id': 'FOTO-001',
        'name': 'Boleto Estrella 1 - Seguro',
        'type': 'Combinado',
        'selections': [
            {
                'match': 'KRC Gent - LNZ',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total Individual)',
                'pick': 'Total Individual Mas de 5.5 Corners',
                'odd': 1.35,
                'status': 'lost'
            },
            {
                'match': 'Independiente - Newell Old Boys',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total Individual)',
                'pick': 'Total Individual Mas de 5.5 Corners',
                'odd': 1.36,
                'status': 'lost'
            }
        ],
        'total_odd': 1.835,
        'confidence': 72,
        'recommendation_stake': 4,
        'status': 'lost'
    },
    {
        'date': '2026-07-30',
        'ticket_id': 'FOTO-002',
        'name': 'Boleto Estrella 2 - Valor',
        'type': 'Combinado',
        'selections': [
            {
                'match': 'Auda - FCSB',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total)',
                'pick': 'Total Mas de 4.5 Corners',
                'odd': 1.35,
                'status': 'lost'
            },
            {
                'match': 'Ludogorets 1945 - Hapoel Tel Aviv',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total)',
                'pick': 'Total Mas de 4.5 Corners',
                'odd': 1.35,
                'status': 'lost'
            }
        ],
        'total_odd': 1.818,
        'confidence': 70,
        'recommendation_stake': 4,
        'status': 'lost'
    },
    {
        'date': '2026-07-30',
        'ticket_id': 'FOTO-003',
        'name': 'Boleto Extra del Dia',
        'type': 'Combinado',
        'selections': [
            {
                'match': 'Jablonec - NK Varazdin',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total)',
                'pick': 'Total Mas de 4.5 Corners',
                'odd': 1.25,
                'status': 'lost'
            },
            {
                'match': 'Nordsjaelland - GAIS',
                'sport': 'Football',
                'market': 'Saques de Esquina (Total)',
                'pick': 'Total Mas de 4.5 Corners',
                'odd': 1.24,
                'status': 'lost'
            }
        ],
        'total_odd': 1.549,
        'confidence': 68,
        'recommendation_stake': 4,
        'status': 'lost'
    }
]

# Marcar boletos del 30/07 del sistema como lost
for t in hr:
    if t.get('date') == '2026-07-30' and t.get('status') in ['pending', 'PENDIENTE']:
        t['status'] = 'lost'
        for sel in t.get('selections', []):
            if sel.get('status') in ['pending', 'PENDIENTE', None]:
                sel['status'] = 'lost'

# Agregar los 3 nuevos boletos (de las fotos) si no existen
existing_ids = {t.get('ticket_id') for t in hr}
for nt in new_tickets:
    if nt['ticket_id'] not in existing_ids:
        hr.append(nt)

data['historical_tickets_registry'] = hr

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done! Total tickets:', len(hr))
for t in hr:
    print(f" - {t['date']} | {t['name']} | {t.get('status')} @{t.get('total_odd')}")
