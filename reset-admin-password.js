const bcrypt = require('bcryptjs');
const db = require('./backend/database/connection');

async function resetAdminPassword() {
    try {
        console.log('🔗 Connecting to database...');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        // Update the admin user password
        await db.execute(
            'UPDATE user_accounts SET password_hash = ? WHERE username = ?',
            [hashedPassword, 'admin']
        );
        
        console.log('✅ Admin password reset to: admin123');
        
        // Verify the user exists
        const result = await db.execute('SELECT username, employee_id, role FROM user_accounts WHERE username = ?', ['admin']);
        if (result.length > 0) {
            console.log('✅ Admin user found:', result[0]);
        } else {
            console.log('❌ Admin user not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        process.exit(1);
    }
}

resetAdminPassword();
