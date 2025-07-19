const db = require('./backend/database/connection');
const bcrypt = require('bcryptjs');

async function debugPasswordChangeError() {
    try {
        console.log('🔍 Debugging password change error for EMP250013...\n');
        
        // Step 1: Check if the user exists
        console.log('Step 1: Checking if user EMP250013 exists...');
        const userResult = await db.execute(
            'SELECT * FROM user_accounts WHERE employee_id = ?',
            ['EMP250013']
        );
        
        console.log('Database query result:', userResult);
        const users = userResult; // The result is already an array
        
        if (!users || users.length === 0) {
            console.log('❌ User EMP250013 not found in user_accounts table');
            
            // Check employees table
            const employeeResult = await db.execute(
                'SELECT * FROM employees WHERE employee_id = ?',
                ['EMP250013']
            );
            const employees = employeeResult;
            
            if (!employees || employees.length === 0) {
                console.log('❌ Employee EMP250013 not found in employees table either');
            } else {
                console.log('✅ Employee EMP250013 found in employees table:', {
                    name: employees[0].first_name + ' ' + employees[0].last_name,
                    email: employees[0].email,
                    status: employees[0].status
                });
                console.log('❌ But no user account exists for this employee');
            }
            return;
        }
        
        const user = users[0];
        console.log('✅ User EMP250013 found:', {
            username: user.username,
            role: user.role,
            is_active: user.is_active,
            has_password: !!user.password_hash
        });
        
        // Step 2: Test password validation
        console.log('\nStep 2: Testing current password validation...');
        const testPassword = 'testPassword123'; // You should replace with the actual current password
        
        if (user.password_hash) {
            const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
            console.log('Password validation result:', isPasswordValid);
        } else {
            console.log('❌ No password hash found for user');
        }
        
        // Step 3: Test password hashing
        console.log('\nStep 3: Testing password hashing...');
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash('newTestPassword123', saltRounds);
        console.log('✅ Password hashing successful, hash length:', newPasswordHash.length);
        
        // Step 4: Test database update (dry run)
        console.log('\nStep 4: Testing database update query...');
        try {
            const updateResult = await db.execute(
                'UPDATE user_accounts SET updated_at = NOW() WHERE employee_id = ?',
                ['EMP250013']
            );
            console.log('✅ Database update test successful:', {
                affectedRows: updateResult[0].affectedRows,
                changedRows: updateResult[0].changedRows
            });
        } catch (updateError) {
            console.log('❌ Database update test failed:', updateError.message);
        }
        
        // Step 5: Check user_sessions table
        console.log('\nStep 5: Checking user sessions...');
        const sessionResult = await db.execute(
            'SELECT * FROM user_sessions WHERE employee_id = ?',
            ['EMP250013']
        );
        const sessions = sessionResult;
        console.log('User sessions found:', sessions ? sessions.length : 0);
        
    } catch (error) {
        console.error('❌ Debug error:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        process.exit(0);
    }
}

debugPasswordChangeError();
