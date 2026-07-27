const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
    try {
        const scriptPath = path.join(process.cwd(), 'backend', 'data_generator.py');

        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({ error: 'Generator script not found' });
        }

        // Ejecuta el motor de Python forzando la hora de Ecuador
        const result = execSync(`python "${scriptPath}"`, {
            timeout: 120000, // 2 minutos máximo
            cwd: process.cwd(),
            encoding: 'utf-8',
            env: { ...process.env, TZ: 'America/Guayaquil' }
        });

        return res.status(200).json({
            success: true,
            message: "¡Motor de Antigravity ejecutado con éxito!",
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
