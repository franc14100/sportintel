module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    const https = require("https");
    const zlib = require("zlib");

    // Active blob ID — auto-recreates if missing
    const BLOB_IDS = [
        "019f9ef2-63db-724c-8f16-cc0f13f487f7",  // new blob (created 2026-07-26)
        "019f96bc-688e-786f-b46d-7478b2b30aa1",  // old blob (may be gone)
    ];
    const BASE_URL = "jsonblob.com";
    let BLOB_PATH = `/api/jsonBlob/${BLOB_IDS[0]}`;

    function makeRequest(method, path, payload) {
        return new Promise((resolve, reject) => {
            const body = payload ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : null;
            const options = {
                hostname: BASE_URL,
                port: 443,
                path: path,
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Cache-Control": "no-cache",
                }
            };
            if (body) options.headers["Content-Length"] = Buffer.byteLength(body, 'utf8');

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({ statusCode: response.statusCode, data: data, headers: response.headers }));
            });

            request.on('error', (e) => reject(e));
            request.setTimeout(8000, () => { request.destroy(new Error('timeout')); });
            if (body) request.write(body);
            request.end();
        });
    }

    async function createNewBlob(initialData) {
        const result = await makeRequest("POST", "/api/jsonBlob", JSON.stringify(initialData || {}));
        if (result.statusCode === 201 && result.headers.location) {
            return result.headers.location; // e.g., /api/jsonBlob/NEW_ID
        }
        return null;
    }

    try {
        if (req.method === "GET") {
            // Try primary blob first
            const result = await makeRequest("GET", BLOB_PATH, null);
            if (result.statusCode === 404) {
                // Blob gone — return empty state, client will push to recreate
                return res.status(200).json({});
            }
            if (result.statusCode >= 200 && result.statusCode < 300) {
                try {
                    const parsed = JSON.parse(result.data);
                    if (parsed && parsed._isCompressed && parsed.data) {
                        const decoded = zlib.inflateSync(Buffer.from(parsed.data, 'base64')).toString();
                        return res.status(200).json(JSON.parse(decoded));
                    }
                    return res.status(200).json(parsed);
                } catch (e) {
                    return res.status(200).json({});
                }
            }
            return res.status(200).json({});
        }
        else if (req.method === "POST") {
            const state = req.body;
            let stateObj = typeof state === 'string' ? JSON.parse(state) : state;

            // Truncar historial si es muy largo (máximo 50 apuestas) para no superar límites
            if (stateObj && stateObj.escalera_apuestas) {
                try {
                    const apuestas = JSON.parse(stateObj.escalera_apuestas);
                    if (Array.isArray(apuestas) && apuestas.length > 50) {
                        stateObj.escalera_apuestas = JSON.stringify(apuestas.slice(-50));
                    }
                } catch (e) {}
            }

            const jsonStr = JSON.stringify(stateObj);

            // Comprimir para reducir tamaño
            const compressedBase64 = zlib.deflateSync(jsonStr).toString('base64');
            const payload = JSON.stringify({ _isCompressed: true, data: compressedBase64 });

            // Intentar PUT al blob principal
            let result = await makeRequest("PUT", BLOB_PATH, payload);

            if (result.statusCode === 404) {
                // El blob no existe — crear uno nuevo automáticamente
                console.log("[Sync] Blob not found (404), creating new blob...");
                const newPath = await createNewBlob({});
                if (newPath) {
                    BLOB_PATH = newPath;
                    // Intentar de nuevo con el nuevo blob
                    result = await makeRequest("PUT", BLOB_PATH, payload);
                }
            }

            if (result.statusCode >= 200 && result.statusCode < 300) {
                return res.status(200).json({ saved: true });
            } else {
                // Fallo al guardar — responder 200 con saved:false para no mostrar Error 500 al usuario
                // Los datos están seguros en localStorage del navegador
                console.error("[Sync] Failed to save:", result.statusCode, result.data.substring(0, 200));
                return res.status(200).json({
                    saved: false,
                    warning: `Storage returned ${result.statusCode}`
                });
            }
        }
        else {
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (err) {
        console.error("[Sync] Error:", err.message);
        // Siempre 200 para no mostrar "Error 500" al usuario
        return res.status(200).json({ saved: false, warning: err.message });
    }
};
