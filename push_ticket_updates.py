import urllib.request
import json

# Update via the new update_tickets endpoint
payload = {
    "action": "update_tickets",
    "status_updates": [
        {
            "ticket_id": "TK-309298",
            "status": "lost",
            "selections_status": ["lost", "lost", "lost"]
        },
        {
            "ticket_id": "TK-174281",
            "status": "lost",
            "selections_status": ["lost", "lost"]
        },
        {
            "ticket_id": "TK-556933",
            "status": "lost",
            "selections_status": ["lost", "lost"]
        },
        {
            "ticket_id": "TK-545162",
            "status": "lost",
            "selections_status": ["lost", "lost", "lost"]
        }
    ],
    "new_tickets": [
        {
            "date": "2026-07-30",
            "ticket_id": "FOTO-001",
            "name": "Boleto Estrella 1 - Seguro",
            "type": "Combinado",
            "selections": [
                {
                    "match": "KRC Gent - LNZ",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total Individual)",
                    "pick": "Total Individual Mas de 5.5 Corners",
                    "odd": 1.35,
                    "status": "lost"
                },
                {
                    "match": "Independiente - Newell Old Boys",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total Individual)",
                    "pick": "Total Individual Mas de 5.5 Corners",
                    "odd": 1.36,
                    "status": "lost"
                }
            ],
            "total_odd": 1.835,
            "confidence": 72,
            "recommendation_stake": 4,
            "status": "lost"
        },
        {
            "date": "2026-07-30",
            "ticket_id": "FOTO-002",
            "name": "Boleto Estrella 2 - Valor",
            "type": "Combinado",
            "selections": [
                {
                    "match": "Auda - FCSB",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total)",
                    "pick": "Total Mas de 4.5 Corners",
                    "odd": 1.35,
                    "status": "lost"
                },
                {
                    "match": "Ludogorets 1945 - Hapoel Tel Aviv",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total)",
                    "pick": "Total Mas de 4.5 Corners",
                    "odd": 1.35,
                    "status": "lost"
                }
            ],
            "total_odd": 1.818,
            "confidence": 70,
            "recommendation_stake": 4,
            "status": "lost"
        },
        {
            "date": "2026-07-30",
            "ticket_id": "FOTO-003",
            "name": "Boleto Extra del Dia",
            "type": "Combinado",
            "selections": [
                {
                    "match": "Jablonec - NK Varazdin",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total)",
                    "pick": "Total Mas de 4.5 Corners",
                    "odd": 1.25,
                    "status": "lost"
                },
                {
                    "match": "Nordsjaelland - GAIS",
                    "sport": "Football",
                    "market": "Saques de Esquina (Total)",
                    "pick": "Total Mas de 4.5 Corners",
                    "odd": 1.24,
                    "status": "lost"
                }
            ],
            "total_odd": 1.549,
            "confidence": 68,
            "recommendation_stake": 4,
            "status": "lost"
        }
    ]
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    'https://sportintel-alpha.vercel.app/api/data',
    data=data,
    headers={
        'Content-Type': 'application/json',
        'Content-Length': str(len(data))
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=15) as res:
        result = json.loads(res.read().decode('utf-8'))
        print("SUCCESS:", result)
except Exception as e:
    print("ERROR:", e)
