const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
    res.setHeader("CDN-Cache-Control", "no-store");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        // 1. Extraemos las credenciales de Upstash Redis desde Vercel
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        if (req.method === "POST") {
            const body = req.body || {};
            
            // Endpoint para actualizar boletos históricos directamente
            if (body.action === "update_tickets") {
                if (kvUrl && kvToken) {
                    const baseUrl = kvUrl.replace(/\/$/, "");
                    const getRes = await fetch(`${baseUrl}/get/sportintel_data`, {
                        headers: { 'Authorization': `Bearer ${kvToken}` }
                    });
                    let currentData = {};
                    if (getRes.ok) {
                        const jsonRes = await getRes.json();
                        if (jsonRes.result) {
                            let pd = jsonRes.result;
                            while (typeof pd === 'string') { try { pd = JSON.parse(pd); } catch(e) { break; } }
                            currentData = pd;
                        }
                    }
                    
                    // Si se proveen boletos nuevos para añadir
                    if (body.new_tickets && Array.isArray(body.new_tickets)) {
                        if (!currentData.historical_tickets_registry) currentData.historical_tickets_registry = [];
                        body.new_tickets.forEach(nt => {
                            // No duplicar por ticket_id
                            const exists = currentData.historical_tickets_registry.some(t => t.ticket_id === nt.ticket_id);
                            if (!exists) currentData.historical_tickets_registry.push(nt);
                        });
                    }
                    
                    // Si se proveen actualizaciones de estado por ticket_id
                    if (body.status_updates && Array.isArray(body.status_updates)) {
                        if (!currentData.historical_tickets_registry) currentData.historical_tickets_registry = [];
                        body.status_updates.forEach(upd => {
                            const ticket = currentData.historical_tickets_registry.find(t => t.ticket_id === upd.ticket_id);
                            if (ticket) {
                                ticket.status = upd.status;
                                if (upd.selections_status) {
                                    upd.selections_status.forEach((ss, idx) => {
                                        if (ticket.selections[idx]) ticket.selections[idx].status = ss;
                                    });
                                }
                            }
                        });
                    }
                    
                    const setRes = await fetch(`${baseUrl}/set/sportintel_data`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentData)
                    });
                    
                    if (setRes.ok) {
                        return res.status(200).json({ success: true, message: "Boletos actualizados correctamente", count: (currentData.historical_tickets_registry || []).length });
                    }
                }
                return res.status(500).json({ success: false, message: "Error al actualizar boletos" });
            }
            
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
                    const isKvValid = parsedData && parsedData.date && Array.isArray(parsedData.matches) && parsedData.matches.length >= 5;
                    
                    if (isKvValid) {
                        const localRegistry = data.historical_tickets_registry || [];
                        const kvRegistry = parsedData.historical_tickets_registry || [];
                        
                        // Merge registries by ticket_id or (date + name) to ensure no historical dates are lost
                        const registryMap = new Map();
                        kvRegistry.forEach(t => {
                            const key = t.ticket_id || `${t.date}-${t.name}`;
                            registryMap.set(key, t);
                        });
                        localRegistry.forEach(t => {
                            const key = t.ticket_id || `${t.date}-${t.name}`;
                            registryMap.set(key, t);
                        });
                        
                        const mergedRegistry = Array.from(registryMap.values());
                        mergedRegistry.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

                        if (parsedData.date > data.date) {
                            data = parsedData;
                        } else {
                            data.global_stats = parsedData.global_stats || data.global_stats;
                            data.starting_bankroll = parsedData.starting_bankroll || data.starting_bankroll;
                            data.user_bets = parsedData.user_bets || data.user_bets;
                        }
                        
                        data.historical_tickets_registry = mergedRegistry.slice(-40);
                        
                        // Update KV with merged data asynchronously to heal KV storage
                        fetch(`${baseUrl}/set/sportintel_data`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        }).catch(() => {});
                    } else {
                        console.log("[Data API] Datos de KV obsoletos o corruptos. Ignorando KV y usando data.json fresco.");
                        // Sobrescribir KV con los datos frescos de data.json para sanar el KV
                        fetch(`${baseUrl}/set/sportintel_data`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        }).catch(() => {});
                    }
                }
            }
        }

        if (!data.api_status) {
            data.api_status = "online";
            data.api_warning = "";
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("[Data API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
