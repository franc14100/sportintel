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
            const getRes = await fetch(${baseUrl}/get/sportintel_sync, {
                headers: { 'Authorization': Bearer  }
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

            if (stateObj.eh) {
                try {
                    const arr = typeof stateObj.eh === 'string' ? JSON.parse(stateObj.eh) : stateObj.eh;
                    if (Array.isArray(arr) && arr.length > 50)
                        stateObj.eh = arr.slice(-50);
                } catch (_) {}
            }

            const setRes = await fetch(${baseUrl}/set/sportintel_sync, {
                method: 'POST',
                headers: {
                    'Authorization': Bearer ,
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
