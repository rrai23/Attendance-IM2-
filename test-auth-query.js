const db = require('./backend/database/connection');

async function testQuery() {
    try {
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
        `, ['admin']);
        
        console.log('JOIN query result:');
        console.log('Length:', result.length);
        if (result.length > 0) {
            console.log('First result:', result[0]);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testQuery();
