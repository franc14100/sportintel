import re

for filepath in ['main.js', 'frontend/main.js']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix string literal
    content = content.replace(
        "console.log([AutoGen] Detectados datos desactualizados ( vs ). Generando pronósticos de hoy...);",
        "console.log('[AutoGen] Detectados datos desactualizados. Generando pronósticos de hoy...');"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed console.log syntax")
