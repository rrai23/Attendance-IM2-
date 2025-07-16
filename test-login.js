const bcrypt = require('bcryptjs');
const db = require('./backend/database/connection');

async function testLogin() {
    try {
        const username = 'admin';
        const password = 'admin123';
        
        console.log('🔐 Testing login for username:', username);
        
        // Get user from database
        const result = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.full_name,
                e.email,
                e.department,
                e.position,
                e.hire_date,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.username = ? AND ua.is_active = TRUE AND e.status = 'active'
        `, [username]);
        
        console.log('🔍 Query result length:', result.length);
        
        if (result.length === 0) {
            console.log('❌ No user found');
            return;
        }
        
        const user = result[0];
        console.log('✅ User found:', user.username);
        
        // Test password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔑 Password validation result:', isPasswordValid);
        
        if (isPasswordValid) {
            console.log('✅ Login would be successful!');
        } else {
            console.log('❌ Password is incorrect');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during login test:', error);
        process.exit(1);
    }
}

testLogin();
