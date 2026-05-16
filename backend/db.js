const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env

let pool;

if (process.env.DATABASE_URL) {
    // This block runs on Railway
    console.log("DATABASE_INFO: Connecting via DATABASE_URL (Production Mode)");
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Necessary for Railway managed databases
        }
    });
} else {
    // This block runs on your Localhost
    console.log("DATABASE_INFO: Connecting via individual credentials (Local Mode)");
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: false
    });
}

// Test the connection immediately on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('DATABASE_ERROR: Connection failed!', err.stack);
    } else {
        console.log('DATABASE_SUCCESS: Connection established at', res.rows[0].now);
    }
});

module.exports = pool;