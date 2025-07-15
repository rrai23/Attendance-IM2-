const mysql = require('mysql2/promise');

async function quickDBCheck() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔍 Quick database structure check for emp_001');
    
    // Check user_accounts
    const [userAccount] = await connection.execute(
        'SELECT employee_id, username FROM user_accounts WHERE employee_id = ?', 
        ['emp_001']
    );
    console.log('User account:', userAccount[0]);

    // Check employees table structure
    const [employeeFields] = await connection.execute('DESCRIBE employees');
    console.log('\nEmployees table fields:');
    employeeFields.forEach(field => console.log(`  ${field.Field} (${field.Type})`));

    // Check for emp_001 in employees with different field names
    const [empByEmployeeId] = await connection.execute(
        'SELECT * FROM employees WHERE employee_id = ? LIMIT 1', 
        ['emp_001']
    );
    console.log('\nBy employee_id:', empByEmployeeId[0] ? 'Found' : 'Not found');

    const [empByEmployeeCode] = await connection.execute(
        'SELECT * FROM employees WHERE employee_code = ? LIMIT 1', 
        ['emp_001']
    );
    console.log('By employee_code:', empByEmployeeCode[0] ? 'Found' : 'Not found');

    await connection.end();
}

quickDBCheck().catch(console.error);
