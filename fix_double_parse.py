import re

with open('api/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_parse = '''                    const parsedData = typeof jsonRes.result === 'string' ? JSON.parse(jsonRes.result) : jsonRes.result;
                    return res.status(200).json(parsedData);'''

new_parse = '''                    let parsedData = jsonRes.result;
                    while (typeof parsedData === 'string') {
                        try { parsedData = JSON.parse(parsedData); } catch (e) { break; }
                    }
                    return res.status(200).json(parsedData);'''

content = content.replace(old_parse, new_parse)

with open('api/data.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    bg_content = f.read()

old_kv2 = '''            # Convertimos el diccionario a texto JSON string válido para Upstash REST SET
            raw_str = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
            json_data = json.dumps(raw_str)
            
            req = urllib.request.Request(request_url, data=json_data.encode('utf-8'), headers={'''

new_kv2 = '''            # Convertimos el diccionario a texto JSON string válido para Upstash REST SET
            raw_str = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
            
            req = urllib.request.Request(request_url, data=raw_str.encode('utf-8'), headers={'''

bg_content = bg_content.replace(old_kv2, new_kv2)

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(bg_content)

print("Updated recursive JSON parsing in api/data.js successfully")
