const mysql = require('mysql2/promise');

async function fixUserSessionsTable() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });
    
    try {
        console.log('🗑️ Dropping old user_sessions table...');
        await connection.execute('DROP TABLE IF EXISTS user_sessions');
        console.log('✅ Dropped old user_sessions table');
        
        console.log('📝 Creating new user_sessions table...');
        await connection.execute(`
            CREATE TABLE user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(20) NOT NULL,
                token_hash VARCHAR(500) NOT NULL,
                device_info TEXT NULL,
                ip_address VARCHAR(45) NULL,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_employee_id (employee_id),
                INDEX idx_token_hash (token_hash(255)),
                INDEX idx_expires_active (expires_at, is_active),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_code) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created new user_sessions table');
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixUserSessionsTable();
