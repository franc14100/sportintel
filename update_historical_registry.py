import json

with open('data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

reg = d.get('historical_tickets_registry', [])

# Resolve Aug 12 tickets
for t in reg:
    if t.get('date') == '2026-08-12':
        name = t.get('name', '')
        if 'Seguro' in name:
            t['status'] = 'won'
            for s in t.get('selections', []): s['status'] = 'won'
        elif 'Valor' in name:
            t['status'] = 'won'
            for s in t.get('selections', []): s['status'] = 'won'
        elif 'Extra' in name:
            t['status'] = 'lost'
            for s in t.get('selections', []):
                if 'Cartagena' in s.get('match', ''): s['status'] = 'won'
                else: s['status'] = 'lost'
        elif 'Soñadora' in name or 'Sonadora' in name or 'Boleto 4' in name:
            t['status'] = 'lost'
            for s in t.get('selections', []): s['status'] = 'lost'

# Check if Aug 14 tickets are in registry
exists_aug14 = any(t.get('date') == '2026-08-14' for t in reg)
if not exists_aug14:
    t1 = {
        'ticket_id': '85040140221',
        'date': '2026-08-14',
        'name': 'Boleto Estrella 1: Seguro (Córners)',
        'type': 'Combinado',
        'selections': [
            {'match': 'Jablonec vs NK Varazdin', 'sport': 'Football', 'market': 'Total Ind. 1 > 4.5 Córners', 'pick': 'Más de 4.5 Córners', 'odd': 1.28, 'status': 'lost'},
            {'match': 'Nordsjaelland vs GAIS', 'sport': 'Football', 'market': 'Total Ind. 1 > 4.5 Córners', 'pick': 'Más de 4.5 Córners', 'odd': 1.21, 'status': 'won'}
        ],
        'total_odd': 1.55,
        'confidence': 85,
        'recommendation_stake': 4,
        'status': 'lost'
    }
    t2 = {
        'ticket_id': '85040371415',
        'date': '2026-08-14',
        'name': 'Boleto Estrella 2: Valor (Córners)',
        'type': 'Combinado',
        'selections': [
            {'match': 'Auda vs FCSB', 'sport': 'Football', 'market': 'Total Ind. 2 > 4.5 Córners', 'pick': 'Más de 4.5 Córners', 'odd': 1.42, 'status': 'lost'},
            {'match': 'Ludogorets vs Hapoel Tel Aviv', 'sport': 'Football', 'market': 'Total Ind. 1 > 4.5 Córners', 'pick': 'Más de 4.5 Córners', 'odd': 1.28, 'status': 'won'}
        ],
        'total_odd': 1.82,
        'confidence': 82,
        'recommendation_stake': 4,
        'status': 'lost'
    }
    t3 = {
        'ticket_id': '85041008103',
        'date': '2026-08-14',
        'name': 'Boleto Estrella 3: Extra (Córners)',
        'type': 'Combinado',
        'selections': [
            {'match': 'KRC Gent vs LNZ', 'sport': 'Football', 'market': 'Total Ind. 1 > 5.5 Córners', 'pick': 'Más de 5.5 Córners', 'odd': 1.33, 'status': 'lost'},
            {'match': "Independiente vs Newell's", 'sport': 'Football', 'market': 'Total Ind. 1 > 4.5 Córners', 'pick': 'Más de 4.5 Córners', 'odd': 1.38, 'status': 'won'}
        ],
        'total_odd': 1.84,
        'confidence': 80,
        'recommendation_stake': 4,
        'status': 'lost'
    }
    reg.extend([t1, t2, t3])

d['historical_tickets_registry'] = reg
d['date'] = '2026-08-14'

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)

print('Updated historical_tickets_registry successfully! Total tickets:', len(reg))
