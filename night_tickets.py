import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

now_utc = datetime.now(timezone.utc)
# Need matches after 23:30 UTC (18:30 Ecuador)
MIN_HOUR_UTC = 23.5

print(f"Buscando partidos despues de 23:30 UTC (18:30 Ecuador)...")
print(f"UTC ahora: {now_utc.strftime('%H:%M')}")

all_future = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '')
    try:
        h, mi = t.split(':')
        hour = int(h) + int(mi)/60
        if hour >= MIN_HOUR_UTC:
            best_pick = None
            best_prob = 0
            for p in m.get('picks', []):
                prob = p.get('probability', 0)
                odd = p.get('odd', 0)
                banned = ['Tarjeta', 'Asian 2.0', 'Primero en Anotar', 'Resultado 1er Tiempo', 'Goles del Equipo']
                mkt = p.get('market', '')
                if (p.get('valid_for_ticket', True) is not False and
                    prob >= 65 and 1.10 <= odd <= 1.80 and
                    not any(b in mkt for b in banned)):
                    if prob > best_prob:
                        best_prob = prob
                        best_pick = p
            if best_pick:
                all_future.append({
                    'match': key, 'time': t, 'sport': 'Football',
                    'market': best_pick.get('market',''),
                    'pick': best_pick.get('selection',''),
                    'odd': best_pick.get('odd', 0),
                    'probability': best_prob,
                    'reasoning': best_pick.get('reasoning', {}).get('tactical','') if isinstance(best_pick.get('reasoning'), dict) else best_pick.get('reasoning','')
                })
    except:
        pass

all_future.sort(key=lambda x: (-x['probability'], x['time']))
print(f"\nPartidos disponibles ({len(all_future)}):")
for p in all_future:
    ec_hour = int(p['time'].split(':')[0]) - 5
    print(f"  {p['time']} UTC ({ec_hour}:{'30' if '30' in p['time'] else '00'} EC) | {p['match']} | {p['market']} | {p['pick']} @{p['odd']} {p['probability']}%")

# Build 4 new tickets using probability-first logic
SIMPLE_THRESHOLD = 85
COMBO_THRESHOLD = 82
used_matches = set()
tickets = []

def build_ticket(picks, used, label):
    available = [p for p in picks if p['match'] not in used]
    if not available:
        return None, used
    
    best = available[0]
    best_prob = best['probability']
    
    if best_prob >= SIMPLE_THRESHOLD:
        sels = [best]
        t_type = 'Simple'
        t_odd = best['odd']
        t_conf = best_prob
    else:
        second = None
        for p in available[1:]:
            if p['match'] != best['match'] and p['probability'] >= COMBO_THRESHOLD:
                combined = (best_prob/100) * (p['probability']/100) * 100
                if combined >= 67:
                    second = p
                    break
        if second and best_prob >= COMBO_THRESHOLD:
            sels = [best, second]
            t_type = 'Combinado'
            t_odd = round(best['odd'] * second['odd'], 2)
            t_conf = round((best_prob/100) * (second['probability']/100) * 100)
        else:
            sels = [best]
            t_type = 'Simple'
            t_odd = best['odd']
            t_conf = best_prob
    
    for s in sels:
        used.add(s['match'])
    
    ticket = {
        'type': t_type,
        'selections': [{'match': s['match'], 'sport': s['sport'], 'market': s['market'],
                        'pick': s['pick'], 'odd': s['odd'], 'reasoning': s.get('reasoning','')} for s in sels],
        'total_odd': round(t_odd, 2),
        'confidence': t_conf,
        'reasoning': f"{label} @{t_odd:.2f}. Prob: {t_conf}%. Partidos nocturnos validados.",
        'recommendation_stake': 4.0 if '1' in label else (3.0 if '2' in label else (2.0 if '3' in label else 1.0))
    }
    return ticket, used

if len(all_future) >= 2:
    t1, used_matches = build_ticket(all_future, used_matches, "Boleto 1 Seguro")
    t2, used_matches = build_ticket(all_future, used_matches, "Boleto 2 Valor")
    t3, used_matches = build_ticket(all_future, used_matches, "Boleto 3 Extra")
    
    # Sonadora: next 3-4 picks
    t4_picks = [p for p in all_future if p['match'] not in used_matches][:4]
    t4_odd = 1.0
    for p in t4_picks: t4_odd *= p['odd']
    t4_odd = round(t4_odd, 2)
    t4 = {
        'type': 'Combinado Sonador',
        'selections': [{'match': p['match'], 'sport': p['sport'], 'market': p['market'],
                        'pick': p['pick'], 'odd': p['odd'], 'reasoning': p.get('reasoning','')} for p in t4_picks],
        'total_odd': t4_odd, 'confidence': 60,
        'reasoning': f"Sonadora @{t4_odd}. {len(t4_picks)} picks nocturnos unicos.",
        'recommendation_stake': 1.0
    }
    
    d['star_ticket_1'] = t1
    d['star_ticket_2'] = t2
    d['star_ticket_3'] = t3
    if t4_picks:
        d['star_ticket_4'] = t4

    with open('frontend/data.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

    print("\n=== BOLETOS NOCTURNOS ===")
    for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
        t = d.get(k, {})
        if t:
            matches = [s['match'] for s in t.get('selections',[])]
            print(f"{k} ({t.get('type')}): {matches} @{t.get('total_odd')} conf:{t.get('confidence')}%")
    
    all_m = [s['match'] for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']
             for s in d.get(k,{}).get('selections',[])]
    dupes = [m for m in set(all_m) if all_m.count(m)>1]
    print('Duplicados:', dupes or 'NINGUNO')
else:
    print(f"\nSolo {len(all_future)} partidos encontrados despues de 23:30 UTC.")
    print("Intentando con umbral mas bajo (prob>=60, odd<=2.0)...")
    for m in d.get('matches',[]):
        key = f"{m['home']} vs {m['away']}"
        t = m.get('time','')
        try:
            h, mi = t.split(':')
            hour = int(h) + int(mi)/60
            if hour >= 23.0:
                for p in m.get('picks',[]):
                    if p.get('probability',0) >= 60:
                        ec = int(h) - 5
                        print(f"  {t} UTC ({ec}h EC) | {key} | {p.get('market','')} @{p.get('odd','')} {p.get('probability','')}%")
                        break
        except: pass
