const mysql = require('mysql2/promise');

async function testUpdatePersistence() {
    let db;
    try {
        console.log('Testing employee update persistence...');

        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        // Get initial data
        const [initialUsers] = await db.query('SELECT id, username, department FROM user_accounts LIMIT 1');
        
        if (!initialUsers || initialUsers.length === 0) {
            console.log('No users found to test with');
            return;
        }

        const user = initialUsers[0];
        
        console.log('Initial user data:', {
            id: user.id,
            username: user.username,
            department: user.department
        });

        // Update the department
        const newDepartment = user.department === 'Test Dept' ? 'Management' : 'Test Dept';
        
        await db.execute(
            'UPDATE user_accounts SET department = ? WHERE id = ?',
            [newDepartment, user.id]
        );
        
        console.log(`Updated department from "${user.department}" to "${newDepartment}"`);

        // Verify the change persisted
        const [updatedUsers] = await db.query('SELECT id, username, department FROM user_accounts WHERE id = ?', [user.id]);
        
        if (!updatedUsers || updatedUsers.length === 0) {
            console.log('❌ User not found after update');
            return;
        }

        const updatedUser = updatedUsers[0];
        
        console.log('Updated user data:', {
            id: updatedUser.id,
            username: updatedUser.username,
            department: updatedUser.department
        });

        if (updatedUser.department === newDepartment) {
            console.log('✅ Update persisted successfully!');
        } else {
            console.log('❌ Update did not persist');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        if (db) {
            try {
                await db.end();
            } catch (closeError) {
                console.error('Error closing database connection:', closeError.message);
            }
        }
        process.exit(0);
    }
}

testUpdatePersistence().catch(error => {
    console.error('Unhandled error:', error.message);
    process.exit(1);
});
