import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Increase uncached eids limit from 40 to 100
content = content.replace('[:40]', '[:100]')

# 2. Update allowed_entries limit per sport
content = content.replace('allowed_entries = allowed_entries[:35]', 'allowed_entries = allowed_entries[:35] if api_sport == "football" else allowed_entries[:25]')

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated match count limits in data_generator.py successfully")
