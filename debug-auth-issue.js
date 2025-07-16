const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAuth() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Connected to database');
    
    try {
        // Check admin user
        const [adminUsers] = await connection.execute(`
            SELECT 
                ua.id,
                ua.employee_id,
                ua.username,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                e.full_name,
                e.department,
                e.position,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.role = 'admin'
        `);

        console.log('👤 Admin users found:', adminUsers.length);
        for (const user of adminUsers) {
            console.log(`\n📋 Admin User: ${user.username}`);
            console.log(`   - Employee ID: ${user.employee_id}`);
            console.log(`   - Full Name: ${user.full_name}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - Active: ${user.is_active}`);
            console.log(`   - Employee Status: ${user.employee_status}`);
            console.log(`   - Last Login: ${user.last_login}`);
            console.log(`   - Failed Attempts: ${user.failed_login_attempts}`);
            console.log(`   - Department: ${user.department}`);
            console.log(`   - Position: ${user.position}`);
        }

        // Check sessions
        const [sessions] = await connection.execute(`
            SELECT 
                us.id,
                us.employee_id,
                us.token_hash,
                us.expires_at,
                us.is_active,
                us.created_at,
                us.user_agent,
                us.ip_address
            FROM user_sessions us
            WHERE us.employee_id = 'admin_001'
            ORDER BY us.created_at DESC
            LIMIT 5
        `);

        console.log(`\n📱 Recent sessions for admin_001: ${sessions.length}`);
        for (const session of sessions) {
            console.log(`\n🔐 Session: ${session.id}`);
            console.log(`   - Token: ${session.token_hash.substring(0, 20)}...`);
            console.log(`   - Expires: ${session.expires_at}`);
            console.log(`   - Active: ${session.is_active}`);
            console.log(`   - Created: ${session.created_at}`);
            console.log(`   - User Agent: ${session.user_agent?.substring(0, 50)}...`);
            console.log(`   - IP: ${session.ip_address}`);
        }

        // Test attendance record
        const [attendanceRecord] = await connection.execute(`
            SELECT 
                ar.id,
                ar.employee_id,
                ar.date,
                ar.status,
                ar.created_at,
                e.full_name as employee_name
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            WHERE ar.id = 2
        `);

        console.log(`\n📅 Attendance Record ID 2:`, attendanceRecord.length > 0 ? attendanceRecord[0] : 'Not found');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

testAuth().catch(console.error);
