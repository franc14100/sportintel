with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update VALUE_MIN to 1.30
content = content.replace('VALUE_MIN = 1.22', 'VALUE_MIN = 1.30')

# 2. Update enforce_min_odd logic to loop and guarantee >= 1.50
old_enforce = '''    def enforce_min_odd(selections, ticket_type, total_odd, confidence, reasoning, all_picks, used_matches_set):
        if total_odd >= 1.50:
            return selections, ticket_type, total_odd, confidence, reasoning
        # La cuota está por debajo de 1.50 - buscar un pick adicional para combinarlo
        if not selections:
            return selections, ticket_type, total_odd, confidence, reasoning
        current_odd = total_odd
        # Excluir los partidos ya en este boleto + los usados en otros boletos
        already_used = set(s['match'] for s in selections) | used_matches_set
        complement = None
        best_target = 0
        for p in all_picks:
            if p['match'] in already_used:
                continue
            combo = round(current_odd * p['odd'], 2)
            if combo >= 1.50 and (complement is None or abs(combo - 1.65) < abs(best_target - 1.65)):
                complement = p
                best_target = combo
        if complement:
            ticket_type = 'Combinado'
            new_total = round(current_odd * complement['odd'], 2)
            selections.append({
                'match': complement['match'],
                'sport': complement['sport'],
                'market': complement['market'],
                'pick': complement['selection'],
                'odd': complement['odd'],
                'reasoning': complement['reasoning'].get('tactical', '') if isinstance(complement['reasoning'], dict) else complement['reasoning']
            })
            confidence = int((confidence + complement['probability']) / 2)
            reasoning = (f"?? Combinado para cuota mínima @{new_total:.2f}. "
                         f"Se añadió {complement['match']} ({complement['market']}) "
                         f"para que el boleto supere el mínimo de valor de @1.50.")
            return selections, ticket_type, new_total, confidence, reasoning
        return selections, ticket_type, total_odd, confidence, reasoning'''

new_enforce = '''    def enforce_min_odd(selections, ticket_type, total_odd, confidence, reasoning, all_picks, used_matches_set):
        if total_odd >= 1.50 or not selections:
            return selections, ticket_type, total_odd, confidence, reasoning

        already_used = set(s['match'] for s in selections) | used_matches_set
        current_odd = total_odd

        # Loop adding picks until total_odd >= 1.50
        while current_odd < 1.50:
            best_p = None
            best_score = -1
            for p in all_picks:
                if p['match'] in already_used:
                    continue
                # Preference for picks that bring us closest to @1.50 - @1.85
                prob = p.get('probability', 60)
                odd = p.get('odd', 1.25)
                score = prob * odd
                if score > best_score:
                    best_score = score
                    best_p = p
            
            if not best_p:
                # If pool exhausted, search without used_matches_set constraint
                for p in all_picks:
                    if p['match'] not in set(s['match'] for s in selections):
                        best_p = p
                        break
            
            if not best_p:
                break

            already_used.add(best_p['match'])
            ticket_type = 'Combinado'
            current_odd = round(current_odd * best_p['odd'], 2)
            selections.append({
                'match': best_p['match'],
                'sport': best_p['sport'],
                'market': best_p['market'],
                'pick': best_p['selection'],
                'odd': best_p['odd'],
                'reasoning': best_p['reasoning'].get('tactical', '') if isinstance(best_p['reasoning'], dict) else best_p['reasoning']
            })
            confidence = int((confidence + best_p['probability']) / 2)
            reasoning = f"?? Combinado de protección. Se agregó {best_p['match']} para asegurar cuota total >= @1.50 (Cuota Final: @{current_odd:.2f})."

        return selections, ticket_type, current_odd, confidence, reasoning'''

if 'def enforce_min_odd' in content:
    import re
    content = re.sub(r'    def enforce_min_odd\(.*?\n        return selections, ticket_type, total_odd, confidence, reasoning', new_enforce, content, flags=re.DOTALL)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Enforced min odd 1.50 successfully")
