const db = require('./backend/database/connection');

async function checkPayrollTable() {
    try {
        console.log('Checking payroll_records table structure...');
        
        // Check if table exists and get structure
        const describe = await db.execute('DESCRIBE payroll_records');
        console.log('\nPayroll Records Table Structure:');
        console.table(describe);
        
        // Check current records count
        const count = await db.execute('SELECT COUNT(*) as total FROM payroll_records');
        console.log(`\nCurrent records in payroll_records: ${count[0].total}`);
        
        // Show sample records if any exist
        if (count[0].total > 0) {
            const sample = await db.execute('SELECT * FROM payroll_records LIMIT 3');
            console.log('\nSample records:');
            console.table(sample);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking payroll table:', error);
        process.exit(1);
    }
}

checkPayrollTable();
