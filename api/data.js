const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        // 1. Extraemos las credenciales de Upstash Redis desde Vercel
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        if (req.method === "POST") {
            const body = req.body || {};
            if (body.action === "reset_stats") {
                if (kvUrl && kvToken) {
                    const baseUrl = kvUrl.replace(/\/$/, "");
                    // Obtener data actual
                    const getRes = await fetch(`${baseUrl}/get/sportintel_data`, {
                        headers: { 'Authorization': `Bearer ${kvToken}` }
                    });
                    let currentData = {};
                    if (getRes.ok) {
                        const jsonRes = await getRes.json();
                        if (jsonRes.result) {
                            currentData = typeof jsonRes.result === 'string' ? JSON.parse(jsonRes.result) : jsonRes.result;
                        }
                    }
                    // Resetear historiales y estadísticas
                    currentData.historical_tickets_registry = [];
                    currentData.global_stats = {
                        total_picks_won: 0,
                        total_picks_lost: 0,
                        avg_accuracy_40d: 0,
                        roi_percentage: 0
                    };
                    
                    // Guardar de nuevo en Upstash Redis
                    const setRes = await fetch(`${baseUrl}/set/sportintel_data`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${kvToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(currentData)
                    });
                    
                    if (setRes.ok) {
                        return res.status(200).json({ success: true, message: "Estadísticas reiniciadas correctamente" });
                    }
                }
                return res.status(200).json({ success: true, message: "Reinicio local completado" });
            }
        }

        // 2. Siempre leemos el archivo estático que tiene los partidos frescos de GitHub Actions
        const dataPath = path.join(process.cwd(), 'frontend', 'data.json');
        const raw = fs.readFileSync(dataPath, 'utf-8');
        let data = JSON.parse(raw);

        // 3. Intentamos buscar las ESTADISTICAS en la base de datos Upstash
        if (kvUrl && kvToken) {
            const baseUrl = kvUrl.replace(/\/$/, "");
            const response = await fetch(`${baseUrl}/get/sportintel_data`, {
                headers: {
                    'Authorization': `Bearer ${kvToken}`
                }
            });

            if (response.ok) {
                const jsonRes = await response.json();
                if (jsonRes.result) {
                    let parsedData = jsonRes.result;
                    while (typeof parsedData === 'string') {
                        try { parsedData = JSON.parse(parsedData); } catch (e) { break; }
                    }
                    // Mezclamos las estadísticas de Upstash con los partidos de data.json
                    data.global_stats = parsedData.global_stats || data.global_stats;
                    data.historical_tickets_registry = parsedData.historical_tickets_registry || data.historical_tickets_registry;
                    data.starting_bankroll = parsedData.starting_bankroll || data.starting_bankroll;
                    data.user_bets = parsedData.user_bets || data.user_bets;
                    data.escalera_current_run = parsedData.escalera_current_run || data.escalera_current_run;
                }
            }
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("[Data API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
