const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSettings() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bricks_attendance'
        });
        
        console.log('🔍 Checking system_settings table...');
        
        const [rows] = await connection.execute('SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key');
        
        if (rows.length === 0) {
            console.log('⚠️ No settings found in database');
        } else {
            console.log(`✅ Found ${rows.length} settings in database:`);
            rows.forEach(row => {
                console.log(`  - ${row.setting_key}: ${row.setting_value}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error checking settings:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSettings();
