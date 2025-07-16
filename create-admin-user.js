const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function createAdminUser() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Create proper password hash
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Update the admin user we just created
        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [passwordHash, 'admin@test.com']
        );
        
        console.log('Admin user updated:');
        console.log('Email: admin@test.com');
        console.log('Password: admin123');
        console.log('Role: admin');
        
        await connection.end();
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

createAdminUser();
