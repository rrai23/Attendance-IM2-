const mysql = require('mysql2/promise');

async function checkAdmin() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root', 
            password: '',
            database: 'bricks_attendance'
        });
        
        const [rows] = await conn.execute('SELECT username, role, LENGTH(password_hash) as hash_length, LEFT(password_hash, 10) as hash_start FROM user_accounts WHERE username = ?', ['admin']);
        console.log('Admin user data:', rows[0]);
        
        await conn.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAdmin();
