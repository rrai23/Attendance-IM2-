const db = require('./connection');

const checkDatabase = async () => {
    try {
        console.log('🔍 Checking database existence and tables...');
        
        // First check what database we're connected to
        const [currentDb] = await db.execute('SELECT DATABASE() as current_database');
        console.log('Current database:', currentDb[0]);
        
        // List all databases
        const [databases] = await db.execute('SHOW DATABASES');
        console.log('Available databases:');
        databases.forEach(db => {
            console.log(`  - ${db.Database}`);
        });
        
        // Show all tables in current database
        const [tables] = await db.execute('SHOW TABLES');
        console.log('\nTables in current database:');
        if (tables && tables.length > 0) {
            tables.forEach(table => {
                // Table names come back with different property names depending on the database
                const tableName = Object.values(table)[0];
                console.log(`  - ${tableName}`);
            });
            
            // Now check the first table's structure
            const firstTable = Object.values(tables[0])[0];
            console.log(`\n📋 Structure of ${firstTable}:`);
            const [columns] = await db.execute(`SHOW COLUMNS FROM \`${firstTable}\``);
            columns.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        } else {
            console.log('  No tables found');
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
};

// Run check
checkDatabase().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
});
