const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        // 1. Extraemos las credenciales de Upstash Redis desde Vercel
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        // 2. Intentamos buscar la información fresca en la base de datos
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
                    // Upstash devuelve el JSON como string, así que lo convertimos a objeto
                    const parsedData = typeof jsonRes.result === 'string' ? JSON.parse(jsonRes.result) : jsonRes.result;
                    return res.status(200).json(parsedData);
                }
            }
        }

        // 3. Respaldo (Fallback): Si falla Redis o pruebas localmente, lee el archivo estático
        const dataPath = path.join(process.cwd(), 'frontend', 'data.json');
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json(data);

    } catch (err) {
        console.error("[Data API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
