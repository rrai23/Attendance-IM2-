const mysql = require('mysql2/promise');

async function checkPayrollStructure() {
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        console.log('🔍 Checking payroll_records table structure...');
        const [rows] = await pool.execute('DESCRIBE payroll_records');
        
        console.log('Payroll Records Table Structure:');
        rows.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} ${row.Null} ${row.Key || ''}`);
        });

        console.log('\n🔍 Checking for sample data...');
        const [data] = await pool.execute('SELECT * FROM payroll_records LIMIT 5');
        
        if (data.length > 0) {
            console.log('Sample payroll records:');
            data.forEach(record => {
                console.log(`  Record:`, record);
            });
        } else {
            console.log('No payroll records found');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPayrollStructure();
