const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function ensureAdminUser() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });
    
    try {
        // Check if admin user exists
        const [users] = await connection.execute('SELECT * FROM user_accounts WHERE role = ?', ['admin']);
        console.log('Admin users found:', users.length);
        
        if (users.length === 0) {
            console.log('Creating admin user...');
            
            // Create admin employee first
            const [empResult] = await connection.execute(`
                INSERT INTO employees (employee_code, first_name, last_name, email, department, position, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['ADMIN001', 'Admin', 'User', 'admin@test.com', 'IT', 'Administrator', 'active']);
            
            // Create admin user account
            const passwordHash = await bcrypt.hash('admin123', 10);
            await connection.execute(`
                INSERT INTO user_accounts (employee_id, username, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, ['ADMIN001', 'admin', passwordHash, 'admin', true]);
            
            console.log('Admin user created successfully');
            console.log('Username: admin');
            console.log('Password: admin123');
        } else {
            console.log('Admin user already exists');
            console.log('Username:', users[0].username);
            console.log('Role:', users[0].role);
        }
    } finally {
        await connection.end();
    }
}

ensureAdminUser().catch(console.error);
