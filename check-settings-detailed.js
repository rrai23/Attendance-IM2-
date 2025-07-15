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
        
        console.log('🔍 Checking system_settings table structure...');
        
        const [structure] = await connection.execute('DESCRIBE system_settings');
        console.log('Table structure:');
        structure.forEach(col => {
            console.log(`  ${col.Field} (${col.Type}) - ${col.Null} - ${col.Default}`);
        });
        
        console.log('\n🔍 Checking settings data...');
        const [rows] = await connection.execute('SELECT * FROM system_settings ORDER BY setting_key LIMIT 10');
        
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
