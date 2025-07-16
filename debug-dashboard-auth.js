const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection
async function createConnection() {
    return await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        charset: 'utf8mb4'
    });
}

async function checkDashboardAuth() {
    let db;
    try {
        db = await createConnection();
        console.log('🔍 Checking dashboard authentication and dependencies...\n');
        
        // Check if admin user exists
        const [adminUsers] = await db.execute(`
            SELECT id, employee_id, username, role, is_active, last_login
            FROM user_accounts 
            WHERE role = 'admin' AND is_active = 1
        `);
        
        console.log('📋 Admin users found:', adminUsers.length);
        if (adminUsers.length > 0) {
            console.log('   First admin:', {
                id: adminUsers[0].id,
                employee_id: adminUsers[0].employee_id,
                username: adminUsers[0].username,
                role: adminUsers[0].role,
                last_login: adminUsers[0].last_login
            });
        }
        
        // Check active sessions
        const [activeSessions] = await db.execute(`
            SELECT us.id, us.employee_id, us.expires_at, us.is_active,
                   ua.username, ua.role
            FROM user_sessions us
            JOIN user_accounts ua ON us.employee_id = ua.employee_id
            WHERE us.is_active = 1 AND us.expires_at > NOW()
            ORDER BY us.created_at DESC
            LIMIT 5
        `);
        
        console.log('\n🔐 Active sessions:', activeSessions.length);
        activeSessions.forEach((session, index) => {
            console.log(`   Session ${index + 1}:`, {
                employee_id: session.employee_id,
                username: session.username,
                role: session.role,
                expires_at: session.expires_at,
                expires_in_minutes: Math.round((new Date(session.expires_at) - new Date()) / 60000)
            });
        });
        
        // Check attendance records structure
        const [attendanceRecords] = await db.execute(`
            SELECT COUNT(*) as count, 
                   MAX(date) as latest_date,
                   MIN(date) as earliest_date
            FROM attendance_records
        `);
        
        console.log('\n📊 Attendance records:', {
            total_records: attendanceRecords[0].count,
            latest_date: attendanceRecords[0].latest_date,
            earliest_date: attendanceRecords[0].earliest_date
        });
        
        // Check today's attendance
        const today = new Date().toISOString().split('T')[0];
        const [todayAttendance] = await db.execute(`
            SELECT COUNT(*) as count,
                   SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                   SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                   SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
            FROM attendance_records
            WHERE date = ?
        `, [today]);
        
        console.log('\n📅 Today\'s attendance:', {
            total: todayAttendance[0].count,
            present: todayAttendance[0].present,
            absent: todayAttendance[0].absent,
            late: todayAttendance[0].late
        });
        
        // Check employees count
        const [employeeCount] = await db.execute(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active
            FROM employees e
            JOIN user_accounts ua ON e.id = ua.id
            WHERE ua.is_active = 1
        `);
        
        console.log('\n👥 Employee count:', {
            total: employeeCount[0].total,
            active: employeeCount[0].active
        });
        
        console.log('\n✅ Dashboard authentication check completed.');
        
    } catch (error) {
        console.error('❌ Error checking dashboard authentication:', error);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

checkDashboardAuth();
