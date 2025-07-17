const mysql = require('mysql2/promise');

async function checkEmployeeWages() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('Checking employee wage information...');

        const [result] = await connection.execute(`
            SELECT employee_id, full_name, wage, salary_type 
            FROM employees 
            WHERE employee_id IN ('admin_001', 'EMP001', 'EMP002', 'jane.doe', 'john.smith', 'EMP250005', 'EMP250007', 'EMP250014')
            ORDER BY employee_id
        `);
        
        console.log('Employee wage info:');
        result.forEach(emp => {
            console.log(`  ${emp.employee_id}: ${emp.full_name} - $${emp.wage || 'NO WAGE'} (${emp.salary_type || 'NO TYPE'})`);
        });

    } catch (error) {
        console.error('Error checking wages:', error);
    } finally {
        await connection.end();
    }
}

checkEmployeeWages();
