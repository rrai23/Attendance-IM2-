const db = require('./backend/database/connection');

async function checkAttendanceTable() {
    try {
        console.log('📋 Checking attendance_records table structure...');
        
        // Check if table exists and get structure
        const result = await db.execute(`
            DESCRIBE attendance_records
        `);
        
        console.log('Raw database result:', result);
        
        // The result might be structured differently
        let columns = result[0];
        if (!Array.isArray(columns) && result.length > 1) {
            columns = result; // Sometimes the entire result is the columns array
        }
        
        console.log('📋 attendance_records columns:');
        
        if (Array.isArray(columns)) {
            console.log(`Found ${columns.length} columns:`);
            columns.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
            
            // List just the column names
            console.log('\n🔍 Column names only:');
            const columnNames = columns.map(col => col.Field);
            console.log(columnNames.join(', '));
            
        } else {
            console.log('Single column result:', columns);
        }
        
        // Check sample data
        console.log('\n📋 Sample attendance records:');
        const [records] = await db.execute(`
            SELECT * FROM attendance_records LIMIT 3
        `);
        
        if (records.length > 0) {
            console.log('Sample records:');
            records.forEach((record, i) => {
                console.log(`  Record ${i + 1}:`, record);
            });
        } else {
            console.log('No attendance records found');
        }
        
    } catch (error) {
        console.error('❌ Error checking attendance table:', error.message);
    } finally {
        process.exit(0);
    }
}

checkAttendanceTable();
