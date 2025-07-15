const db = require('./backend/database/connection');

async function testJoinQuery() {
    try {
        console.log('🧪 Testing JOIN query...');
        
        // Test the exact query from auth.js
        const username = 'admin';
        const query = `
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.full_name,
                e.email,
                e.department,
                e.position,
                e.date_hired as hire_date,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_code
            WHERE ua.username = ? AND ua.is_active = TRUE AND e.status = 'active'
        `;
        
        console.log('\n📋 Executing query:', query);
        console.log('📋 Parameters:', [username]);
        
        const result = await db.execute(query, [username]);
        const users = Array.isArray(result[0]) ? result[0] : result;
        
        console.log('\n📊 Query results:');
        console.log('=================');
        console.log('Number of results:', users.length);
        
        if (users.length > 0) {
            const user = users[0];
            console.log('\n✅ User found:');
            console.log('Username:', user.username);
            console.log('Employee ID:', user.employee_id);
            console.log('Full Name:', user.full_name);
            console.log('First Name:', user.first_name);
            console.log('Last Name:', user.last_name);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Has password_hash:', !!user.password_hash);
            console.log('Password hash length:', user.password_hash ? user.password_hash.length : 0);
        } else {
            console.log('\n❌ No users found');
        }
        
        console.log('\n🎉 JOIN query test complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing JOIN query:', error);
        process.exit(1);
    }
}

testJoinQuery();
