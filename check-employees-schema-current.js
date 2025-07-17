const mysql = require('mysql2/promise');

async function checkEmployeesSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        const [columns] = await connection.execute('DESCRIBE employees');
        console.log('Employees table structure:');
        console.table(columns);

        await connection.end();
    } catch (error) {
        console.error('Error checking employees schema:', error.message);
    }
}

checkEmployeesSchema();
