const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function checkSystemSettings() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Check if system_settings table exists
        const [tables] = await connection.execute('SHOW TABLES LIKE "system_settings"');
        console.log('System settings table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Check table structure
            const [structure] = await connection.execute('DESCRIBE system_settings');
            console.log('Table structure:', structure);
            
            // Check existing data
            const [data] = await connection.execute('SELECT * FROM system_settings');
            console.log('Existing settings data:', data.length, 'records');
            data.forEach(row => {
                console.log(`${row.setting_key}: ${row.setting_value}`);
            });
        } else {
            console.log('system_settings table does not exist');
            
            // Check what tables do exist
            const [allTables] = await connection.execute('SHOW TABLES');
            console.log('Available tables:', allTables.map(t => Object.values(t)[0]));
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error checking system settings:', error);
    }
}

checkSystemSettings();
