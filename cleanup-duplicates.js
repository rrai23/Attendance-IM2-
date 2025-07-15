const mysql = require('mysql2/promise');

async function cleanupDuplicateEmployeeIds() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🧹 CLEANING UP DUPLICATE EMPLOYEE IDs');
    console.log('=====================================\n');
    
    try {
        // Show current duplicates
        console.log('📋 Current duplicate data:');
        console.log('\nuser_accounts table:');
        const [users] = await connection.execute(
            'SELECT id, employee_id, username, role FROM user_accounts WHERE employee_id IN ("emp_001", "EMP001", "emp_002", "EMP002") ORDER BY employee_id, id'
        );
        users.forEach(user => {
            console.log(`  ID ${user.id}: employee_id="${user.employee_id}", username="${user.username}", role="${user.role}"`);
        });

        console.log('\nemployees table:');
        const [employees] = await connection.execute(
            'SELECT employee_code, first_name, last_name, email FROM employees WHERE employee_code IN ("emp_001", "EMP001", "emp_002", "EMP002") ORDER BY employee_code'
        );
        employees.forEach(emp => {
            console.log(`  employee_code="${emp.employee_code}", name="${emp.first_name} ${emp.last_name}", email="${emp.email}"`);
        });

        console.log('\n🎯 RECOMMENDED CLEANUP STRATEGY:');
        console.log('Keep the primary admin records and remove duplicates\n');

        // Strategy: Keep emp_001 records (they seem to be the primary ones) and remove EMP001 duplicates
        console.log('1️⃣ Removing duplicate EMP001 record from user_accounts...');
        const deleteUserResult = await connection.execute(
            'DELETE FROM user_accounts WHERE employee_id = "EMP001"'
        );
        console.log(`   ✅ Deleted ${deleteUserResult[0].affectedRows} duplicate user account(s)`);

        console.log('2️⃣ Removing duplicate EMP002 record from user_accounts...');
        const deleteUser2Result = await connection.execute(
            'DELETE FROM user_accounts WHERE employee_id = "EMP002"'
        );
        console.log(`   ✅ Deleted ${deleteUser2Result[0].affectedRows} duplicate user account(s)`);

        console.log('3️⃣ Removing duplicate EMP001 record from employees...');
        const deleteEmpResult = await connection.execute(
            'DELETE FROM employees WHERE employee_code = "EMP001"'
        );
        console.log(`   ✅ Deleted ${deleteEmpResult[0].affectedRows} duplicate employee record(s)`);

        console.log('4️⃣ Removing duplicate EMP002 record from employees...');
        const deleteEmp2Result = await connection.execute(
            'DELETE FROM employees WHERE employee_code = "EMP002"'
        );
        console.log(`   ✅ Deleted ${deleteEmp2Result[0].affectedRows} duplicate employee record(s)`);

        // Clean up any related records
        console.log('5️⃣ Cleaning up related records in user_sessions...');
        const cleanSessionsResult = await connection.execute(
            'DELETE FROM user_sessions WHERE employee_id IN ("EMP001", "EMP002")'
        );
        console.log(`   ✅ Cleaned up ${cleanSessionsResult[0].affectedRows} session record(s)`);

        console.log('\n📋 Data after cleanup:');
        const [cleanUsers] = await connection.execute(
            'SELECT id, employee_id, username, role FROM user_accounts ORDER BY id'
        );
        console.log('user_accounts:');
        cleanUsers.forEach(user => {
            console.log(`  ID ${user.id}: employee_id="${user.employee_id}", username="${user.username}"`);
        });

        console.log('\n🎉 CLEANUP COMPLETED!');
        console.log('✅ Duplicate records removed');
        console.log('✅ Database is ready for standardization');
        console.log('\n🚀 Now run the standardization script to convert emp_001 → EMP001');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    } finally {
        await connection.end();
    }
}

cleanupDuplicateEmployeeIds();
