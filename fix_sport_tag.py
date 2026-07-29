import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Force sport attribute to match current api_sport loop iteration
old_block = '''        for eid, odd_data in odds_dict.items():
            if eid not in cache:
                continue
            event_info = cache[eid]'''

new_block = '''        for eid, odd_data in odds_dict.items():
            if eid not in cache:
                continue
            event_info = cache[eid]
            event_info["sport"] = api_sport.capitalize()'''

content = content.replace(old_block, new_block)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated sport tag enforcement successfully")
