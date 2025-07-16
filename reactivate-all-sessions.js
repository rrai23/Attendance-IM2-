const mysql = require('mysql2/promise');
require('dotenv').config();

async function reactivateAllSessions() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('🔗 Connected to database');
        
        // First, check current session status
        const [currentSessions] = await connection.execute(`
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
            FROM user_sessions
        `);
        
        console.log('📊 Current session statistics:');
        console.log(`   Total sessions: ${currentSessions[0].total}`);
        console.log(`   Active sessions: ${currentSessions[0].active}`);
        console.log(`   Inactive sessions: ${currentSessions[0].inactive}`);
        
        // Get all users with their current sessions
        const [userSessions] = await connection.execute(`
            SELECT us.id, us.employee_id, us.token_hash, us.expires_at, us.is_active, us.created_at,
                   e.full_name, e.role, e.status as employee_status
            FROM user_sessions us
            JOIN employees e ON us.employee_id = e.employee_id
            WHERE us.expires_at > NOW()
            ORDER BY us.employee_id, us.created_at DESC
        `);
        
        console.log('\n👥 User sessions analysis:');
        const userGroups = {};
        userSessions.forEach(session => {
            if (!userGroups[session.employee_id]) {
                userGroups[session.employee_id] = {
                    user: session,
                    sessions: []
                };
            }
            userGroups[session.employee_id].sessions.push(session);
        });
        
        for (const [employeeId, data] of Object.entries(userGroups)) {
            console.log(`\n👤 ${data.user.full_name} (${employeeId})`);
            console.log(`   Role: ${data.user.role}`);
            console.log(`   Status: ${data.user.employee_status}`);
            console.log(`   Sessions: ${data.sessions.length}`);
            console.log(`   Active: ${data.sessions.filter(s => s.is_active).length}`);
            console.log(`   Inactive: ${data.sessions.filter(s => !s.is_active).length}`);
        }
        
        // Reactivate all unexpired sessions
        const [reactivateResult] = await connection.execute(`
            UPDATE user_sessions 
            SET is_active = 1 
            WHERE expires_at > NOW() AND is_active = 0
        `);
        
        console.log(`\n✅ Reactivated ${reactivateResult.affectedRows} sessions`);
        
        // Extend expiry for all active sessions to 30 days from now
        const extendedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const [extendResult] = await connection.execute(`
            UPDATE user_sessions 
            SET expires_at = ? 
            WHERE is_active = 1
        `, [extendedExpiry]);
        
        console.log(`✅ Extended expiry for ${extendResult.affectedRows} sessions to: ${extendedExpiry.toLocaleString()}`);
        
        // Create new active sessions for users who don't have any
        const [usersWithoutSessions] = await connection.execute(`
            SELECT e.employee_id, e.full_name, e.role, e.status
            FROM employees e
            LEFT JOIN user_sessions us ON e.employee_id = us.employee_id AND us.expires_at > NOW()
            WHERE us.employee_id IS NULL AND e.status = 'active'
        `);
        
        console.log(`\n👥 Users without valid sessions: ${usersWithoutSessions.length}`);
        
        for (const user of usersWithoutSessions) {
            const token = `auto_token_${user.employee_id}_${Date.now()}`;
            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            
            await connection.execute(`
                INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at, user_agent, ip_address)
                VALUES (?, ?, ?, 1, NOW(), ?, ?)
            `, [user.employee_id, token, expires, 'System Auto-Generated', '127.0.0.1']);
            
            console.log(`   ✅ Created session for ${user.full_name} (${user.employee_id})`);
        }
        
        // Clean up expired sessions
        const [cleanupResult] = await connection.execute(`
            DELETE FROM user_sessions 
            WHERE expires_at < NOW()
        `);
        
        console.log(`🧹 Cleaned up ${cleanupResult.affectedRows} expired sessions`);
        
        // Final statistics
        const [finalStats] = await connection.execute(`
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
            FROM user_sessions
        `);
        
        console.log('\n📊 Final session statistics:');
        console.log(`   Total sessions: ${finalStats[0].total}`);
        console.log(`   Active sessions: ${finalStats[0].active}`);
        console.log(`   Inactive sessions: ${finalStats[0].inactive}`);
        
        // Show active users summary
        const [activeUsers] = await connection.execute(`
            SELECT DISTINCT e.employee_id, e.full_name, e.role, e.status,
                   COUNT(us.id) as session_count,
                   MAX(us.expires_at) as latest_expiry
            FROM employees e
            JOIN user_sessions us ON e.employee_id = us.employee_id
            WHERE us.is_active = 1 AND us.expires_at > NOW()
            GROUP BY e.employee_id, e.full_name, e.role, e.status
            ORDER BY e.role, e.full_name
        `);
        
        console.log('\n👥 Active users with sessions:');
        activeUsers.forEach(user => {
            console.log(`   ✅ ${user.full_name} (${user.employee_id}) - ${user.role} - ${user.session_count} sessions - expires: ${user.latest_expiry.toLocaleString()}`);
        });
        
        console.log('\n🎉 All users are now active and have valid sessions!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

reactivateAllSessions();
