import json
import subprocess
import sys

# 1. Backup
try:
    with open('frontend/data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        backup1 = data.get('star_ticket_1')
        backup2 = data.get('star_ticket_2')
except Exception as e:
    print('Failed to backup:', e)
    sys.exit(1)

# 2. Run data_generator
print('Running data_generator.py...')
result = subprocess.run(['python', 'backend/data_generator.py'], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print('Generator failed:', result.stderr)
    sys.exit(1)

# 3. Restore
try:
    with open('frontend/data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if backup1:
        data['star_ticket_1'] = backup1
    if backup2:
        data['star_ticket_2'] = backup2
        
    with open('frontend/data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('Restore successful')
except Exception as e:
    print('Failed to restore:', e)
