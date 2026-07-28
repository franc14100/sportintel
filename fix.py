import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''    # Boleto Estrella 2 (Valor)
    new_ticket_2 = {
        "date": date_str,
        "ticket_id": f"TK-{random.randint(100000, 999999)}",
        "name": "Boleto de Valor (Boleto 2)",
        "selections": [dict(s, status="pending") for s in star_selections_2],
        "total_odd": round(total_odd_2, 2),
        "confidence": star_confidence_2,
        "recommendation_stake": calculate_dynamic_stake(star_confidence_2, total_odd_2, 2),
        "status": "pending"
    }

    # Boleto Estrella 3 (Extra)
    new_ticket_3 = {
        "date": date_str,
        "ticket_id": f"TK-{random.randint(100000, 999999)}",
        "name": "Boleto Extra (Boleto 3)",
        "selections": [dict(s, status="pending") for s in star_selections_3],
        "total_odd": round(total_odd_3, 2),
        "confidence": star_confidence_3,
        "recommendation_stake": calculate_dynamic_stake(star_confidence_3, total_odd_3, 3),
        "status": "pending"
    }

    # Boleto Estrella 4 (Soñadora)
    new_ticket_4 = {
        "date": date_str,
        "ticket_id": f"TK-{random.randint(100000, 999999)}",
        "name": "Apuesta Soñadora (Boleto 4)",
        "selections": [dict(s, status="pending") for s in star_selections_4],
        "total_odd": round(total_odd_4, 2),
        "confidence": star_confidence_4,
        "recommendation_stake": calculate_dynamic_stake(star_confidence_4, total_odd_4, 4),
        "status": "pending"
    }

    # Evitar duplicados del mismo día: conservar boletos de hoy si ya existían para mantener fijos los IDs y selecciones
    today_tickets_exist = any(t.get("date") == date_str for t in historical_registry)
    if not today_tickets_exist:
        historical_registry.append(new_ticket_1)
        historical_registry.append(new_ticket_2)
        if star_selections_3:
            historical_registry.append(new_ticket_3)
        if star_selections_4:
            historical_registry.append(new_ticket_4)
    
    # Mantener el registro compacto (Últimos 30 boletos recomendados)
    historical_registry = historical_registry[-30:]'''

content = re.sub(r'    # Boleto Estrella 2 \(Valor\).*?historical_registry = historical_registry\[-30:\]', replacement, content, flags=re.DOTALL)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
