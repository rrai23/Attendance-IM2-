const db = require('./backend/database/connection');

async function reactivateAdmin() {
    try {
        // Reactivate the admin employee
        await db.execute('UPDATE employees SET status = ? WHERE employee_id = ?', ['active', 'admin_001']);
        console.log('✅ Admin employee reactivated');

        // Reactivate admin user account
        await db.execute('UPDATE user_accounts SET is_active = TRUE WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Admin user account reactivated');

        // Clear any existing sessions
        await db.execute('DELETE FROM user_sessions WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Cleared old admin sessions');

        // Verify admin status
        const [admin] = await db.execute('SELECT * FROM employees WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Admin employee status:', admin[0].status);

        const [userAccount] = await db.execute('SELECT * FROM user_accounts WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Admin user account status:', {
            username: userAccount[0].username,
            role: userAccount[0].role,
            is_active: userAccount[0].is_active
        });

    } catch (error) {
        console.error('❌ Error reactivating admin:', error);
    }
    process.exit(0);
}

reactivateAdmin();
