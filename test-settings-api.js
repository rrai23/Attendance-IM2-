const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function testSettingsAPI() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Simulate what the settings API endpoint does
        const [settings] = await connection.execute(
            'SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key'
        );

        console.log('Raw settings from database:', settings.length, 'records');
        
        // Convert to object format (same as API does)
        const settingsObject = {};
        settings.forEach(setting => {
            try {
                // Try to parse as JSON, fallback to string
                settingsObject[setting.setting_key] = JSON.parse(setting.setting_value);
            } catch {
                settingsObject[setting.setting_key] = setting.setting_value;
            }
        });

        console.log('Converted settings object:');
        console.log(JSON.stringify(settingsObject, null, 2));
        
        await connection.end();
    } catch (error) {
        console.error('Error testing settings API:', error);
    }
}

testSettingsAPI();
