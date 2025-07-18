const mysql = require('mysql2/promise');
require('dotenv').config();

class SessionMaintenanceService {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bricks_attendance',
            port: process.env.DB_PORT || 3306
        };
        
        this.maintenanceInterval = null;
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Session maintenance service is already running');
            return;
        }

        console.log('🚀 Starting session maintenance service...');
        this.isRunning = true;
        
        // Run maintenance immediately
        await this.runMaintenance();
        
        // Schedule maintenance every 30 minutes
        this.maintenanceInterval = setInterval(async () => {
            await this.runMaintenance();
        }, 30 * 60 * 1000); // 30 minutes
        
        console.log('✅ Session maintenance service started (runs every 30 minutes)');
    }

    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ Session maintenance service is not running');
            return;
        }

        console.log('🛑 Stopping session maintenance service...');
        
        if (this.maintenanceInterval) {
            clearInterval(this.maintenanceInterval);
            this.maintenanceInterval = null;
        }
        
        this.isRunning = false;
        console.log('✅ Session maintenance service stopped');
    }

    async runMaintenance() {
        let connection;
        try {
            connection = await mysql.createConnection(this.dbConfig);
            console.log('🔧 Running session maintenance...');
            
            const now = new Date();
            const extendedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
            
            // 1. Reactivate all inactive sessions that haven't expired
            const [reactivateResult] = await connection.execute(`
                UPDATE user_sessions 
                SET is_active = 1, expires_at = ?
                WHERE expires_at > NOW() AND is_active = 0
            `, [extendedExpiry]);
            
            if (reactivateResult.affectedRows > 0) {
                console.log(`✅ Reactivated ${reactivateResult.affectedRows} inactive sessions`);
            }
            
            // 2. Extend expiry for all active sessions
            const [extendResult] = await connection.execute(`
                UPDATE user_sessions 
                SET expires_at = ?
                WHERE is_active = 1 AND expires_at < ?
            `, [extendedExpiry, extendedExpiry]);
            
            if (extendResult.affectedRows > 0) {
                console.log(`✅ Extended expiry for ${extendResult.affectedRows} active sessions`);
            }
            
            // 3. Create sessions for active employees without any
            const [usersWithoutSessions] = await connection.execute(`
                SELECT e.employee_id, CONCAT(e.first_name, ' ', e.last_name) as full_name, e.role, e.status
                FROM employees e
                LEFT JOIN user_sessions us ON e.employee_id = us.employee_id AND us.expires_at > NOW()
                WHERE us.employee_id IS NULL AND e.status = 'active'
            `);
            
            for (const user of usersWithoutSessions) {
                const token = `maint_token_${user.employee_id}_${Date.now()}`;
                await connection.execute(`
                    INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at, user_agent, ip_address)
                    VALUES (?, ?, ?, 1, NOW(), ?, ?)
                `, [user.employee_id, token, extendedExpiry, 'Session Maintenance Service', '127.0.0.1']);
                
                console.log(`✅ Created session for ${user.full_name} (${user.employee_id})`);
            }
            
            // 4. Clean up expired sessions
            const [cleanupResult] = await connection.execute(`
                DELETE FROM user_sessions 
                WHERE expires_at < NOW()
            `);
            
            if (cleanupResult.affectedRows > 0) {
                console.log(`🧹 Cleaned up ${cleanupResult.affectedRows} expired sessions`);
            }
            
            // 5. Get maintenance statistics
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_sessions,
                    COUNT(DISTINCT employee_id) as unique_users
                FROM user_sessions
                WHERE expires_at > NOW()
            `);
            
            console.log(`📊 Session stats: ${stats[0].total_sessions} total, ${stats[0].active_sessions} active, ${stats[0].unique_users} users`);
            
        } catch (error) {
            console.error('❌ Session maintenance error:', error);
        } finally {
            if (connection) {
                await connection.end();
            }
        }
    }
}

// Create singleton instance
const sessionMaintenance = new SessionMaintenanceService();

// Start service if running as main module
if (require.main === module) {
    sessionMaintenance.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await sessionMaintenance.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await sessionMaintenance.stop();
        process.exit(0);
    });
}

module.exports = sessionMaintenance;
