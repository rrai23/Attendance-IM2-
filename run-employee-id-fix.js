const mysql = require('mysql2/promise');

async function fixEmployeeIdMismatch() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔧 Fixing employee ID mismatch between tables...');
    
    try {
        // Fix user_accounts table
        console.log('1. Updating user_accounts table...');
        const result1 = await connection.execute(`
            UPDATE user_accounts 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                ELSE employee_id
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log('   ✅ Updated', result1[0].affectedRows, 'rows in user_accounts');

        // Fix user_sessions table
        console.log('2. Updating user_sessions table...');
        const result2 = await connection.execute(`
            UPDATE user_sessions 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                ELSE employee_id
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log('   ✅ Updated', result2[0].affectedRows, 'rows in user_sessions');

        // Fix attendance_records table
        console.log('3. Updating attendance_records table...');
        const result3 = await connection.execute(`
            UPDATE attendance_records 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                ELSE employee_id
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log('   ✅ Updated', result3[0].affectedRows, 'rows in attendance_records');

        console.log('\n🎉 Employee ID mismatch fixed!');
        console.log('All tables now use consistent employee_code format (EMP001, EMP002, etc.)');
        
    } catch (error) {
        console.error('❌ Error fixing employee ID mismatch:', error.message);
    } finally {
        await connection.end();
    }
}

fixEmployeeIdMismatch();
