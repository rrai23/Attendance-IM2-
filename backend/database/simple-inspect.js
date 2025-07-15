const db = require('./connection');

const simpleInspect = async () => {
    try {
        console.log('🔍 Simple table inspection...');
        
        // Just check specific tables we need
        const tablesToCheck = ['system_settings', 'departments', 'user_accounts', 'attendance_records'];
        
        for (const tableName of tablesToCheck) {
            console.log(`\n📋 Checking table: ${tableName}`);
            
            try {
                const [columns] = await db.execute(`SHOW COLUMNS FROM ${tableName}`);
                
                if (columns && columns.length > 0) {
                    console.log(`  Columns found in ${tableName}:`);
                    columns.forEach(col => {
                        console.log(`    - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
                    });
                } else {
                    console.log(`  No columns found for table ${tableName}`);
                }
            } catch (error) {
                console.log(`  ❌ Table ${tableName} doesn't exist or error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error during inspection:', error);
    }
};

// Run inspection
simpleInspect().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Inspection failed:', error);
    process.exit(1);
});
