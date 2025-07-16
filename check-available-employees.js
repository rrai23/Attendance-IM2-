const db = require('./backend/database/connection');

async function checkEmployees() {
    try {
        const [employees] = await db.execute('SELECT id, employee_id, first_name, last_name, status FROM employees LIMIT 10');
        console.log('Available employees:');
        console.table(employees);
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkEmployees();
