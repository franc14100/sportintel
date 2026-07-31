const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
    try {
        // Obtenemos todos los datos actuales
        const currentData = await kv.get('sportintel_sync');
        
        // Forzamos un reinicio completo
        const resetData = {
            sync_ts: "0",
            ts: "0",
            userBets: [],
            escaleraState: {}
        };
        
        await kv.set('sportintel_sync', resetData);
        
        return res.status(200).json({ 
            message: "UPSTASH HAS BEEN NUKED AND RESET COMPLETELY.",
            previousData: currentData
        });
    } catch (error) {
        console.error("Error reseteando KV:", error);
        return res.status(500).json({ error: error.message });
    }
}
