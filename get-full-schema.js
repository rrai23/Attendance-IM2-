const db = require('./backend/database/connection');

const getFullSchema = async () => {
    try {
        console.log('🔍 Getting full database schema...\n');

        // Get all tables
        const [tables] = await db.execute('SHOW TABLES');
        
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            console.log(`\n📊 TABLE: ${tableName.toUpperCase()}`);
            console.log('='.repeat(50));
            
            const [columns] = await db.execute(`DESCRIBE ${tableName}`);
            
            columns.forEach(col => {
                console.log(`${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null.padEnd(5)} | ${col.Key.padEnd(5)} | ${String(col.Default).padEnd(10)} | ${col.Extra}`);
            });
        }

        console.log('\n✅ Full schema retrieved successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
};

getFullSchema();
