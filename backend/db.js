const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env

let pool;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;

if (connectionString && connectionString.trim().length > 0) {
    // This block runs on Railway/Production
    console.log(`DATABASE_INFO: Cloud environment detected. Using Connection String (Length: ${connectionString.length})`);
    
    // Security Check: Ensure we aren't using a public URL in a production environment
    if (connectionString.includes('.railway.app') && !connectionString.includes('.internal')) {
        console.warn("DATABASE_ADVISORY: App is using a PUBLIC Railway URL. Internal networking is recommended for better performance.");
    }

    pool = new Pool({
        connectionString: connectionString.trim(),
        ssl: {
            // Required for Railway and most cloud providers
            // rejectUnauthorized: false allows self-signed certificates used by cloud providers
            rejectUnauthorized: false 
        }
    });
} else {
    // Fallback for Localhost
    console.warn("DATABASE_WARNING: DATABASE_URL not found. Falling back to local credentials...");
    pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'globalearn',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: false
    });
}

// Test the connection immediately on startup
const startupQuery = `
    SELECT 
        NOW(), 
        current_database(), 
        current_user,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') as table_exists
`;

pool.query(startupQuery, (err, res) => {
    if (err) {
        console.error('DATABASE_CRITICAL_ERROR: Connection failed during startup test!');
        console.error('Environment:', process.env.NODE_ENV || 'development');
        console.error('Target Host:', pool.options.host || 'Connection String used');
        console.error('Error Details:', err.message);
    } else {
        const mode = connectionString ? "CLOUD" : "LOCAL";
        const { current_database, current_user, table_exists, now } = res.rows[0];
        
        console.log(`DATABASE_SUCCESS: [${mode}] Connected to "${current_database}" as "${current_user}"`);
        console.log(`DATABASE_TIME: ${now}`);

        if (table_exists) {
            // Check if the current user has required privileges
            pool.query("SELECT has_table_privilege(current_user, 'users', 'SELECT, INSERT, UPDATE') as can_access", (pErr, pRes) => {
                if (!pErr && pRes.rows[0].can_access) {
                    console.log('DATABASE_PERMISSIONS: Verified [SELECT, INSERT, UPDATE] on "users" table.');
                } else {
                    console.error('DATABASE_PERMISSION_ERROR: User lacks necessary privileges on "users" table.');
                }
            });
        } else {
            console.warn('DATABASE_SCHEMA_WARNING: "users" table does not exist. Please run your migration/schema scripts.');
        }
    }
});

module.exports = pool;