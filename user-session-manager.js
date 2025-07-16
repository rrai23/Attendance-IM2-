const mysql = require('mysql2/promise');
require('dotenv').config();

class UserSessionManager {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bricks_attendance',
            port: process.env.DB_PORT || 3306
        };
    }

    async connect() {
        return await mysql.createConnection(this.dbConfig);
    }

    async ensureAllUsersActive() {
        const connection = await this.connect();
        
        try {
            console.log('🔄 Ensuring all users have active sessions...');
            
            // 1. Get all active employees
            const [employees] = await connection.execute(`
                SELECT employee_id, full_name, role, status, email, department, position
                FROM employees
                WHERE status = 'active'
                ORDER BY role, full_name
            `);
            
            console.log(`👥 Found ${employees.length} active employees`);
            
            // 2. Check session status for each employee
            for (const employee of employees) {
                const [sessions] = await connection.execute(`
                    SELECT id, token_hash, expires_at, is_active, created_at
                    FROM user_sessions
                    WHERE employee_id = ? AND expires_at > NOW()
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [employee.employee_id]);
                
                if (sessions.length === 0) {
                    // No valid session, create one
                    await this.createSessionForUser(connection, employee);
                } else {
                    const session = sessions[0];
                    if (!session.is_active) {
                        // Session exists but inactive, reactivate it
                        await this.reactivateSession(connection, session, employee);
                    } else {
                        // Session is active, extend it
                        await this.extendSession(connection, session, employee);
                    }
                }
            }
            
            // 3. Clean up expired sessions
            const [cleanupResult] = await connection.execute(`
                DELETE FROM user_sessions 
                WHERE expires_at < NOW()
            `);
            
            if (cleanupResult.affectedRows > 0) {
                console.log(`🧹 Cleaned up ${cleanupResult.affectedRows} expired sessions`);
            }
            
            // 4. Final report
            await this.generateSessionReport(connection);
            
        } catch (error) {
            console.error('❌ Error ensuring users are active:', error);
        } finally {
            await connection.end();
        }
    }

    async createSessionForUser(connection, employee) {
        const token = `auto_session_${employee.employee_id}_${Date.now()}`;
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await connection.execute(`
            INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at, user_agent, ip_address)
            VALUES (?, ?, ?, 1, NOW(), ?, ?)
        `, [employee.employee_id, token, expires, 'Auto-Generated Session', '127.0.0.1']);
        
        console.log(`   ✅ Created session for ${employee.full_name} (${employee.employee_id})`);
    }

    async reactivateSession(connection, session, employee) {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await connection.execute(`
            UPDATE user_sessions 
            SET is_active = 1, expires_at = ?
            WHERE id = ?
        `, [expires, session.id]);
        
        console.log(`   🔄 Reactivated session for ${employee.full_name} (${employee.employee_id})`);
    }

    async extendSession(connection, session, employee) {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await connection.execute(`
            UPDATE user_sessions 
            SET expires_at = ?
            WHERE id = ?
        `, [expires, session.id]);
        
        console.log(`   ⏰ Extended session for ${employee.full_name} (${employee.employee_id})`);
    }

    async generateSessionReport(connection) {
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT us.employee_id) as users_with_sessions,
                COUNT(*) as total_sessions,
                SUM(CASE WHEN us.is_active = 1 THEN 1 ELSE 0 END) as active_sessions,
                (SELECT COUNT(*) FROM employees WHERE status = 'active') as total_active_employees
            FROM user_sessions us
            WHERE us.expires_at > NOW()
        `);
        
        const [userSessions] = await connection.execute(`
            SELECT 
                e.employee_id,
                e.full_name,
                e.role,
                COUNT(us.id) as session_count,
                MAX(us.expires_at) as latest_expiry,
                SUM(CASE WHEN us.is_active = 1 THEN 1 ELSE 0 END) as active_count
            FROM employees e
            LEFT JOIN user_sessions us ON e.employee_id = us.employee_id AND us.expires_at > NOW()
            WHERE e.status = 'active'
            GROUP BY e.employee_id, e.full_name, e.role
            ORDER BY e.role, e.full_name
        `);
        
        console.log('\n📊 SESSION REPORT:');
        console.log(`   Total active employees: ${stats[0].total_active_employees}`);
        console.log(`   Users with sessions: ${stats[0].users_with_sessions}`);
        console.log(`   Total sessions: ${stats[0].total_sessions}`);
        console.log(`   Active sessions: ${stats[0].active_sessions}`);
        console.log(`   Coverage: ${((stats[0].users_with_sessions / stats[0].total_active_employees) * 100).toFixed(1)}%`);
        
        console.log('\n👥 USER SESSION DETAILS:');
        for (const user of userSessions) {
            const status = user.session_count > 0 ? 
                `${user.active_count} active / ${user.session_count} total` : 
                '❌ NO SESSIONS';
            console.log(`   ${user.full_name} (${user.employee_id}) - ${user.role}: ${status}`);
        }
    }

    async preventFutureIssues() {
        const connection = await this.connect();
        
        try {
            console.log('🛡️ Implementing future session issue prevention...');
            
            // 1. Set all existing sessions to never expire in the near future
            const farFutureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
            
            const [updateResult] = await connection.execute(`
                UPDATE user_sessions 
                SET expires_at = ?, is_active = 1
                WHERE expires_at > NOW()
            `, [farFutureDate]);
            
            console.log(`✅ Updated ${updateResult.affectedRows} sessions to expire on ${farFutureDate.toLocaleDateString()}`);
            
            // 2. Create a monitoring flag in the database
            await connection.execute(`
                INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
                VALUES ('session_maintenance_enabled', 'true', NOW(), NOW())
                ON DUPLICATE KEY UPDATE setting_value = 'true', updated_at = NOW()
            `);
            
            console.log('✅ Session maintenance flag set in database');
            
        } catch (error) {
            console.error('❌ Error preventing future issues:', error);
        } finally {
            await connection.end();
        }
    }
}

// Command line interface
async function main() {
    const manager = new UserSessionManager();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'ensure';
    
    switch (command) {
        case 'ensure':
            await manager.ensureAllUsersActive();
            break;
        case 'prevent':
            await manager.preventFutureIssues();
            break;
        case 'all':
            await manager.ensureAllUsersActive();
            await manager.preventFutureIssues();
            break;
        default:
            console.log('Usage: node user-session-manager.js [ensure|prevent|all]');
            console.log('  ensure  - Ensure all users have active sessions');
            console.log('  prevent - Prevent future session issues');
            console.log('  all     - Run both ensure and prevent');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = UserSessionManager;
