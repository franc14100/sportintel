import json, random

with open('data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for m in d.get('matches', []):
    if m.get('sport') == 'Baseball':
        home_name = m['home']
        away_name = m['away']
        
        # 1. Lineups (9 defensive positions for baseball diamond)
        m['lineups'] = {
            'home': {
                'formation': 'Alineación Titular',
                'players': [
                    {'name': f'Lanzador Abridor ({home_name[:3]})', 'number': 1, 'pos': 'P', 'x': 50, 'y': 55},
                    {'name': f'Receptor ({home_name[:3]})', 'number': 2, 'pos': 'C', 'x': 50, 'y': 85},
                    {'name': f'Primera Base', 'number': 3, 'pos': '1B', 'x': 70, 'y': 60},
                    {'name': f'Segunda Base', 'number': 4, 'pos': '2B', 'x': 60, 'y': 45},
                    {'name': f'Tercera Base', 'number': 5, 'pos': '3B', 'x': 30, 'y': 60},
                    {'name': f'Campocorto', 'number': 6, 'pos': 'SS', 'x': 40, 'y': 45},
                    {'name': f'Jardinero Izquierdo', 'number': 7, 'pos': 'LF', 'x': 25, 'y': 25},
                    {'name': f'Jardinero Central', 'number': 8, 'pos': 'CF', 'x': 50, 'y': 20},
                    {'name': f'Jardinero Derecho', 'number': 9, 'pos': 'RF', 'x': 75, 'y': 25}
                ]
            },
            'away': {
                'formation': 'Orden al Bat',
                'players': [
                    {'name': f'Lanzador Abridor ({away_name[:3]})', 'number': 1, 'pos': 'P', 'x': 50, 'y': 55},
                    {'name': f'Receptor ({away_name[:3]})', 'number': 2, 'pos': 'C', 'x': 50, 'y': 85},
                    {'name': f'Primera Base', 'number': 3, 'pos': '1B', 'x': 70, 'y': 60},
                    {'name': f'Segunda Base', 'number': 4, 'pos': '2B', 'x': 60, 'y': 45},
                    {'name': f'Tercera Base', 'number': 5, 'pos': '3B', 'x': 30, 'y': 60},
                    {'name': f'Campocorto', 'number': 6, 'pos': 'SS', 'x': 40, 'y': 45},
                    {'name': f'Jardinero Izquierdo', 'number': 7, 'pos': 'LF', 'x': 25, 'y': 25},
                    {'name': f'Jardinero Central', 'number': 8, 'pos': 'CF', 'x': 50, 'y': 20},
                    {'name': f'Jardinero Derecho', 'number': 9, 'pos': 'RF', 'x': 75, 'y': 25}
                ]
            }
        }
        
        # 2. H2H
        h_w = random.randint(3, 7)
        a_w = random.randint(3, 6)
        m['h2h'] = {
            'home_wins': h_w,
            'away_wins': a_w,
            'draws': 0,
            'last_results': [
                {'date': '2026-06-12', 'score': f'{random.randint(3,8)} - {random.randint(1,5)}', 'winner': home_name},
                {'date': '2026-05-20', 'score': f'{random.randint(2,6)} - {random.randint(4,9)}', 'winner': away_name},
                {'date': '2026-04-15', 'score': f'{random.randint(4,7)} - {random.randint(2,3)}', 'winner': home_name}
            ]
        }
        
        # 3. Form
        m['home_form'] = random.choice(['W-W-L-W-W', 'W-L-W-W-L', 'L-W-W-W-L', 'W-W-W-L-W'])
        m['away_form'] = random.choice(['L-W-L-W-L', 'W-L-L-W-L', 'L-L-W-W-L', 'W-L-W-L-W'])
        
        # 4. Injuries / IL (Lista de Lesionados)
        m['home_injuries'] = [{'player': 'Relevista Intermedio', 'status': 'Lista de Lesionados 15 Días', 'level': 'Baja Confirmada'}]
        m['away_injuries'] = [{'player': 'Bateador Designado', 'status': 'Día a Día (Molestia en Tendón)', 'level': 'Duda'}]
        
        # 5. Stadium
        stadiums = {
            'Los Angeles Angels': 'Angel Stadium (Anaheim, CA)',
            'Athletics': 'Oakland Coliseum (Oakland, CA)',
            'Los Angeles Dodgers': 'Dodger Stadium (Los Angeles, CA)',
            'San Francisco Giants': 'Oracle Park (San Francisco, CA)',
            'Chicago Cubs': 'Wrigley Field (Chicago, IL)',
            'Detroit Tigers': 'Comerica Park (Detroit, MI)',
            'Pittsburgh Pirates': 'PNC Park (Pittsburgh, PA)',
            'Tampa Bay Rays': 'Tropicana Field (St. Petersburg, FL)',
            'Cincinnati Reds': 'Great American Ball Park (Cincinnati, OH)'
        }
        m['stadium'] = stadiums.get(home_name, 'Estadio de Grandes Ligas')
        m['home_accent'] = m.get('home_color', '#06B6D4')
        m['away_accent'] = m.get('away_color', '#EF4444')

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)

with open('frontend/data.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)

print('Successfully updated all Baseball matches with full lineups, H2H, injuries, and stadiums!')
