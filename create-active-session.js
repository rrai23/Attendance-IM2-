const mysql = require('mysql2/promise');
require('dotenv').config();

async function createActiveSession() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('🔗 Connected to database');
        
        // Create a new active session for admin
        const token = 'dev_token_admin_' + Date.now();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const [result] = await connection.execute(`
            INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at, user_agent, ip_address)
            VALUES (?, ?, ?, 1, NOW(), ?, ?)
        `, ['admin_001', token, expires, 'Test User Agent', '127.0.0.1']);
        
        console.log('✅ Created active session:', result.insertId);
        console.log('🎫 Token:', token);
        console.log('⏰ Expires:', expires);
        
        // Verify the session was created
        const [sessions] = await connection.execute(`
            SELECT id, token_hash, expires_at, is_active, created_at
            FROM user_sessions 
            WHERE employee_id = 'admin_001' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        console.log('📋 Session verification:', sessions[0]);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

createActiveSession();
