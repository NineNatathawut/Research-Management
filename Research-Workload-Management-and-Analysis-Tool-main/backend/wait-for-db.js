const { pool } = require('./db');

async function waitForDb(maxRetries = 30, delayMs = 2000) {
    for (let i = 1; i <= maxRetries; i++) {
        try {
            await pool.query('SELECT 1');
            console.log('[DB] Connected successfully');
            return true;
        } catch (err) {
            console.log(`[DB] Waiting... (${i}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw new Error('Database not ready after max retries');
}

if (require.main === module) {
    waitForDb().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { waitForDb };