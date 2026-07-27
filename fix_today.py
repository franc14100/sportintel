import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

now_utc = datetime.now(timezone.utc)
# Use strict minimum: 16:00 UTC (11:00 AM Ecuador) to avoid any ambiguity with yesterday's matches
MIN_UTC = 16.0
BANNED = ['Tarjeta', 'Asian 2.0', 'Primero en Anotar', 'Resultado 1er Tiempo', 'Goles del Equipo']

print(f"UTC now: {now_utc.strftime('%H:%M')} — building tickets from matches after 16:00 UTC (11:00 EC)")

future_picks = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '')
    try:
        h, mi = t.split(':')
        hour = int(h) + int(mi)/60.0
        if hour < MIN_UTC:
            continue
        for p in m.get('picks', []):
            prob = p.get('probability', 0)
            odd = p.get('odd', 0)
            mkt = p.get('market', '')
            if (p.get('valid_for_ticket', True) is not False
                    and prob >= 72 and 1.10 <= odd <= 1.65
                    and not any(b in mkt for b in BANNED)):
                reasoning = p.get('reasoning', '')
                if isinstance(reasoning, dict):
                    reasoning = reasoning.get('tactical', '')
                ec_h = int(h) - 5
                future_picks.append({
                    'match': key, 'sport': 'Football', 'market': mkt,
                    'pick': p.get('selection', ''), 'odd': odd,
                    'probability': prob, 'reasoning': reasoning,
                    'time_ec': f"{ec_h}:{mi}"
                })
                break
    except:
        pass

def tier(p):
    mkt, prob = p['market'], p['probability']
    if 'M' in mkt and 'Goles' in mkt and '0.5' in p['pick'] and prob >= 80: return 0
    if 'M' in mkt and 'Goles' in mkt and '1.5' in p['pick'] and prob >= 78: return 1
    if 'Doble Oportunidad' in mkt and prob >= 78: return 2
    if 'Menos' in mkt and prob >= 78: return 3
    return 4

future_picks.sort(key=lambda x: (tier(x), -x['probability']))
print(f"Picks after 16:00 UTC: {len(future_picks)}")
for p in future_picks[:8]:
    print(f"  EC {p['time_ec']} | {p['match']} | {p['pick']} @{p['odd']} {p['probability']}%")

def build_ticket(pool, used):
    avail = [p for p in pool if p['match'] not in used]
    if not avail: return None
    best = avail[0]
    bp = best['probability']
    if bp >= 85:
        sels, t_odd, t_conf, t_type = [best], best['odd'], bp, 'Simple'
    else:
        sec = next((p for p in avail[1:] if p['match'] != best['match']
                    and p['probability'] >= 82
                    and (bp/100)*(p['probability']/100)*100 >= 67), None)
        if sec and bp >= 82:
            sels = [best, sec]
            t_odd = round(best['odd']*sec['odd'], 2)
            t_conf = round((bp/100)*(sec['probability']/100)*100)
            t_type = 'Combinado'
        else:
            sels, t_odd, t_conf, t_type = [best], best['odd'], bp, 'Simple'
    for s in sels: used.add(s['match'])
    return {
        'type': t_type,
        'selections': [{'match': s['match'],'sport':s['sport'],'market':s['market'],
                        'pick':s['pick'],'odd':s['odd'],'reasoning':s['reasoning']} for s in sels],
        'total_odd': round(t_odd, 2), 'confidence': t_conf,
        'reasoning': f"{t_type} @{t_odd:.2f} — prob {t_conf}%. Partidos de hoy 27/07 despues de 11AM Ecuador.",
        'recommendation_stake': 4.0
    }

used = set()
t1 = build_ticket(future_picks, used)
t2 = build_ticket(future_picks, used)
if t2: t2['recommendation_stake'] = 3.0
t3 = build_ticket(future_picks, used)
if t3: t3['recommendation_stake'] = 2.0
remaining = [p for p in future_picks if p['match'] not in used][:4]
t4_odd = round(__import__('functools').reduce(lambda a,b: a*b, [p['odd'] for p in remaining], 1.0), 2) if remaining else 1.5
t4 = {
    'type': 'Combinado Sonador',
    'selections': [{'match':p['match'],'sport':p['sport'],'market':p['market'],
                    'pick':p['pick'],'odd':p['odd'],'reasoning':p['reasoning']} for p in remaining],
    'total_odd': t4_odd, 'confidence': 55,
    'reasoning': f"Sonadora @{t4_odd}. Picks nocturnos de hoy.", 'recommendation_stake': 1.0
}

for k, t in [('star_ticket_1',t1),('star_ticket_2',t2),('star_ticket_3',t3),('star_ticket_4',t4)]:
    if t: d[k] = t

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print("\n=== BOLETOS DEFINITIVOS ===")
for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
    t = d.get(k, {})
    ec_times = []
    for s in t.get('selections', []):
        mp = next((p for p in future_picks if p['match']==s['match']), None)
        ec_times.append(f"EC{mp['time_ec']}" if mp else "")
    print(f"{k} ({t.get('type')}) @{t.get('total_odd')} conf:{t.get('confidence')}%")
    for s, ec in zip(t.get('selections',[]), ec_times):
        print(f"   {s['match']} {ec} @{s['odd']}")
