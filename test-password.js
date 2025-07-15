const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testPassword() {
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
        
        // Test the password
        const isValid = await bcrypt.compare('admin', rows[0].password_hash);
        console.log('Password "admin" is valid:', isValid);
        
        await conn.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

testPassword();
