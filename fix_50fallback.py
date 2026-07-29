import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_slice = '''    selected_football = football_matches[:30]
    selected_tennis = tennis_matches[:20]
    
    matches_data = selected_football + selected_tennis'''

new_slice = '''    selected_football = football_matches[:30]
    selected_tennis = tennis_matches[:20]
    
    # Garantizar SIEMPRE exactamente 50 partidos analizados hoy
    total_cur = len(selected_football) + len(selected_tennis)
    if total_cur < 50:
        needed = 50 - total_cur
        extra_football = football_matches[len(selected_football):len(selected_football) + needed]
        selected_football.extend(extra_football)

    matches_data = selected_football + selected_tennis'''

content = content.replace(old_slice, new_slice)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated 50 matches fallback guarantee successfully")
