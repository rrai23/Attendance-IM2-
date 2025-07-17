const db = require('./backend/database/connection');

async function checkSchema() {
    try {
        console.log('Checking attendance_records table schema...');
        const columns = await db.execute('DESCRIBE attendance_records');
        console.log('Table columns:');
        console.log('Columns result:', columns);
        if (columns && columns[0]) {
            columns[0].forEach(col => {
                console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? 'DEFAULT ' + col.Default : ''}`);
            });
        }
        
        console.log('\nFirst few records:');
        const [records] = await db.execute('SELECT * FROM attendance_records LIMIT 3');
        console.log('Records found:', records.length);
        if (records.length > 0) {
            console.log('Sample record fields:', Object.keys(records[0]));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
