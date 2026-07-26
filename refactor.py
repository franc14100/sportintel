import sys

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Duplicate star_ticket_2 logic for star_ticket_3
idx_start = content.find('    # Generar Boleto Estrella 2')
idx_end = content.find('    # ═══════════════════════════════════════════════════════════════════════\n    # ENFORCEMENT DE CUOTA MÍNIMA')
if idx_start == -1 or idx_end == -1:
    print('Could not find block 2')
    sys.exit(1)

block2 = content[idx_start:idx_end]
block3 = block2.replace('Boleto Estrella 2', 'Boleto Estrella 3').replace('_2', '_3').replace('Boleto 2', 'Boleto 3')

# We need to update unused_picks for block 3 to also exclude used_matches from ticket 2
block3 = block3.replace('used_matches = set(s["match"] for s in star_selections_1)', 'used_matches = set(s["match"] for s in star_selections_1) | set(s["match"] for s in star_selections_2)')

# 2. Update enforce_min_odd to handle ticket 3
enforce_start = content.find('    used_b2 = set(s[\'match\'] for s in star_selections_2) | used_b1')
enforce_end = content.find('    # Generar Boleto Estrella 3 (Apuesta Soñadora')
if enforce_start == -1 or enforce_end == -1:
    print('Could not find enforce block')
    sys.exit(1)

enforce_b3 = """
    used_b3 = set(s['match'] for s in star_selections_3) | used_b2
    star_selections_3, ticket_type_3, total_odd_3, star_confidence_3, star_reasoning_3 = enforce_min_odd(
        star_selections_3, ticket_type_3, total_odd_3, star_confidence_3, star_reasoning_3,
        all_picks_for_upgrade, used_b2
    )
"""
# 3. Rename Soñadora from 3 to 4
sonadora_start = content.find('    # Generar Boleto Estrella 3 (Apuesta Soñadora')
json_start = content.find('        "star_ticket_1": {')
if sonadora_start == -1 or json_start == -1:
    print('Could not find sonadora block')
    sys.exit(1)

sonadora_block = content[sonadora_start:json_start]
new_sonadora_block = sonadora_block.replace('Boleto Estrella 3', 'Boleto Estrella 4').replace('_3', '_4')

new_content = content[:idx_end] + block3 + content[idx_end:enforce_end] + enforce_b3 + '\n' + new_sonadora_block + content[json_start:]

# 4. Update the JSON dict output
json_block_old = """        "star_ticket_3": {
            "type": ticket_type_3,
            "selections": star_selections_3,
            "total_odd": round(total_odd_3, 2),
            "confidence": star_confidence_3,
            "reasoning": star_reasoning_3,
            "recommendation_stake": calculate_dynamic_stake(star_confidence_3, total_odd_3, 3)
        },"""
json_block_new = """        "star_ticket_3": {
            "type": ticket_type_3,
            "selections": star_selections_3,
            "total_odd": round(total_odd_3, 2),
            "confidence": star_confidence_3,
            "reasoning": star_reasoning_3,
            "recommendation_stake": calculate_dynamic_stake(star_confidence_3, total_odd_3, 3)
        },
        "star_ticket_4": {
            "type": ticket_type_4,
            "selections": star_selections_4,
            "total_odd": round(total_odd_4, 2),
            "confidence": star_confidence_4,
            "reasoning": star_reasoning_4,
            "recommendation_stake": calculate_dynamic_stake(star_confidence_4, total_odd_4, 4)
        },"""
new_content = new_content.replace(json_block_old, json_block_new)

# 5. Fix PERSISTENCE LOCK section which references star_selections_1,2,3
lock_block_old = """        lock1 = validate_and_refresh_ticket(prev_state.get("star_ticket_1", {}).get("selections", []), all_matches)
        lock2 = validate_and_refresh_ticket(prev_state.get("star_ticket_2", {}).get("selections", []), all_matches)
        lock3 = validate_and_refresh_ticket(prev_state.get("star_ticket_3", {}).get("selections", []), all_matches)
        
        if lock1[0]:
            star_selections_1, ticket_type_1, total_odd_1 = lock1[1], prev_state["star_ticket_1"]["type"], lock1[2]
            star_confidence_1, star_reasoning_1 = prev_state["star_ticket_1"]["confidence"], prev_state["star_ticket_1"]["reasoning"]
        if lock2[0]:
            star_selections_2, ticket_type_2, total_odd_2 = lock2[1], prev_state["star_ticket_2"]["type"], lock2[2]
            star_confidence_2, star_reasoning_2 = prev_state["star_ticket_2"]["confidence"], prev_state["star_ticket_2"]["reasoning"]
        if lock3[0]:
            star_selections_3, ticket_type_3, total_odd_3 = lock3[1], prev_state["star_ticket_3"]["type"], lock3[2]
            star_confidence_3, star_reasoning_3 = prev_state["star_ticket_3"]["confidence"], prev_state["star_ticket_3"]["reasoning"]
"""
lock_block_new = """        lock1 = validate_and_refresh_ticket(prev_state.get("star_ticket_1", {}).get("selections", []), all_matches)
        lock2 = validate_and_refresh_ticket(prev_state.get("star_ticket_2", {}).get("selections", []), all_matches)
        lock3 = validate_and_refresh_ticket(prev_state.get("star_ticket_3", {}).get("selections", []), all_matches)
        lock4 = validate_and_refresh_ticket(prev_state.get("star_ticket_4", {}).get("selections", []), all_matches)
        
        if lock1[0]:
            star_selections_1, ticket_type_1, total_odd_1 = lock1[1], prev_state["star_ticket_1"]["type"], lock1[2]
            star_confidence_1, star_reasoning_1 = prev_state["star_ticket_1"]["confidence"], prev_state["star_ticket_1"]["reasoning"]
        if lock2[0]:
            star_selections_2, ticket_type_2, total_odd_2 = lock2[1], prev_state["star_ticket_2"]["type"], lock2[2]
            star_confidence_2, star_reasoning_2 = prev_state["star_ticket_2"]["confidence"], prev_state["star_ticket_2"]["reasoning"]
        if lock3[0]:
            star_selections_3, ticket_type_3, total_odd_3 = lock3[1], prev_state["star_ticket_3"]["type"], lock3[2]
            star_confidence_3, star_reasoning_3 = prev_state["star_ticket_3"]["confidence"], prev_state["star_ticket_3"]["reasoning"]
        if lock4[0]:
            star_selections_4, ticket_type_4, total_odd_4 = lock4[1], prev_state.get("star_ticket_4", {}).get("type", "Combinado Soñador"), lock4[2]
            star_confidence_4, star_reasoning_4 = prev_state.get("star_ticket_4", {}).get("confidence", 50), prev_state.get("star_ticket_4", {}).get("reasoning", "")
"""
new_content = new_content.replace(lock_block_old, lock_block_new)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('OK - modifications done')
