import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Current time in Ecuador (UTC-5)
now_utc = datetime.now(timezone.utc)
now_hour_utc = now_utc.hour + now_utc.minute / 60.0  # e.g. 17.9

used = {
    'Aucas vs Macar\u00e1', 'Londrina vs Gr\u00eamio Novorizontino',
    'Orense SC vs Independiente del Valle',
    'CD Fuerte San Francisco U20 vs C.D. Platense Zacatecoluca U20',
    'Olimpia vs Libertad', 'Estudiantes de R\u00edo Cuarto vs Tigre',
    'Resende vs Americano', 'CF Pachuca vs Quer\u00e9taro FC'
}

print(f"Current UTC hour: {now_hour_utc:.1f}")

future_picks = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '')  # e.g. "19:30" or "21:00" - these are UTC times
    if not t or key in used:
        continue
    try:
        parts = t.split(':')
        match_hour = int(parts[0]) + int(parts[1]) / 60.0
        # Only take matches that haven't started yet (at least 30 min in the future)
        if match_hour > now_hour_utc + 0.5:
            for p in m.get('picks', []):
                if p.get('valid_for_ticket') and p.get('odd', 0) >= 1.20 and p.get('probability', 0) >= 65:
                    future_picks.append({
                        'match': key, 'sport': 'Football',
                        'market': p['market'], 'pick': p['selection'],
                        'odd': p['odd'], 'probability': p.get('probability', 70),
                        'reasoning': p.get('reasoning', {}).get('tactical', '') if isinstance(p.get('reasoning'), dict) else p.get('reasoning', ''),
                        'time': t
                    })
                    break
    except:
        pass

future_picks.sort(key=lambda x: x['probability'], reverse=True)
print(f'Found {len(future_picks)} future picks')
for p in future_picks[:10]:
    print(f"  {p['match']} @{p['time']} | {p['pick']} @{p['odd']} prob:{p['probability']}")

if len(future_picks) >= 2:
    t3_sels = future_picks[:2]
    t3_odd = round(t3_sels[0]['odd'] * t3_sels[1]['odd'], 2)
    d['star_ticket_3'] = {
        "type": "Combinado",
        "selections": [{k: v for k, v in s.items() if k not in ('probability', 'time')} for s in t3_sels],
        "total_odd": t3_odd, "confidence": 78,
        "reasoning": f"Boleto Extra del D\u00eda @{t3_odd:.2f}. Partidos futuros validados.",
        "recommendation_stake": 2.0
    }

    t3_matches = {s['match'] for s in t3_sels}
    all_used = used | t3_matches
    t4_sels = [p for p in future_picks if p['match'] not in all_used][:4]
    t4_odd = 1.0
    for s in t4_sels:
        t4_odd *= s['odd']
    t4_odd = round(t4_odd, 2)

    d['star_ticket_4'] = {
        "type": "Combinado So\u00f1ador",
        "selections": [{k: v for k, v in s.items() if k not in ('probability', 'time')} for s in t4_sels],
        "total_odd": t4_odd, "confidence": 60,
        "reasoning": f"Apuesta So\u00f1adora del D\u00f3lar @{t4_odd:.2f}. {len(t4_sels)} picks de partidos futuros.",
        "recommendation_stake": 1.0
    }

    with open('frontend/data.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

    print('\nT3:', [s['match'] for s in d['star_ticket_3']['selections']], '@', d['star_ticket_3']['total_odd'])
    print('T4:', [s['match'] for s in d['star_ticket_4']['selections']], '@', d['star_ticket_4']['total_odd'])
    all_m = []
    for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
        for s in d[k]['selections']:
            all_m.append(s['match'])
    print('Duplicates:', [m for m in set(all_m) if all_m.count(m) > 1] or 'NONE')
else:
    print(f'Only {len(future_picks)} picks found - showing all matches with time:')
    for m in d.get('matches', [])[:20]:
        print(f"  {m['home']} vs {m['away']} time:{m.get('time','?')}")
