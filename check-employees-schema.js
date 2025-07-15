const db = require('./backend/database/connection');

async function checkEmployeesSchema() {
    try {
        console.log('📊 Checking employees table structure...');
        
        const rows = await db.execute("DESCRIBE employees");
        
        console.log('\n📋 Employees table schema:');
        console.log('===============================');
        console.log('rows structure:', typeof rows, Array.isArray(rows), rows.length);
        
        if (Array.isArray(rows) && rows.length > 0) {
            console.log('First element type:', typeof rows[0], Array.isArray(rows[0]));
            const tableStructure = Array.isArray(rows[0]) ? rows[0] : rows;
            
            tableStructure.forEach(row => {
                console.log(`${row.Field} | ${row.Type} | ${row.Null} | ${row.Key} | ${row.Default}`);
            });
        }
        
        // Also check a sample record to see actual field names
        console.log('\n📝 Sample employee record:');
        console.log('===============================');
        const sampleData = await db.execute("SELECT * FROM employees LIMIT 1");
        console.log('Sample data structure:', typeof sampleData, Array.isArray(sampleData), sampleData.length);
        
        if (Array.isArray(sampleData) && sampleData.length > 0) {
            const records = Array.isArray(sampleData[0]) ? sampleData[0] : sampleData;
            if (records.length > 0) {
                console.log('Available fields:', Object.keys(records[0]));
            }
        }
        
        console.log('\n🎉 Schema check complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking schema:', error);
        process.exit(1);
    }
}

checkEmployeesSchema();
