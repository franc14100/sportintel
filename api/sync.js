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
            
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => {
                    resolve({ statusCode: response.statusCode, data: data });
                });
            });

            request.on('error', (e) => reject(e));

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
            // Vercel parses req.body automatically if it's JSON
            const jsonStr = typeof state === 'string' ? state : JSON.stringify(state);
            
            // Comprimir para evitar el límite de 10KB de JsonBlob anónimo
            const compressedBase64 = zlib.deflateSync(jsonStr).toString('base64');
            const payload = JSON.stringify({
                _isCompressed: true,
                data: compressedBase64
            });
            
            const result = await makeRequest("PUT", payload);
            
            if (result.statusCode >= 200 && result.statusCode < 300) {
                return res.status(200).json({ saved: true });
            } else {
                return res.status(500).json({ error: "Failed to save to Cloud", status: result.statusCode, details: result.data });
            }
        }
        else {
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (err) {
        console.error("[Sync API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
