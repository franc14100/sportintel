import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Ensure sport attribute is always properly capitalized when adding to fetched_matches
content = content.replace(
    '"sport": event_info.get("sport", "Football")',
    '"sport": str(event_info.get("sport", "Football")).capitalize()'
)

# Fix 2: Case-insensitive filtering for football and tennis matches
content = content.replace(
    "football_matches = [m for m in matches_data if m.get('sport') == 'Football']",
    "football_matches = [m for m in matches_data if str(m.get('sport', '')).lower() == 'football']"
)

content = content.replace(
    "tennis_matches = [m for m in matches_data if m.get('sport') == 'Tennis']",
    "tennis_matches = [m for m in matches_data if str(m.get('sport', '')).lower() == 'tennis']"
)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Tennis sport case sensitivity bug successfully")
