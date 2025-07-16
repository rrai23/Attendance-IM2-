const db = require('./backend/database/connection');
const bcrypt = require('bcryptjs');

async function restoreAdmin() {
    try {
        // First, reactivate the admin employee
        await db.execute('UPDATE employees SET status = ? WHERE employee_id = ?', ['active', 'admin_001']);
        console.log('✅ Admin employee reactivated');

        // Reactivate admin user account
        await db.execute('UPDATE user_accounts SET is_active = TRUE WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Admin user account reactivated');

        // Clear any existing sessions
        await db.execute('DELETE FROM user_sessions WHERE employee_id = ?', ['admin_001']);
        console.log('✅ Cleared old admin sessions');

        // Verify admin exists
        const [admin] = await db.execute('SELECT * FROM employees WHERE employee_id = ?', ['admin_001']);
        if (admin.length > 0) {
            console.log('✅ Admin user restored successfully:', admin[0]);
        } else {
            console.log('❌ Admin user not found, creating new one...');
            
            // Create admin employee
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await db.execute(`
                INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hire_date, status, wage, employment_type, shift_schedule) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, ['admin_001', 'System', 'Administrator', 'admin@brickscompany.com', 'ADMIN', 'System Administrator', new Date(), 'active', 0, 'full-time', 'day']);

            // Create admin user account
            await db.execute(`
                INSERT INTO user_accounts (employee_id, username, password_hash, role, is_active) 
                VALUES (?, ?, ?, ?, ?)
            `, ['admin_001', 'admin', hashedPassword, 'admin', true]);

            console.log('✅ New admin user created');
        }

        // Check user account
        const [userAccount] = await db.execute('SELECT * FROM user_accounts WHERE employee_id = ?', ['admin_001']);
        if (userAccount.length > 0) {
            console.log('✅ Admin user account verified:', {
                username: userAccount[0].username,
                role: userAccount[0].role,
                is_active: userAccount[0].is_active
            });
        }

    } catch (error) {
        console.error('❌ Error restoring admin:', error);
    }
    process.exit(0);
}

restoreAdmin();
