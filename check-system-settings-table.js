const db = require('./backend/database/connection');

async function checkSystemSettingsTable() {
    try {
        // Check if system_settings table exists
        const tables = await db.execute('SHOW TABLES LIKE "system_settings"');
        console.log('system_settings table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Get table structure
            const structure = await db.execute('DESCRIBE system_settings');
            console.log('system_settings table structure:');
            structure.forEach(col => console.log(`  ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default || ''}`));
        } else {
            console.log('system_settings table does not exist. Creating it...');
            await db.execute(`
                CREATE TABLE system_settings (
                    setting_id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(255) UNIQUE NOT NULL,
                    setting_value TEXT,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('system_settings table created successfully!');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSystemSettingsTable();
