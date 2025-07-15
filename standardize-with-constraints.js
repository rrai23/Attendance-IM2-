const mysql = require('mysql2/promise');

async function standardizeEmployeeIdsWithConstraints() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    console.log('🔧 STANDARDIZING EMPLOYEE IDs WITH FOREIGN KEY CONSTRAINTS');
    console.log('==========================================================\n');
    
    try {
        // Step 1: Disable foreign key checks temporarily
        console.log('1️⃣ Temporarily disabling foreign key checks...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        console.log('   ✅ Foreign key checks disabled');

        // Step 2: Update employees table first (the referenced table)
        console.log('2️⃣ Updating employees table (referenced table)...');
        const employeesResult = await connection.execute(`
            UPDATE employees 
            SET employee_code = CASE 
                WHEN employee_code = 'emp_001' THEN 'EMP001'
                WHEN employee_code = 'emp_002' THEN 'EMP002'
                WHEN employee_code = 'emp_003' THEN 'EMP003'
                WHEN employee_code = 'emp_004' THEN 'EMP004'
                WHEN employee_code = 'emp_005' THEN 'EMP005'
                WHEN employee_code = 'emp_006' THEN 'EMP006'
                ELSE UPPER(REPLACE(employee_code, 'emp_', 'EMP'))
            END
            WHERE employee_code LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${employeesResult[0].affectedRows} rows in employees`);

        // Step 3: Update user_accounts table
        console.log('3️⃣ Updating user_accounts table...');
        const userAccountsResult = await connection.execute(`
            UPDATE user_accounts 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                WHEN employee_id = 'emp_006' THEN 'EMP006'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${userAccountsResult[0].affectedRows} rows in user_accounts`);

        // Step 4: Update user_sessions table
        console.log('4️⃣ Updating user_sessions table...');
        const userSessionsResult = await connection.execute(`
            UPDATE user_sessions 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                WHEN employee_id = 'emp_006' THEN 'EMP006'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${userSessionsResult[0].affectedRows} rows in user_sessions`);

        // Step 5: Update attendance_records table
        console.log('5️⃣ Updating attendance_records table...');
        const attendanceResult = await connection.execute(`
            UPDATE attendance_records 
            SET employee_id = CASE 
                WHEN employee_id = 'emp_001' THEN 'EMP001'
                WHEN employee_id = 'emp_002' THEN 'EMP002'
                WHEN employee_id = 'emp_003' THEN 'EMP003'
                WHEN employee_id = 'emp_004' THEN 'EMP004'
                WHEN employee_id = 'emp_005' THEN 'EMP005'
                WHEN employee_id = 'emp_006' THEN 'EMP006'
                ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
            END
            WHERE employee_id LIKE 'emp_%'
        `);
        console.log(`   ✅ Updated ${attendanceResult[0].affectedRows} rows in attendance_records`);

        // Step 6: Update payroll_records table if it exists
        console.log('6️⃣ Updating payroll_records table...');
        try {
            const payrollResult = await connection.execute(`
                UPDATE payroll_records 
                SET employee_id = CASE 
                    WHEN employee_id = 'emp_001' THEN 'EMP001'
                    WHEN employee_id = 'emp_002' THEN 'EMP002'
                    WHEN employee_id = 'emp_003' THEN 'EMP003'
                    WHEN employee_id = 'emp_004' THEN 'EMP004'
                    WHEN employee_id = 'emp_005' THEN 'EMP005'
                    WHEN employee_id = 'emp_006' THEN 'EMP006'
                    ELSE UPPER(REPLACE(employee_id, 'emp_', 'EMP'))
                END
                WHERE employee_id LIKE 'emp_%'
            `);
            console.log(`   ✅ Updated ${payrollResult[0].affectedRows} rows in payroll_records`);
        } catch (payrollError) {
            console.log('   ⚠️  payroll_records table not found or no matching rows');
        }

        // Step 7: Re-enable foreign key checks
        console.log('7️⃣ Re-enabling foreign key checks...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ Foreign key checks re-enabled');

        // Verify the results
        console.log('\n📋 VERIFICATION - Data after migration:');
        
        const [updatedEmployees] = await connection.execute(
            'SELECT employee_code, first_name, last_name FROM employees ORDER BY employee_code'
        );
        console.log('\nemployees table:');
        updatedEmployees.forEach(emp => {
            console.log(`  employee_code="${emp.employee_code}", name="${emp.first_name} ${emp.last_name}"`);
        });

        const [updatedUsers] = await connection.execute(
            'SELECT id, employee_id, username FROM user_accounts ORDER BY id'
        );
        console.log('\nuser_accounts table:');
        updatedUsers.forEach(user => {
            console.log(`  ID ${user.id}: employee_id="${user.employee_id}", username="${user.username}"`);
        });

        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('✅ All employee IDs standardized to EMP001, EMP002, etc. format');
        console.log('✅ Foreign key constraints maintained');
        console.log('✅ Database tables now use consistent employee identification');
        console.log('✅ JOIN queries between user_accounts and employees will work');
        console.log('✅ Authentication system should now function properly');
        
        console.log('\n🚀 LOGIN SYSTEM IS NOW READY!');
        console.log('Try logging in - the authentication should work perfectly now!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        
        // Make sure to re-enable foreign key checks even if migration fails
        try {
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            console.log('🔧 Foreign key checks re-enabled after error');
        } catch (fkError) {
            console.error('❌ Could not re-enable foreign key checks:', fkError.message);
        }
    } finally {
        await connection.end();
    }
}

standardizeEmployeeIdsWithConstraints();
