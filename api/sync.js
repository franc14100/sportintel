module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    const https = require("https");
    const zlib  = require("zlib");
    const BLOB  = "/api/jsonBlob/019f9ef2-63db-724c-8f16-cc0f13f487f7";

    // Never rejects — always resolves (even on error/timeout)
    function blobReq(method, body) {
        return new Promise((resolve) => {
            try {
                const opts = {
                    hostname: "jsonblob.com",
                    port: 443,
                    path: BLOB,
                    method: method,
                    headers: { "Content-Type": "application/json" }
                };
                const r = https.request(opts, (resp) => {
                    let d = "";
                    resp.on("data", (c) => (d += c));
                    resp.on("end", () => resolve({ ok: resp.statusCode < 300, code: resp.statusCode, data: d }));
                });
                r.on("error", () => resolve({ ok: false, code: 0, data: "" }));
                r.setTimeout(7000, () => { r.destroy(); resolve({ ok: false, code: 0, data: "timeout" }); });
                if (body) r.write(body);
                r.end();
            } catch (e) {
                resolve({ ok: false, code: 0, data: String(e.message) });
            }
        });
    }

    try {
        if (req.method === "GET") {
            const result = await blobReq("GET", null);
            if (!result.ok) return res.status(200).json({});
            try {
                const parsed = JSON.parse(result.data);
                if (parsed && parsed._c && parsed.d) {
                    const dec = zlib.inflateSync(Buffer.from(parsed.d, "base64")).toString();
                    return res.status(200).json(JSON.parse(dec));
                }
                // Legacy uncompressed
                if (parsed && parsed._isCompressed && parsed.data) {
                    const dec = zlib.inflateSync(Buffer.from(parsed.data, "base64")).toString();
                    return res.status(200).json(JSON.parse(dec));
                }
                return res.status(200).json(parsed || {});
            } catch (e) {
                return res.status(200).json({});
            }
        }

        if (req.method === "POST") {
            const raw = req.body || {};
            const stateObj = typeof raw === "string" ? JSON.parse(raw) : raw;

            // Trim bet history to last 50 entries to stay under size limits
            if (stateObj.escalera_apuestas) {
                try {
                    const arr = JSON.parse(stateObj.escalera_apuestas);
                    if (Array.isArray(arr) && arr.length > 50)
                        stateObj.escalera_apuestas = JSON.stringify(arr.slice(-50));
                } catch (_) {}
            }

            const compressed = zlib.deflateSync(JSON.stringify(stateObj)).toString("base64");
            const payload    = JSON.stringify({ _c: true, d: compressed });

            const result = await blobReq("PUT", payload);
            // Always return 200 — data is always safe in localStorage
            return res.status(200).json(result.ok ? { saved: true } : { saved: false, w: result.code });
        }

        return res.status(405).json({ error: "Method not allowed" });

    } catch (err) {
        // Safety net — never expose a 500 to the client
        return res.status(200).json({ saved: false, w: String(err.message) });
    }
};
