import json, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.load(open('../frontend/data.json', encoding='utf-8'))

# Mostrar picks de un partido con datos reales
matches_with_odds = [x for x in data['matches'] if x.get('real_odds')]
for match in matches_with_odds[:3]:
    ro = match['real_odds']
    print(f"Partido: {match['home']} vs {match['away']}")
    print(f"  Goals API: 1.5={ro.get('over_1.5')}/{ro.get('under_1.5')}  2.5={ro.get('over_2.5')}/{ro.get('under_2.5')}  3.5={ro.get('over_3.5')}/{ro.get('under_3.5')}")
    print(f"  BTTS: yes={ro.get('btts_yes')} no={ro.get('btts_no')}")
    corners_keys = [k for k in ro if 'corners' in k]
    if corners_keys:
        print(f"  Corners: {[(k, ro[k]) for k in corners_keys[:4]]}")
    print(f"  AH: home={ro.get('ah_home')} away={ro.get('ah_away')} line={ro.get('ah_line')}")
    for p in match.get('picks', []):
        mkt = p.get('market', '')
        if any(k in mkt for k in ['Goles', 'Cornes', 'rners', 'Ambos', 'ndicap']):
            vft = p.get('valid_for_ticket', '?')
            print(f"  -> {mkt} | {p['selection']} @ {p['odd']} ({p.get('probability','?')}%) valid={vft}")
    print()

# Boletos del dia
for k in ['star_ticket_1', 'star_ticket_2']:
    t = data.get(k, {})
    if t:
        print(f"BOLETO {k[-1]} - {t.get('type')} @ {t.get('total_odd')}")
        for s in t.get('selections', []):
            print(f"  {s['match']} | {s['market']} | {s['pick']} @ {s['odd']}")
        print()
