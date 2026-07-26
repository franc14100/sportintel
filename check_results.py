import json
with open('frontend/data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for k in ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']:
    t = d.get(k,{})
    if t:
        sels = t.get('selections',[])
        odd = t.get('total_odd','?')
        conf = t.get('confidence','?')
        print(f'\n{k} @{odd} conf:{conf}%')
        for s in sels:
            match = s.get('match','?')
            market = s.get('market','?')
            pick = s.get('pick','?')
            sodd = s.get('odd','?')
            status = s.get('status','pending')
            print(f'  [{status}] {match} | {market} | {pick} @{sodd}')

gs = d.get('global_stats', {})
won = gs.get('total_picks_won', 0)
lost = gs.get('total_picks_lost', 0)
total = won + lost
pct = round(won/total*100) if total > 0 else 0
print(f'\nGlobal: won={won} lost={lost} accuracy={pct}%')
