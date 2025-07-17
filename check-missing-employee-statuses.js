const mysql = require('mysql2/promise');

async function checkMissingEmployeeStatuses() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('Checking status of missing employees...');

        const [result] = await connection.execute(`
            SELECT employee_id, full_name, status 
            FROM employees 
            WHERE employee_id IN ('EMP001', 'john.smith', 'EMP003', 'EMP004', 'EMP005')
            ORDER BY employee_id
        `);
        
        console.log('Missing employee statuses:');
        result.forEach(emp => {
            console.log(`  ${emp.employee_id}: ${emp.full_name} - STATUS: ${emp.status}`);
        });

        console.log('\nAll employee statuses:');
        const [allEmployees] = await connection.execute(`
            SELECT status, COUNT(*) as count 
            FROM employees 
            GROUP BY status
            ORDER BY status
        `);
        
        allEmployees.forEach(status => {
            console.log(`  ${status.status}: ${status.count} employees`);
        });

    } catch (error) {
        console.error('Error checking statuses:', error);
    } finally {
        await connection.end();
    }
}

checkMissingEmployeeStatuses();
