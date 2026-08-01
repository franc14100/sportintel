
const handler = require('./api/sync.js');
const req = {
    method: 'POST',
    body: {
        sync_ts: Date.now(),
        userBets: [{ id: 1, match: 'Test' }],
        escaleraRun: [],
        history: [],
        force_override: true
    }
};
const res = {
    setHeader: () => {},
    status: (code) => {
        return {
            json: (data) => console.log('Status:', code, 'Data:', JSON.stringify(data)),
            end: () => console.log('End', code)
        }
    }
};
handler(req, res).catch(console.error);
