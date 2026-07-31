module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            return res.status(200).json({ saved: false, w: 'No Redis config' });
        }
        
        const baseUrl = kvUrl.replace(/\/$/, '');

        if (req.method === 'GET') {
            const getRes = await fetch(`${baseUrl}/get/sportintel_sync`, {
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });
            if (getRes.ok) {
                const jsonRes = await getRes.json();
                if (jsonRes.result) {
                    let parsedData = jsonRes.result;
                    while (typeof parsedData === 'string') {
                        try { parsedData = JSON.parse(parsedData); } catch (e) { break; }
                    }
                    return res.status(200).json(parsedData);
                }
            }
            return res.status(200).json({});
        }

        if (req.method === 'POST') {
            const raw = req.body || {};
            const stateObj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const incomingTs = parseInt(stateObj.sync_ts || stateObj.ts || '0');

            // --- PROTECCIÓN CLAVE: Leer datos actuales en nube antes de sobreescribir ---
            const currentRes = await fetch(`${baseUrl}/get/sportintel_sync`, {
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            if (currentRes.ok) {
                const currentJson = await currentRes.json();
                if (currentJson.result) {
                    let currentData = currentJson.result;
                    while (typeof currentData === 'string') {
                        try { currentData = JSON.parse(currentData); } catch (e) { break; }
                    }
                    const cloudTs = parseInt(currentData.sync_ts || currentData.ts || '0');

                    // Si la nube tiene datos MÁS NUEVOS, rechazar escritura y devolver los datos actuales
                    if (cloudTs > incomingTs) {
                        console.log(`[Sync] Rejected: Cloud ts ${cloudTs} > Incoming ts ${incomingTs}`);
                        return res.status(200).json({ newer: currentData });
                    }

                    // Extraer los arrays independientemente del esquema antiguo/nuevo
                    let currentUb = currentData.userBets || currentData.ub;
                    let incomingUb = stateObj.userBets || stateObj.ub;

                    // Si la nube tiene datos IGUALES O MÁS ANTIGUOS, fusionar: preservar apuestas antiguas
                    if (!stateObj.force_override && currentUb && Array.isArray(currentUb) && incomingUb && Array.isArray(incomingUb)) {
                        // Combinar apuestas sin duplicados (por id)
                        const mergedBetsMap = {};
                        [...currentUb, ...incomingUb].forEach(bet => {
                            if (bet && bet.id) mergedBetsMap[bet.id] = bet;
                        });
                        
                        // Guardar en el formato entrante
                        if (stateObj.userBets) {
                            stateObj.userBets = Object.values(mergedBetsMap);
                        } else {
                            stateObj.ub = Object.values(mergedBetsMap);
                            stateObj.user_bets = JSON.stringify(stateObj.ub);
                        }
                    }
                }
            }

            // Truncar historial si es muy largo
            let incHistory = stateObj.history || stateObj.eh;
            if (incHistory) {
                try {
                    const arr = typeof incHistory === 'string' ? JSON.parse(incHistory) : incHistory;
                    if (Array.isArray(arr) && arr.length > 50) {
                        if (stateObj.history) stateObj.history = arr.slice(-50);
                        if (stateObj.eh) stateObj.eh = arr.slice(-50);
                    }
                } catch (_) {}
            }

            const setRes = await fetch(`${baseUrl}/set/sportintel_sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${kvToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(stateObj)
            });

            if (setRes.ok) {
                return res.status(200).json({ saved: true });
            } else {
                return res.status(200).json({ saved: false, w: setRes.status });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        return res.status(200).json({ saved: false, w: String(err.message) });
    }
};
