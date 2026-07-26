import sys

with open('backend/data_generator.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of "Generar Boleto Estrella 3" block
t3_start = None
for i, l in enumerate(lines):
    if '# Generar Boleto Estrella 3 (Boleto de Valor' in l:
        t3_start = i
        break

# Find the end: it's right before "# ═══ ENFORCEMENT DE CUOTA MÍNIMA"
t3_end = None
for i, l in enumerate(lines[t3_start:], start=t3_start):
    if '# ENFORCEMENT DE CUOTA M' in l:
        t3_end = i
        break

if t3_start is None or t3_end is None:
    print(f'Could not find blocks. t3_start={t3_start}, t3_end={t3_end}')
    sys.exit(1)

print(f'Ticket 3 block: lines {t3_start+1} to {t3_end}')

# Extract ticket 3 generation block
t3_block = lines[t3_start:t3_end]

# Also need to extract enforce_min_odd call for t3 from after enforce function def
# Find "used_b3 = set(s['match']..."
b3_enforce_start = None
b3_enforce_end = None
for i, l in enumerate(lines):
    if "used_b3 = set(s['match']" in l:
        b3_enforce_start = i
        b3_enforce_end = i + 5  # 5 lines
        break

if b3_enforce_start is None:
    print('Could not find b3 enforce block')
    sys.exit(1)

print(f'B3 enforce block: lines {b3_enforce_start+1} to {b3_enforce_end}')

# Extract enforce calls
b3_enforce_block = lines[b3_enforce_start:b3_enforce_end]

# Find where persistence lock ends — right after st3 block for boleto 4
# Look for the line "    total_won = previous_data.get..."
lock_end = None
for i, l in enumerate(lines):
    if 'total_won = previous_data.get' in l and i > 2300:
        lock_end = i
        break

if lock_end is None:
    print('Could not find lock end')
    sys.exit(1)

print(f'Lock ends at line {lock_end+1}')

# Now build new file:
# 1. Keep lines up to t3_start (Boleto 1 & 2 generation)
# 2. Remove the t3_block (lines t3_start to t3_end)
# 3. Keep lines from t3_end to b3_enforce_start (enforce function def + b1, b2 enforce calls)  
# 4. Remove b3_enforce_block
# 5. Keep lines from b3_enforce_end to lock_end (Soñadora gen + persistence lock)
# 6. Insert the t3 generation block + b3 enforce block HERE (after lock)
# 7. Keep rest of file

new_lines = []
new_lines += lines[:t3_start]                   # everything before ticket 3 block
new_lines += lines[t3_end:b3_enforce_start]      # after t3, up to b3 enforce
new_lines += lines[b3_enforce_end:lock_end]      # after b3 enforce, up to lock end (Soñadora + lock)

# Insert ticket 3 generation AFTER the lock
new_lines += ['\n', '    # === GENERAR BOLETO 3 DESPUÉS DEL LOCK (para leer T1 y T2 finales) ===\n']
new_lines += t3_block                            # ticket 3 generation code
new_lines += b3_enforce_block                    # enforce min odd for ticket 3

new_lines += lines[lock_end:]                    # rest of file

with open('backend/data_generator.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Refactor complete. New file has', len(new_lines), 'lines.')
