const db = require('./backend/database/connection');

const getSchema = async () => {
    try {
        console.log('🔍 Getting database schema...\n');

        // Simple query to get table list
        const [tablesResult] = await db.execute('SHOW TABLES');
        console.log('Raw tables result:', tablesResult);
        
        // Get just the table names
        const tableNames = ['employees', 'user_accounts', 'attendance_records', 'user_sessions', 'payroll_records', 'system_settings', 'departments', 'audit_log', 'overtime_requests'];
        
        for (const tableName of tableNames) {
            try {
                console.log(`\n📊 TABLE: ${tableName.toUpperCase()}`);
                console.log('='.repeat(60));
                
                const [columns] = await db.execute(`DESCRIBE ${tableName}`);
                
                if (columns && Array.isArray(columns)) {
                    columns.forEach(col => {
                        console.log(`${col.Field.padEnd(25)} | ${col.Type.padEnd(25)} | ${col.Null.padEnd(5)} | ${col.Key.padEnd(5)} | ${String(col.Default || 'NULL').padEnd(15)} | ${col.Extra || ''}`);
                    });
                } else {
                    console.log('No columns found or invalid result');
                }
            } catch (error) {
                console.log(`❌ Table ${tableName} not found or error: ${error.message}`);
            }
        }

        console.log('\n✅ Schema check completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
};

getSchema();
