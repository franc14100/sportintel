import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
    'x-rapidapi-key': '0fc0ba8109mshc0a96d4fddda16ep197aeajsncc7e2400156e'
}

endpoints = [
    '/api/v1/events/schedule/2026-07-24',
    '/api/v1/events/2026-07-24',
    '/api/v1/sport/football/events/2026-07-24',
    '/api/v1/matches/2026-07-24',
    '/api/v1/sport/football/matches/2026-07-24',
    '/api/v1/fixtures/2026-07-24',
    '/api/v1/sport/football/fixtures/2026-07-24',
    '/api/v1/events/date/2026-07-24',
    '/api/v1/sport/football/events/date/2026-07-24',
    '/api/v1/sport/football/scheduled-events/2026-07-24'
]

for ep in endpoints:
    try:
        url = 'https://sportapi7.p.rapidapi.com' + ep
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            print(f'SUCCESS: {ep} - {response.status}')
    except Exception as e:
        print(f'FAILED: {ep} - {e}')
