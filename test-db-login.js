const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testDatabaseLogin() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root', 
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('🔐 Testing database login for admin...');
        
        // Test the exact query from auth.js
        const [users] = await db.execute(`
            SELECT 
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(ua.phone, e.phone) as phone,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                COALESCE(e.hire_date, ua.hire_date) as hire_date,
                COALESCE(e.status, ua.employee_status) as employee_status
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.username = ? AND ua.is_active = TRUE
        `, ['admin']);

        console.log('🔍 Query result:', {
            found: users.length > 0,
            userCount: users.length
        });

        if (users.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = users[0];
        console.log('👤 User found:', {
            id: user.id,
            employee_id: user.employee_id,
            username: user.username,
            role: user.role,
            is_active: user.is_active,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            has_password_hash: !!user.password_hash
        });

        // Test password verification
        try {
            const isPasswordValid = await bcrypt.compare('admin123', user.password_hash);
            console.log('🔑 Password verification (admin123):', isPasswordValid);
            
            if (!isPasswordValid) {
                // Try other common passwords
                const commonPasswords = ['admin', 'password', '123456'];
                for (const pwd of commonPasswords) {
                    const isValid = await bcrypt.compare(pwd, user.password_hash);
                    console.log(`🔑 Password verification (${pwd}):`, isValid);
                    if (isValid) break;
                }
            }
        } catch (bcryptError) {
            console.error('❌ Bcrypt error:', bcryptError.message);
        }

    } catch (error) {
        console.error('💥 Database error:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
    } finally {
        await db.end();
    }
}

testDatabaseLogin();
