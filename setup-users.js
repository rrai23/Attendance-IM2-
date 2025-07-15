/**
 * Database Setup Script - Creates Default Users for Testing
 * Run this to create test accounts for authentication
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration (same as in connection.js)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function setupDefaultUsers() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Check if we already have users
        const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
        if (existingUsers[0].count > 0) {
            console.log('ℹ️ Users already exist in database');
            const [users] = await connection.execute('SELECT username, role FROM user_accounts JOIN employees ON user_accounts.employee_id = employees.employee_id');
            console.log('📋 Existing users:');
            users.forEach(user => console.log(`   - ${user.username} (${user.role})`));
            return;
        }

        console.log('👤 Creating default test users...');

        // Create default employees first
        const employees = [
            {
                id: 1,
                employee_id: 'EMP001',
                first_name: 'Admin',
                last_name: 'User',
                full_name: 'Admin User',
                email: 'admin@bricks.com',
                department: 'IT',
                position: 'System Administrator',
                wage: 50.00,
                status: 'active'
            },
            {
                id: 2,
                employee_id: 'EMP002',
                first_name: 'Manager',
                last_name: 'User',
                full_name: 'Manager User',
                email: 'manager@bricks.com',
                department: 'Management',
                position: 'Operations Manager',
                wage: 45.00,
                status: 'active'
            },
            {
                id: 3,
                employee_id: 'EMP003',
                first_name: 'Employee',
                last_name: 'User',
                full_name: 'Employee User',
                email: 'employee@bricks.com',
                department: 'General',
                position: 'Staff Member',
                wage: 25.00,
                status: 'active'
            }
        ];

        // Insert employees
        for (const emp of employees) {
            await connection.execute(`
                INSERT INTO employees (
                    id, employee_id, full_name, first_name, last_name, 
                    email, department, position, wage, status,
                    date_hired, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    updated_at = NOW()
            `, [
                emp.id, emp.employee_id, emp.full_name, emp.first_name, emp.last_name,
                emp.email, emp.department, emp.position, emp.wage, emp.status
            ]);
            console.log(`✅ Created employee: ${emp.full_name} (${emp.employee_id})`);
        }

        // Create user accounts with passwords
        const users = [
            {
                employee_id: 'EMP001',
                username: 'admin',
                password: 'admin123',
                role: 'admin'
            },
            {
                employee_id: 'EMP002',
                username: 'manager',
                password: 'manager123',
                role: 'manager'
            },
            {
                employee_id: 'EMP003',
                username: 'employee',
                password: 'employee123',
                role: 'employee'
            }
        ];

        // Insert user accounts
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 12);
            
            await connection.execute(`
                INSERT INTO user_accounts (
                    employee_id, username, password_hash, role, 
                    is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    password_hash = VALUES(password_hash),
                    role = VALUES(role),
                    updated_at = NOW()
            `, [user.employee_id, user.username, hashedPassword, user.role]);
            
            console.log(`✅ Created user account: ${user.username} (${user.role})`);
        }

        console.log('\n🎉 Default users created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('┌─────────────┬─────────────┬─────────────┐');
        console.log('│ Username    │ Password    │ Role        │');
        console.log('├─────────────┼─────────────┼─────────────┤');
        console.log('│ admin       │ admin123    │ admin       │');
        console.log('│ manager     │ manager123  │ manager     │');
        console.log('│ employee    │ employee123 │ employee    │');
        console.log('└─────────────┴─────────────┴─────────────┘');
        console.log('\n🌐 You can now login at: http://localhost:3000/login.html');

    } catch (error) {
        console.error('❌ Error setting up default users:', error);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n💡 Tables don\'t exist. Creating them...');
            await createTables(connection);
            console.log('✅ Tables created. Re-running user setup...');
            await setupDefaultUsers();
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createTables(connection) {
    // Create employees table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS employees (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id VARCHAR(50) UNIQUE NOT NULL,
            username VARCHAR(100) DEFAULT NULL,
            password VARCHAR(255) DEFAULT NULL,
            role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
            full_name VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE DEFAULT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            department VARCHAR(100) DEFAULT 'General',
            position VARCHAR(100) DEFAULT 'Employee',
            manager_id VARCHAR(50) DEFAULT NULL,
            date_hired DATE DEFAULT (CURRENT_DATE),
            status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
            wage DECIMAL(10,2) DEFAULT 15.00,
            overtime_rate DECIMAL(3,2) DEFAULT 1.50,
            salary_type ENUM('hourly', 'salary') DEFAULT 'hourly',
            avatar TEXT DEFAULT NULL,
            address TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Create user_accounts table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_accounts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id VARCHAR(50) NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP NULL,
            password_reset_token VARCHAR(255) NULL,
            password_reset_expires TIMESTAMP NULL,
            failed_login_attempts INT DEFAULT 0,
            locked_until TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
        )
    `);

    // Create user_sessions table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id VARCHAR(50) NOT NULL,
            token_hash VARCHAR(500) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
        )
    `);

    // Create attendance_records table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id INT PRIMARY KEY AUTO_INCREMENT,
            employee_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            time_in TIME DEFAULT NULL,
            time_out TIME DEFAULT NULL,
            hours_worked DECIMAL(4,2) DEFAULT 0.00,
            overtime_hours DECIMAL(4,2) DEFAULT 0.00,
            status ENUM('present', 'absent', 'late', 'half_day', 'sick', 'vacation') DEFAULT 'present',
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_employee_date (employee_id, date),
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Database tables created successfully');
}

// Run the setup
if (require.main === module) {
    setupDefaultUsers();
}

module.exports = { setupDefaultUsers };
