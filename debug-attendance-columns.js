const mysql = require('mysql2/promise');

async function checkAttendanceTableStructure() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        console.log('✅ Connected to MySQL database');

        // Check attendance_records table structure
        console.log('\n📋 ATTENDANCE_RECORDS TABLE STRUCTURE:');
        console.log('═'.repeat(60));
        
        const [columns] = await connection.execute(`
            DESCRIBE attendance_records
        `);
        
        columns.forEach((column, index) => {
            console.log(`${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default !== null ? `Default: ${column.Default}` : ''}`);
        });

        // Check a sample record to see what data is actually there
        console.log('\n📄 SAMPLE ATTENDANCE RECORDS:');
        console.log('═'.repeat(60));
        
        const [records] = await connection.execute(`
            SELECT * FROM attendance_records LIMIT 3
        `);
        
        if (records.length > 0) {
            console.log('Sample record keys:', Object.keys(records[0]));
            records.forEach((record, index) => {
                console.log(`\nRecord ${index + 1}:`);
                Object.entries(record).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value}`);
                });
            });
        } else {
            console.log('No records found in attendance_records table');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

checkAttendanceTableStructure();
