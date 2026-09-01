import urllib.request, json
url_ger = 'https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard'
url_ita = 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard'
url_ita_all = 'https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard'

def fetch_events(url, team):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode())
        found = False
        for ev in data.get('events', []):
            if team.lower() in ev['name'].lower():
                print(f"Match: {ev['name']}")
                print(f"Status: {ev['status']['type']['detail']}")
                for comp in ev['competitions'][0]['competitors']:
                    print(f"{comp['team']['name']}: {comp['score']}")
                found = True
        if not found:
            # Maybe the match is in a different league/cup or the name is slightly different
            pass
    except Exception as e:
        print('Error:', e)

print("=== RESULTADOS BUNDESLIGA ===")
fetch_events(url_ger, 'dortmund')
fetch_events('https://site.api.espn.com/apis/site/v2/sports/soccer/ger.2/scoreboard', 'dortmund')
print("=== RESULTADOS SERIE A ===")
fetch_events(url_ita, 'juventus')
fetch_events(url_ita, 'parma')
