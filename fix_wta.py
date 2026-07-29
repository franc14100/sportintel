import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_youth = '''            # Excluir juveniles/reservas
            import re
            is_youth = any(re.search(r'\\b' + re.escape(ex) + r'\\b', lg_lower) for ex in EXCLUDED_PATTERNS)
            if is_youth:
                continue'''

new_youth = '''            # Excluir juveniles/reservas (en Tenis permitir WTA Women)
            import re
            if api_sport.lower() == 'tennis':
                tennis_excluded = ["u19", "u20", "u21", "sub-19", "sub-20", "sub-21", "junior"]
                is_youth = any(re.search(r'\\b' + re.escape(ex) + r'\\b', lg_lower) for ex in tennis_excluded)
            else:
                is_youth = any(re.search(r'\\b' + re.escape(ex) + r'\\b', lg_lower) for ex in EXCLUDED_PATTERNS)
            if is_youth:
                continue'''

content = content.replace(old_youth, new_youth)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated tennis youth filtering successfully")
