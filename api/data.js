module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const rawUrl = `https://raw.githubusercontent.com/franc14100/sportintel/main/frontend/data.json?t=${Date.now()}`;
        const fetchRes = await fetch(rawUrl, {
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache"
            }
        });
        if (!fetchRes.ok) {
            return res.status(500).json({ error: "Failed to fetch data from GitHub" });
        }
        const data = await fetchRes.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error("[Data API] Error:", err);
        return res.status(500).json({ error: err.message });
    }
};
