const mysql = require('mysql2/promise');

async function checkLastPayroll() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        console.log('✅ Connected to database');

        // Check the most recent payroll record
        const [records] = await connection.execute(`
            SELECT 
                pay_period_start,
                pay_period_end,
                created_at,
                updated_at
            FROM payroll_records 
            ORDER BY pay_period_end DESC 
            LIMIT 3
        `);
        
        console.log('\n📊 Most recent payroll records:');
        console.table(records);

        await connection.end();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

checkLastPayroll();
