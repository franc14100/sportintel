const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const dataPath = path.join(process.cwd(), 'frontend', 'data.json');
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json(data);
    } catch (err) {
        console.error("[Data API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
