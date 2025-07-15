const mysql = require('mysql2/promise');

async function debugJoinIssue() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔍 Debugging JOIN issue between user_accounts and employees tables');
    console.log('==================================================================');

    // Check user_accounts table
    console.log('\n1. USER_ACCOUNTS table data:');
    const [userAccounts] = await connection.execute(
        'SELECT id, employee_id, username, role, is_active FROM user_accounts LIMIT 5'
    );
    console.table(userAccounts);

    // Check employees table  
    console.log('\n2. EMPLOYEES table data:');
    const [employees] = await connection.execute(
        'SELECT employee_code, first_name, last_name, status FROM employees LIMIT 5'
    );
    console.table(employees);

    // Test the JOIN that's failing
    console.log('\n3. Testing the current JOIN query:');
    const [joinTest] = await connection.execute(`
        SELECT 
            ua.id, ua.employee_id, ua.username,
            e.employee_code, e.first_name, e.last_name
        FROM user_accounts ua
        JOIN employees e ON ua.employee_id = e.employee_code
        WHERE ua.employee_id = ? AND ua.is_active = TRUE AND e.status = 'active'
    `, ['emp_001']);
    console.log('JOIN result:', joinTest);

    // Test alternative JOIN
    console.log('\n4. Testing alternative JOIN (employee_id = employee_id):');
    const [altJoinTest] = await connection.execute(`
        SELECT 
            ua.id, ua.employee_id, ua.username,
            e.employee_code, e.first_name, e.last_name
        FROM user_accounts ua
        JOIN employees e ON ua.employee_id = e.employee_id
        WHERE ua.employee_id = ? AND ua.is_active = TRUE AND e.status = 'active'
    `, ['emp_001']);
    console.log('Alternative JOIN result:', altJoinTest);

    // Check if there's a mismatch
    console.log('\n5. Checking for employee_id matches:');
    const [userAccount] = await connection.execute(
        'SELECT employee_id FROM user_accounts WHERE employee_id = ?', ['emp_001']
    );
    const [employee] = await connection.execute(
        'SELECT employee_id, employee_code FROM employees WHERE employee_id = ? OR employee_code = ?', 
        ['emp_001', 'emp_001']
    );
    console.log('User account employee_id:', userAccount[0]?.employee_id);
    console.log('Employee record:', employee[0]);

    await connection.end();
}

debugJoinIssue().catch(console.error);
