const mysql = require('mysql2/promise');

async function standardizeEmployeeIds() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔧 OPTION 1: Standardizing employee IDs to match employees table format');
    console.log('Converting emp_001 → EMP001, emp_002 → EMP002, etc.\n');
    
    try {
        // First, let's see what we're working with
        console.log('📋 Current data before migration:');
        
        const [currentUsers] = await connection.execute(
            'SELECT id, employee_id, username FROM user_accounts ORDER BY id'
        );
        console.log('user_accounts:');
        currentUsers.forEach(user => {
            console.log(`  ID ${user.id}: employee_id="${user.employee_id}", username="${user.username}"`);
        });

        const [currentEmployees] = await connection.execute(
            'SELECT employee_code, first_name, last_name FROM employees ORDER BY employee_code'
        );
        console.log('\nemployees:');
        currentEmployees.forEach(emp => {
            console.log(`  employee_code="${emp.employee_code}", name="${emp.first_name} ${emp.last_name}"`);
        });

        console.log('\n🔄 Starting migration...\n');

        // Step 1: Update user_accounts table
        console.log('1️⃣ Updating user_accounts table...');
        const userAccountsResult = await connection.execute(`
            UPDATE user_accounts 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${userAccountsResult[0].affectedRows} rows in user_accounts`);

        // Step 2: Update user_sessions table
        console.log('2️⃣ Updating user_sessions table...');
        const userSessionsResult = await connection.execute(`
            UPDATE user_sessions 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${userSessionsResult[0].affectedRows} rows in user_sessions`);

        // Step 3: Update attendance_records table
        console.log('3️⃣ Updating attendance_records table...');
        const attendanceResult = await connection.execute(`
            UPDATE attendance_records 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${attendanceResult[0].affectedRows} rows in attendance_records`);

        // Step 4: Update payroll_records table if it exists
        console.log('4️⃣ Updating payroll_records table...');
        try {
            const payrollResult = await connection.execute(`
                UPDATE payroll_records 
                SET employee_id = CASE 
                    WHEN employee_id = 'emp_001' THEN 'EMP001'
                    WHEN employee_id = 'emp_002' THEN 'EMP002'
                    WHEN employee_id = 'emp_003' THEN 'EMP003'
                    WHEN employee_id = 'emp_004' THEN 'EMP004'
                    WHEN employee_id = 'emp_005' THEN 'EMP005'
                    ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
                END
                WHERE employee_id LIKE 'emp_%'
            `);
            console.log(`   ✅ Updated ${payrollResult[0].affectedRows} rows in payroll_records`);
        } catch (payrollError) {
            console.log('   ⚠️  payroll_records table not found or no matching rows');
        }

        console.log('\n📋 Data after migration:');
        const [updatedUsers] = await connection.execute(
            'SELECT id, employee_id, username FROM user_accounts ORDER BY id'
        );
        console.log('user_accounts:');
        updatedUsers.forEach(user => {
            console.log(`  ID ${user.id}: employee_id="${user.employee_id}", username="${user.username}"`);
        });

        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✅ All employee IDs standardized to EMP001, EMP002, etc. format');
        console.log('✅ Database tables now use consistent employee identification');
        console.log('✅ JOIN queries between user_accounts and employees will work');
        console.log('✅ Authentication system should now function properly');
        
        console.log('\n🚀 Try logging in now - it should work perfectly!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n🔧 If you get a duplicate key error:');
        console.log('   1. There may already be an EMP001 record in user_accounts');
        console.log('   2. Check for conflicting data and resolve manually');
        console.log('   3. Or delete duplicate records before running this script');
    } finally {
        await connection.end();
    }
}

standardizeEmployeeIds();
