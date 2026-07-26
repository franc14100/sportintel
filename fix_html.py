with open('frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Rename existing ticket 3 (Soñadora) to ticket 4
block_3_start = content.find('<!-- Ticket 3: Soñadora -->')
block_3_end = content.find('                    </div>\n\n                    <!-- Column 2: Performance Chart & AI Stats -->')
if block_3_start == -1 or block_3_end == -1:
    print('Failed to find block 3')
    exit(1)

soñadora_block = content[block_3_start:block_3_end]
soñadora_block = soñadora_block.replace('Ticket 3: Soñadora', 'Ticket 4: Soñadora')
soñadora_block = soñadora_block.replace('-3', '-4')
soñadora_block = soñadora_block.replace('ESTRELLA 3', 'ESTRELLA 4')

# Create a new Ticket 3 (Orange) by copying Ticket 2
block_2_start = content.find('<!-- Ticket 2: Valor -->')
block_2_end = block_3_start

ticket2_block = content[block_2_start:block_2_end]
ticket3_block = ticket2_block.replace('Ticket 2', 'Ticket 3')
ticket3_block = ticket3_block.replace('-2', '-3')
ticket3_block = ticket3_block.replace('ESTRELLA 2: DE VALOR', 'ESTRELLA 3: COMBINADA EXTRA')
ticket3_block = ticket3_block.replace('Boleto de Valor (Cuota Alta)', 'Boleto Combinado Extra')
ticket3_block = ticket3_block.replace('var(--accent-cyan)', 'var(--accent-orange)')
ticket3_block = ticket3_block.replace('bg-cyan', 'bg-orange')
ticket3_block = ticket3_block.replace('rgba(6,182,212,0.15)', 'rgba(249,115,22,0.15)')
ticket3_block = ticket3_block.replace('rgba(6,182,212,0.3)', 'rgba(249,115,22,0.3)')
ticket3_block = ticket3_block.replace('rgba(6, 182, 212, 0.05)', 'rgba(249,115,22,0.05)')

new_content = content[:block_2_end] + ticket3_block + soñadora_block + content[block_3_end:]

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('HTML replaced successfully.')
