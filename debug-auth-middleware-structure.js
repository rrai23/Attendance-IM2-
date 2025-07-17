console.log('🔍 Starting Auth Middleware Debug Test');

const mysql = require('mysql2/promise');

async function debugAuthMiddleware() {
    let connection;
    
    try {
        // Create database connection (same as backend)
        connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'bricks_attendance',
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database');

        // Test exact query from auth middleware
        console.log('\n🔍 Testing AUTH MIDDLEWARE query structure');
        
        const authQuery = `
            SELECT 
                ua.*,
                COALESCE(e.first_name, ua.first_name) as first_name,
                COALESCE(e.last_name, ua.last_name) as last_name,
                COALESCE(e.full_name, ua.full_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                COALESCE(e.hire_date, ua.hire_date) as hire_date,
                COALESCE(e.status, ua.employee_status) as employee_status
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ? AND ua.is_active = TRUE
        `;
        
        const result = await connection.execute(authQuery, ['admin_001']);
        
        console.log('📊 MySQL2 result structure:', {
            resultType: typeof result,
            resultIsArray: Array.isArray(result),
            resultLength: result?.length,
            result0Type: result && result[0] ? typeof result[0] : 'undefined',
            result0IsArray: result && result[0] ? Array.isArray(result[0]) : false,
            result0Length: result && result[0] && Array.isArray(result[0]) ? result[0].length : 'N/A'
        });
        
        console.log('🔍 Full result preview:', result);
        
        // Test current middleware logic
        let users;
        if (Array.isArray(result) && result.length > 0) {
            users = Array.isArray(result[0]) ? result[0] : result;
        } else {
            users = [];
        }
        
        console.log('\n📊 CURRENT middleware logic result:', {
            usersType: typeof users,
            usersIsArray: Array.isArray(users),
            usersLength: users?.length,
            condition: '!users || users.length === 0',
            conditionResult: !users || users.length === 0,
            wouldReject: !users || users.length === 0
        });
        
        // Test FIXED logic (mysql2 returns [rows, fields])
        console.log('\n🔧 FIXED logic test:');
        const rows = result[0]; // mysql2 format: [rows, fields]
        console.log('📊 Fixed logic result:', {
            rowsType: typeof rows,
            rowsIsArray: Array.isArray(rows),
            rowsLength: rows?.length,
            condition: '!rows || rows.length === 0',
            conditionResult: !rows || rows.length === 0,
            wouldReject: !rows || rows.length === 0
        });
        
        if (rows && rows.length > 0) {
            console.log('✅ User found with fixed logic:', {
                employee_id: rows[0].employee_id,
                username: rows[0].username,
                role: rows[0].role,
                is_active: rows[0].is_active
            });
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

debugAuthMiddleware();
