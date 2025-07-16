const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    charset: 'utf8mb4'
};

async function createAdminUser() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        console.log('Creating admin user...');
        
        // First create an employee record
        const [employeeResult] = await connection.execute(`
            INSERT INTO employees (
                employee_code, first_name, last_name, full_name, email, 
                department, position, date_hired, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            'ADMIN001', 'Admin', 'User', 'Admin User', 'admin@test.com',
            'IT', 'System Administrator', '2025-01-01', 'active'
        ]);
        
        console.log('Employee created with ID:', employeeResult.insertId);
        
        // Create password hash for 'admin123' using bcryptjs
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        // Create user account
        const [userResult] = await connection.execute(`
            INSERT INTO user_accounts (
                employee_id, username, password_hash, role, is_active, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            'ADMIN001', 'admin', passwordHash, 'admin', true
        ]);
        
        console.log('User account created with ID:', userResult.insertId);
        
        console.log('Admin user created successfully:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('Role: admin');
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the function
createAdminUser();
