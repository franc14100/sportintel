export default async function handler(req, res) {
    try {
        const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.KV_REST_API_URL;
        const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            return res.status(200).json({ error: 'No Redis config' });
        }
        
        const baseUrl = kvUrl.replace(/\/$/, '');

        // Forzamos un reinicio completo
        const resetData = {
            sync_ts: "0",
            ts: "0",
            userBets: [],
            escaleraState: {}
        };
        
        const pushRes = await fetch(`${baseUrl}/set/sportintel_sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${kvToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resetData)
        });

        return res.status(200).json({ 
            message: "UPSTASH HAS BEEN NUKED AND RESET COMPLETELY.",
            success: pushRes.ok
        });
    } catch (error) {
        console.error("Error reseteando KV:", error);
        return res.status(500).json({ error: error.message });
    }
}
