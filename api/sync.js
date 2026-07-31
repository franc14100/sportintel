export default async function handler(req, res) {
    try {
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            return res.status(200).json({ saved: false, w: 'No Redis config' });
        }
        
        const baseUrl = kvUrl.replace(/\/$/, '');

        if (req.method === 'GET') {
            const getRes = await fetch(`${baseUrl}/get/sportintel_sync`, {
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });
            if (getRes.ok) {
                const jsonRes = await getRes.json();
                if (jsonRes.result) {
                    let parsedData = jsonRes.result;
                    if (typeof parsedData === 'string') {
                        try { parsedData = JSON.parse(parsedData); } catch(e) {}
                    }
                    return res.status(200).json({ result: parsedData });
                }
            }
            return res.status(200).json({ result: null });
            
        } else if (req.method === 'POST') {
            const stateObj = req.body;
            if (!stateObj) {
                return res.status(400).json({ error: 'No data' });
            }

            // Trust the client completely. No merging, no timestamp rejections.
            const newTimestamp = Date.now();
            stateObj.ts = newTimestamp;
            stateObj.sync_ts = newTimestamp;

            const pushRes = await fetch(`${baseUrl}/set/sportintel_sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${kvToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(stateObj)
            });

            if (pushRes.ok) {
                return res.status(200).json({ saved: true, ts: newTimestamp });
            } else {
                return res.status(500).json({ saved: false, error: 'Failed to write to KV' });
            }
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
