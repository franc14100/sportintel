import json
from datetime import datetime, timezone

with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

now_utc = datetime.now(timezone.utc)
now_hour = now_utc.hour + now_utc.minute / 60.0
print(f"UTC ahora: {now_utc.strftime('%H:%M')} ({now_hour:.2f})")

# Protected matches (T1 and T2 user bets)
protected_keywords = ['Aucas', 'Londrina', 'Orense', 'Fuerte', 'Platense']

future_picks = []
for m in d.get('matches', []):
    key = f"{m['home']} vs {m['away']}"
    t = m.get('time', '')
    # Skip protected
    if any(kw in key for kw in protected_keywords):
        continue
    try:
        parts = t.split(':')
        match_hour = int(parts[0]) + int(parts[1]) / 60.0
        # Only matches starting at least 30 min from now
        if match_hour > now_hour + 0.5:
            for p in m.get('picks', []):
                mkt = p.get('market', '')
                # Apply new rules: valid_for_ticket, prob>=72, odd 1.10-1.65
                # Ban synthetic markets
                banned = ['Tarjeta', 'Asian 2.0', 'Primero en Anotar', 'Resultado 1er Tiempo', 'Goles del Equipo']
                if (p.get('valid_for_ticket', True) is not False and
                    p.get('probability', 0) >= 72 and
                    1.10 <= p.get('odd', 0) <= 1.65 and
                    not any(b in mkt for b in banned)):
                    reasoning = p.get('reasoning', '')
                    if isinstance(reasoning, dict):
                        reasoning = reasoning.get('tactical', '')
                    future_picks.append({
                        'match': key, 'sport': 'Football',
                        'market': mkt, 'pick': p.get('selection',''),
                        'odd': p['odd'], 'probability': p.get('probability', 72),
                        'reasoning': reasoning, 'time': t
                    })
                    break
    except Exception as e:
        pass

# Sort by safety tier then probability
def pick_tier(p):
    mkt = p.get('market', '')
    prob = p.get('probability', 0)
    if 'M' in mkt and 'Goles' in mkt and '0.5' in str(p.get('pick','')) and prob >= 80: return 0
    if 'M' in mkt and 'Goles' in mkt and '1.5' in str(p.get('pick','')) and prob >= 78: return 1
    if 'Doble Oportunidad' in mkt and prob >= 78: return 2
    if 'Menos' in mkt and 'Goles' in mkt and prob >= 78: return 3
    return 4

future_picks.sort(key=lambda x: (pick_tier(x), -x.get('probability', 0)))

print(f"\nPartidos futuros validos ({len(future_picks)}):")
for p in future_picks:
    print(f"  {p['time']} UTC | {p['match']} | {p['market']} | {p['pick']} @{p['odd']} {p['probability']}%")

# T3: top 2 picks with prob>=82 (combined) or best single if >=85
SIMPLE_THRESHOLD = 85
COMBO_THRESHOLD = 82

if future_picks:
    best = future_picks[0]
    best_prob = best['probability']
    
    if best_prob >= SIMPLE_THRESHOLD:
        # Simple
        t3_sels = [best]
        t3_type = 'Simple'
        t3_odd = best['odd']
        t3_conf = best_prob
    else:
        # Look for second pick >=82%
        second = None
        for p in future_picks[1:]:
            if p['match'] != best['match'] and p['probability'] >= COMBO_THRESHOLD:
                combined = (best_prob/100) * (p['probability']/100) * 100
                if combined >= 67:
                    second = p
                    break
        if second and best_prob >= COMBO_THRESHOLD:
            t3_sels = [best, second]
            t3_type = 'Combinado'
            t3_odd = round(best['odd'] * second['odd'], 2)
            t3_conf = round((best_prob/100) * (second['probability']/100) * 100)
        else:
            t3_sels = [best]
            t3_type = 'Simple'
            t3_odd = best['odd']
            t3_conf = best_prob

    # T4 Sonadora: remaining picks, up to 3-4
    t3_matches = {s['match'] for s in t3_sels}
    t4_picks = [p for p in future_picks if p['match'] not in t3_matches][:4]
    t4_odd = 1.0
    for p in t4_picks: t4_odd *= p['odd']
    t4_odd = round(t4_odd, 2)

    # Update data.json
    d['star_ticket_3'] = {
        'type': t3_type,
        'selections': [{k: v for k, v in s.items() if k not in ('probability','time')} for s in t3_sels],
        'total_odd': round(t3_odd, 2), 'confidence': t3_conf,
        'reasoning': f'Boleto Extra @{t3_odd:.2f}. Prioridad: probabilidad {t3_conf}%. Partidos futuros validados.',
        'recommendation_stake': 2.0
    }
    if t4_picks:
        d['star_ticket_4'] = {
            'type': 'Combinado Sonador',
            'selections': [{k: v for k, v in s.items() if k not in ('probability','time')} for s in t4_picks],
            'total_odd': t4_odd, 'confidence': 60,
            'reasoning': f'Apuesta Sonadora @{t4_odd:.2f}. {len(t4_picks)} picks de alto valor futuros.',
            'recommendation_stake': 1.0
        }

    with open('frontend/data.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

    print(f"\nT3 ({t3_type}): {[s['match'] for s in t3_sels]} @{t3_odd:.2f} conf:{t3_conf}%")
    if t4_picks:
        print(f"T4: {[s['match'] for s in t4_picks]} @{t4_odd}")
    
    # Verify no duplicates
    all_m = []
    for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
        for s in d.get(k,{}).get('selections',[]):
            all_m.append(s['match'])
    dupes = [m for m in set(all_m) if all_m.count(m)>1]
    print('Duplicados:', dupes or 'NINGUNO')
else:
    print('No hay suficientes partidos futuros con los criterios actuales.')
    print('Probando con prob>=68...')
    # Fallback with lower threshold
    for m in d.get('matches', []):
        key = f"{m['home']} vs {m['away']}"
        t = m.get('time', '')
        if any(kw in key for kw in protected_keywords):
            continue
        try:
            parts = t.split(':')
            match_hour = int(parts[0]) + int(parts[1]) / 60.0
            if match_hour > now_hour + 0.3:
                for p in m.get('picks', []):
                    if p.get('probability', 0) >= 68 and 1.10 <= p.get('odd', 0) <= 1.80:
                        print(f"  FALLBACK: {t} | {key} | {p.get('market','')} @{p.get('odd')} {p.get('probability')}%")
                        break
        except:
            pass
