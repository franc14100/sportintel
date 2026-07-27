const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    // Allow only GET from Vercel Cron or manual trigger with secret
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET || '';
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify Vercel Cron signature OR manual secret
    const isVercelCron = req.headers['x-vercel-cron'] === '1';
    const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !hasSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const scriptPath = path.join(process.cwd(), 'backend', 'data_generator.py');
        
        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({ error: 'Generator script not found' });
        }

        // Run the Python generator con hora de Ecuador
        const result = execSync(`python "${scriptPath}"`, {
            timeout: 120000, // 2 minutes max
            cwd: process.cwd(),
            encoding: 'utf-8',
            env: { ...process.env, TZ: 'America/Guayaquil' }
        });

        // Read the generated data to confirm success
        const dataPath = path.join(process.cwd(), 'frontend', 'data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const matchCount = (data.matches || []).length;
        const ticketCount = ['star_ticket_1','star_ticket_2','star_ticket_3','star_ticket_4']
            .filter(k => data[k] && data[k].selections && data[k].selections.length > 0).length;

        return res.status(200).json({
            success: true,
            message: `Data generated successfully at 5:00 AM Ecuador`,
            date: data.date || new Date().toISOString().split('T')[0],
            matches: matchCount,
            tickets: ticketCount,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Generate API] Error:', err.message);
        return res.status(500).json({ 
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
};
