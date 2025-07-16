const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function updateAdminUser() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Use the bcrypt hash for 'admin123' that should work
        const passwordHash = '$2b$10$rXxkPGjwKgn8FjKbKq4HLO8CdFoGYOCnP6ZEXBZbJSgXNqJmJMkVS';
        
        // Update the admin user we just created
        await connection.execute(
            'UPDATE users SET password_hash = ?, first_name = ?, last_name = ? WHERE email = ?',
            [passwordHash, 'Admin', 'User', 'admin@test.com']
        );
        
        console.log('Admin user updated:');
        console.log('Email: admin@test.com');
        console.log('Password: admin123');
        console.log('Role: admin');
        
        // Verify the user was updated
        const [users] = await connection.execute(
            'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = ?',
            ['admin@test.com']
        );
        
        console.log('User verification:', users[0]);
        
        await connection.end();
    } catch (error) {
        console.error('Error updating admin user:', error);
    }
}

updateAdminUser();
