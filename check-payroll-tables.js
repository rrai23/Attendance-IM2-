const mysql = require('mysql2/promise');

async function checkPayrollTables() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        console.log('✅ Connected to database');

        // Check if payroll_records table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'payroll%'");
        console.log('\n📋 Payroll-related tables:');
        console.log(tables);

        if (tables.length > 0) {
            // Check structure of payroll_records table
            const [structure] = await connection.execute("DESCRIBE payroll_records");
            console.log('\n🏗️ payroll_records table structure:');
            console.table(structure);

            // Check if there are any records
            const [records] = await connection.execute("SELECT COUNT(*) as count FROM payroll_records");
            console.log('\n📊 Payroll records count:', records[0].count);

            if (records[0].count > 0) {
                // Show sample records
                const [samples] = await connection.execute("SELECT * FROM payroll_records LIMIT 3");
                console.log('\n🔍 Sample payroll records:');
                console.table(samples);
            }
        } else {
            console.log('\n❌ No payroll-related tables found');
            
            // Check all tables
            const [allTables] = await connection.execute("SHOW TABLES");
            console.log('\n📋 All available tables:');
            console.table(allTables);
        }

        await connection.end();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

checkPayrollTables();
