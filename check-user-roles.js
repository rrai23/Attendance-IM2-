const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function checkUserRoles() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Check all users and their roles
        const [users] = await connection.execute(
            'SELECT id, email, role, is_active FROM users ORDER BY id'
        );
        
        console.log('All users in database:', users.length, 'users');
        users.forEach(user => {
            console.log(`User ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
        });
        
        // Check if there's an admin user
        const adminUsers = users.filter(user => user.role === 'admin');
        console.log('\nAdmin users:', adminUsers.length);
        
        if (adminUsers.length === 0) {
            console.log('No admin users found! Creating admin user...');
            
            // Create admin user
            const [result] = await connection.execute(
                'INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, ?, ?)',
                ['admin@test.com', '$2b$10$rXxkPGjwKgn8FjKbKq4HLO8CdFoGYOCnP6ZEXBZbJSgXNqJmJMkVS', 'admin', 1]
            );
            console.log('Admin user created with ID:', result.insertId);
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error checking user roles:', error);
    }
}

checkUserRoles();
