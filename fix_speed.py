import re

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Optimize uncached eids per sport for speed and Vercel 15s limit
content = content.replace(
    'uncached_eids = [eid for eid in odds_dict if eid not in cache][:100]',
    'uncached_eids = [eid for eid in odds_dict if eid not in cache][:40 if api_sport == "football" else 30]'
)

# 2. Increase thread pool workers from 20 to 30 for super fast parallel requests
content = content.replace('max_workers=20', 'max_workers=30')

# 3. Lower timeout from 8 to 4 seconds to avoid Vercel serverless function timeouts
content = content.replace('timeout=8', 'timeout=4')
content = content.replace('timeout=15', 'timeout=6')

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied Vercel 15s speed optimization successfully")
