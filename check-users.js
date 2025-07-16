const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function checkUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Check employees table
        const [employees] = await connection.execute(
            'SELECT employee_code, first_name, last_name, email, department, position, status FROM employees'
        );
        
        console.log('Employees:', employees.length);
        employees.forEach(emp => {
            console.log(`${emp.employee_code}: ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.status}`);
        });
        
        // Check user_accounts table  
        const [users] = await connection.execute(
            'SELECT employee_id, username, role, is_active FROM user_accounts'
        );
        
        console.log('\nUser accounts:', users.length);
        users.forEach(user => {
            console.log(`${user.username} (${user.employee_id}): ${user.role} - Active: ${user.is_active}`);
        });
        
        // Check if admin user exists and update if needed
        const [adminUser] = await connection.execute(
            'SELECT * FROM user_accounts WHERE username = ?',
            ['admin']
        );
        
        if (adminUser.length === 0) {
            console.log('\nNo admin user found. Creating admin user account...');
            const bcrypt = require('bcryptjs');
            const passwordHash = await bcrypt.hash('admin123', 10);
            
            await connection.execute(`
                INSERT INTO user_accounts (
                    employee_id, username, password_hash, role, is_active, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                'ADMIN001', 'admin', passwordHash, 'admin', true
            ]);
            
            console.log('Admin user account created successfully');
        } else {
            console.log('\nAdmin user already exists');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkUsers();
