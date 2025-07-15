const db = require('./backend/database/connection');

const checkCurrentSchema = async () => {
    try {
        console.log('🔍 Checking current database schema...\n');

        // Get list of all tables
        const [tables] = await db.execute('SHOW TABLES');
        console.log('📋 Current tables:');
        if (tables && Array.isArray(tables)) {
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
        }
        console.log('');

        // Check structure of each table
        if (tables && Array.isArray(tables)) {
            for (const table of tables) {
                const tableName = Object.values(table)[0];
                console.log(`📊 Structure of ${tableName}:`);
                
                const [columns] = await db.execute(`DESCRIBE ${tableName}`);
                if (columns && Array.isArray(columns)) {
                    columns.forEach(col => {
                        console.log(`   ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
                    });
                }
                console.log('');
            }
        }

        console.log('✅ Schema check completed');
        
    } catch (error) {
        console.error('❌ Error checking schema:', error);
    } finally {
        process.exit(0);
    }
};

checkCurrentSchema();
