const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Try loading from current directory or one level up (root)
require('dotenv').config(); 
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let pool;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || process.env.PGURL;

if (connectionString && connectionString.trim().length > 0) {
    const trimmedConfig = connectionString.trim();
    const isInternal = trimmedConfig.includes('.internal');
    
    pool = new Pool({
        connectionString: trimmedConfig,
        ssl: {
            // rejectUnauthorized: false is required for most cloud providers
            // even on internal networks, it prevents certificate depth errors
            rejectUnauthorized: false
        }
    });
    
    const url = new URL(trimmedConfig);
    console.log(`DATABASE_INFO: Cloud environment detected (${isInternal ? 'Internal' : 'Public'}). Connecting to ${url.hostname}`);
} else {
    // Fallback logic with enhanced debugging
    const envPath = path.resolve(__dirname, '../.env');
    const envExists = fs.existsSync(envPath);

    console.warn("---------------------------------------------------------");
    console.warn(`DATABASE_CRITICAL_WARNING: DATABASE_URL is not set.`);
    console.log(`.env file found at root: ${envExists ? 'YES' : 'NO'}`);
    console.log("Current NODE_ENV:", process.env.NODE_ENV || 'development');
    console.log("Action: Falling back to local credentials (localhost).");
    console.warn("---------------------------------------------------------");
    
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