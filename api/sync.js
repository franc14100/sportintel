module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    const https = require("https");
    const zlib = require("zlib");
    const BLOB_PATH = "/api/jsonBlob/019f96bc-688e-786f-b46d-7478b2b30aa1";

    function makeRequest(method, payload) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: "jsonblob.com",
                port: 443,
                path: BLOB_PATH,
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            };
            
            if (payload) {
                options.headers["Content-Length"] = Buffer.byteLength(payload, 'utf8');
            }

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    resolve({ statusCode: response.statusCode, data: data });
                });
            });

            request.on('error', (e) => reject(e));
            request.setTimeout(8000, () => { request.destroy(); reject(new Error('timeout')); });

            if (payload) {
                request.write(payload);
            }
            request.end();
        });
    }

    try {
        if (req.method === "GET") {
            const result = await makeRequest("GET", null);
            if (result.statusCode >= 200 && result.statusCode < 300) {
                try {
                    const parsed = JSON.parse(result.data);
                    if (parsed && parsed._isCompressed && parsed.data) {
                        const decoded = zlib.inflateSync(Buffer.from(parsed.data, 'base64')).toString();
                        return res.status(200).json(JSON.parse(decoded));
                    }
                    return res.status(200).json(parsed);
                } catch(e) {
                    return res.status(200).json({});
                }
            }
            return res.status(200).json({});
        } 
        else if (req.method === "POST") {
            const state = req.body;
            const jsonStr = typeof state === 'string' ? state : JSON.stringify(state);

            // Verificar tamaño ANTES de comprimir — JsonBlob tiene límite de ~64KB incluso comprimido
            // Si es muy grande, truncar el historial de apuestas para que entre
            let stateObj = typeof state === 'string' ? JSON.parse(state) : state;
            
            // Truncar historial si es muy largo (guardar máximo 50 apuestas)
            if (stateObj && stateObj.escalera_apuestas) {
                try {
                    const apuestas = JSON.parse(stateObj.escalera_apuestas);
                    if (Array.isArray(apuestas) && apuestas.length > 50) {
                        stateObj.escalera_apuestas = JSON.stringify(apuestas.slice(-50));
                    }
                } catch(e) {}
            }
            
            const finalJsonStr = JSON.stringify(stateObj);
            
            // Comprimir para optimizar tamaño
            const compressedBase64 = zlib.deflateSync(finalJsonStr).toString('base64');
            const payload = JSON.stringify({
                _isCompressed: true,
                data: compressedBase64
            });
            
            // Verificar que el payload no excede 100KB (límite seguro de JsonBlob)
            const payloadBytes = Buffer.byteLength(payload, 'utf8');
            if (payloadBytes > 100000) {
                // Si sigue siendo muy grande, guardar solo datos críticos (saldo, ROI, config)
                const minimalState = {
                    ts: stateObj.ts,
                    escalera_bankroll: stateObj.escalera_bankroll,
                    escalera_inicial: stateObj.escalera_inicial,
                    escalera_nivel: stateObj.escalera_nivel,
                    bet_history: stateObj.bet_history ? JSON.stringify(JSON.parse(stateObj.bet_history || '[]').slice(-20)) : '[]',
                    sync_ts: stateObj.sync_ts
                };
                const minimalStr = JSON.stringify(minimalState);
                const minCompressed = zlib.deflateSync(minimalStr).toString('base64');
                const minPayload = JSON.stringify({ _isCompressed: true, data: minCompressed, _truncated: true });
                const result = await makeRequest("PUT", minPayload);
                if (result.statusCode >= 200 && result.statusCode < 300) {
                    return res.status(200).json({ saved: true, warning: "Historial truncado por límite de tamaño" });
                }
                return res.status(200).json({ saved: true, warning: "Guardado parcial" });
            }
            
            const result = await makeRequest("PUT", payload);
            
            if (result.statusCode >= 200 && result.statusCode < 300) {
                return res.status(200).json({ saved: true });
            } else {
                // Si JsonBlob falla (415/413/500), responder OK al cliente para no mostrar error
                // Los datos están guardados localmente en localStorage de todas formas
                console.error("[Sync] JsonBlob error:", result.statusCode, result.data.substring(0, 200));
                return res.status(200).json({ saved: false, warning: `JsonBlob returned ${result.statusCode}` });
            }
        }
        else {
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (err) {
        console.error("[Sync API] Error:", err.message);
        // Responder 200 para no mostrar "Error 500" al usuario — localStorage siempre tiene los datos
        return res.status(200).json({ saved: false, warning: err.message });
    }
};
