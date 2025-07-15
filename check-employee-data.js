const mysql = require('mysql2/promise');

async function checkEmployeeData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔍 Checking current employee data in all tables...');
    
    try {
        // Check user_accounts
        console.log('\n1. USER_ACCOUNTS table:');
        const [userAccounts] = await connection.execute(
            'SELECT id, employee_id, username, role FROM user_accounts ORDER BY employee_id'
        );
        userAccounts.forEach(row => {
            console.log(`   ID: ${row.id}, employee_id: "${row.employee_id}", username: "${row.username}", role: "${row.role}"`);
        });

        // Check employees table
        console.log('\n2. EMPLOYEES table:');
        const [employees] = await connection.execute(
            'SELECT employee_code, first_name, last_name, status FROM employees ORDER BY employee_code'
        );
        employees.forEach(row => {
            console.log(`   employee_code: "${row.employee_code}", name: "${row.first_name} ${row.last_name}", status: "${row.status}"`);
        });

        // Find the issue
        console.log('\n🔍 Analysis:');
        const userIds = userAccounts.map(u => u.employee_id);
        const empCodes = employees.map(e => e.employee_code);
        
        console.log('User account employee_ids:', userIds);
        console.log('Employee codes:', empCodes);
        
        const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            console.log('🚨 Duplicate employee_ids in user_accounts:', duplicates);
        }
        
    } catch (error) {
        console.error('❌ Error checking data:', error.message);
    } finally {
        await connection.end();
    }
}

checkEmployeeData();
