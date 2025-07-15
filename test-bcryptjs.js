const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testPasswordDirect() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root', 
            password: '',
            database: 'bricks_attendance'
        });
        
        const [rows] = await conn.execute('SELECT username, password_hash FROM user_accounts WHERE username = ?', ['admin']);
        console.log('Admin user found:', rows[0].username);
        console.log('Password hash:', rows[0].password_hash);
        
        // Test the password with bcryptjs
        const isValid = await bcrypt.compare('admin', rows[0].password_hash);
        console.log('Password "admin" is valid with bcryptjs:', isValid);
        
        await conn.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

testPasswordDirect();
