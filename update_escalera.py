import re

for filepath in ['main.js', 'frontend/main.js']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_func = '''    function getSafestPicksOfTheDay() {
        if (!appData || !appData.matches) return [];

        let allPicks = [];
        appData.matches.forEach(match => {
            match.picks.forEach(pick => {
                if (pick.market !== "Se Clasifica" && pick.market !== "Método de Clasificación") {
                    // Extract probability number safely
                    let prob = 70;
                    if (typeof pick.probability === 'number') {
                        prob = pick.probability;
                    } else if (typeof pick.probability === 'string') {
                        prob = parseFloat(pick.probability) || 70;
                    }
                    allPicks.push({ match, pick: { ...pick, probability: prob } });
                }
            });
        });

        // Reto Escalera sweet spot odds: @1.22 - @1.60
        let candidates = allPicks.filter(item => item.pick.odd >= 1.22 && item.pick.odd <= 1.65);
        if (candidates.length < 3) {
            candidates = allPicks.filter(item => item.pick.odd >= 1.18 && item.pick.odd <= 1.85);
        }
        if (candidates.length < 3) {
            candidates = allPicks;
        }

        // Prioridad absoluta a la probabilidad más alta (hacia 90%+)
        candidates.sort((a, b) => {
            if (b.pick.probability !== a.pick.probability) {
                return b.pick.probability - a.pick.probability;
            }
            return b.pick.odd - a.pick.odd;
        });

        let uniqueCandidates = [];
        let seenMatches = new Set();
        for (let c of candidates) {
            if (!seenMatches.has(c.match.id)) {
                seenMatches.add(c.match.id);
                uniqueCandidates.push(c);
                if (uniqueCandidates.length === 3) break;
            }
        }

        return uniqueCandidates;
    }'''

    content = re.sub(r'function getSafestPicksOfTheDay\(\) \{.*?return uniqueCandidates;\s*\}', new_func, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated Reto Escalera pick selection logic successfully")
