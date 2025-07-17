/**
 * Debug employee IDs to understand the ID structure
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function debugEmployeeIds() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // Get all employees with their ID fields
        const [employees] = await connection.execute(`
            SELECT 
                id,
                employee_id,
                first_name,
                last_name,
                email,
                status
            FROM employees 
            ORDER BY id
        `);

        console.log('\n📋 Current employee ID structure:');
        console.log('DB ID | Employee ID | Name | Status');
        console.log('------|-------------|------|--------');
        
        employees.forEach(emp => {
            const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'No name';
            console.log(`${emp.id.toString().padEnd(5)} | ${(emp.employee_id || 'NULL').toString().padEnd(11)} | ${name.padEnd(20)} | ${emp.status || 'NULL'}`);
        });

        console.log(`\nTotal employees: ${employees.length}`);

        if (employees.length > 0) {
            console.log('\n🔍 Sample employee structure:');
            console.log(JSON.stringify(employees[0], null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugEmployeeIds();
