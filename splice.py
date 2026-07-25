with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open('backend/new_fetch.py', 'r', encoding='utf-8') as f:
    new_fetch = f.readlines()
new_lines = lines[:17] + new_fetch + lines[368:]
with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
