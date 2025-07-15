const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testCommonPasswords() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root', 
            password: '',
            database: 'bricks_attendance'
        });
        
        const [rows] = await conn.execute('SELECT username, password_hash FROM user_accounts WHERE username = ?', ['admin']);
        const hash = rows[0].password_hash;
        
        const passwords = ['admin', 'password', '123456', 'admin123', 'password123', 'bricks', 'bricksadmin'];
        
        for (const pwd of passwords) {
            const isValid = await bcrypt.compare(pwd, hash);
            console.log(`Password "${pwd}": ${isValid ? '✅ VALID' : '❌ invalid'}`);
            if (isValid) break;
        }
        
        await conn.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

testCommonPasswords();
