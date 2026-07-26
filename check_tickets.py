import json, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open('frontend/data.json', encoding='utf-8'))
for k in ['star_ticket_1', 'star_ticket_2']:
    t = data.get(k, {})
    if t:
        total = round(t.get('total_odd',0),2)
        ok = 'OK' if total >= 1.50 else 'BAJO @1.50!'
        print(f"BOLETO {k[-1]} [{ok}] - {t.get('type')} @ {total} | Confianza: {t.get('confidence')}%")
        for s in t.get('selections', []):
            print(f"  {s['match']}  |  {s['market']} -> {s['pick']} @{s['odd']}")
        print()
    else:
        print(f"BOLETO {k[-1]} - NO generado")
