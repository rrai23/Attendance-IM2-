// Check what employees exist and their ID structures
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mysql123',
    database: 'attendance_system'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('✅ Connected to database');

    // Get all employees with both ID fields
    db.execute('SELECT id, employee_id, first_name, last_name, status FROM employees ORDER BY id', (err, results) => {
        if (err) {
            console.error('Query error:', err);
            return;
        }

        console.log('\n📊 Current Employees Table:');
        console.log('DB_ID | EMPLOYEE_ID | NAME | STATUS');
        console.log('------|-------------|------|-------');
        
        results.forEach(emp => {
            console.log(`${emp.id.toString().padEnd(5)} | ${emp.employee_id.padEnd(11)} | ${(emp.first_name + ' ' + emp.last_name).padEnd(15)} | ${emp.status}`);
        });

        console.log('\n🔍 Key insights:');
        console.log('- Frontend should send EMPLOYEE_ID (like EMP250001)');
        console.log('- Backend DELETE route expects EMPLOYEE_ID parameter');
        console.log('- If frontend sends DB_ID (like 1,2,3), it will fail');
        
        db.end();
    });
});
