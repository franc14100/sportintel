import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_kv = '''            # Convertimos el diccionario a texto JSON
            json_data = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
            
            req = urllib.request.Request(request_url, data=json_data.encode('utf-8'), headers={'''

new_kv = '''            # Convertimos el diccionario a texto JSON string válido para Upstash REST SET
            raw_str = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
            json_data = json.dumps(raw_str)
            
            req = urllib.request.Request(request_url, data=json_data.encode('utf-8'), headers={'''

content = content.replace(old_kv, new_kv)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Upstash REST SET format successfully")
