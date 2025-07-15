/**
 * Create Test Users in Existing Employees Table
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function createTestUsers() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Check existing users
        const [existingUsers] = await connection.execute('SELECT username, role, employee_code FROM employees WHERE username IS NOT NULL');
        if (existingUsers.length > 0) {
            console.log('\n👤 Existing users found:');
            existingUsers.forEach(user => console.log(`   - ${user.username} (${user.role}) - ${user.employee_code}`));
            console.log('\n✅ Users already exist. You can login with any of the above credentials.');
            console.log('💡 If you need to reset passwords, delete the users and run this script again.');
            return;
        }

        console.log('\n👤 Creating test users in employees table...');

        // Test users to create
        const testUsers = [
            {
                employee_code: 'ADMIN001',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                full_name: 'System Administrator',
                first_name: 'System',
                last_name: 'Administrator',
                email: 'admin@bricks.com',
                department: 'IT',
                position: 'System Administrator',
                hourly_rate: 50.00
            },
            {
                employee_code: 'MGR001',
                username: 'manager',
                password: 'manager123',
                role: 'manager',
                full_name: 'Department Manager',
                first_name: 'Department',
                last_name: 'Manager',
                email: 'manager@bricks.com',
                department: 'Management',
                position: 'Operations Manager',
                hourly_rate: 45.00
            },
            {
                employee_code: 'EMP001',
                username: 'employee',
                password: 'employee123',
                role: 'employee',
                full_name: 'Staff Member',
                first_name: 'Staff',
                last_name: 'Member',
                email: 'employee@bricks.com',
                department: 'General',
                position: 'Employee',
                hourly_rate: 25.00
            },
            {
                employee_code: 'TEST001',
                username: 'test',
                password: 'test123',
                role: 'employee',
                full_name: 'Test User',
                first_name: 'Test',
                last_name: 'User',
                email: 'test@bricks.com',
                department: 'Testing',
                position: 'Test Employee',
                hourly_rate: 20.00
            }
        ];

        // Insert test users
        for (const user of testUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 12);
            
            await connection.execute(`
                INSERT INTO employees (
                    employee_code, username, password_hash, role, full_name, 
                    first_name, last_name, email, department, position, 
                    date_hired, hourly_rate, overtime_rate, status, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1.5, 'active', NOW(), NOW())
            `, [
                user.employee_code, user.username, hashedPassword, user.role, user.full_name,
                user.first_name, user.last_name, user.email, user.department, user.position,
                user.hourly_rate
            ]);
            
            console.log(`✅ Created user: ${user.username} (${user.role}) - ${user.employee_code}`);
        }

        console.log('\n🎉 Test users created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('┌─────────────┬─────────────┬─────────────┬─────────────┐');
        console.log('│ Username    │ Password    │ Role        │ Code        │');
        console.log('├─────────────┼─────────────┼─────────────┼─────────────┤');
        console.log('│ admin       │ admin123    │ admin       │ ADMIN001    │');
        console.log('│ manager     │ manager123  │ manager     │ MGR001      │');
        console.log('│ employee    │ employee123 │ employee    │ EMP001      │');
        console.log('│ test        │ test123     │ employee    │ TEST001     │');
        console.log('└─────────────┴─────────────┴─────────────┴─────────────┘');
        console.log('\n🌐 Login URL: http://localhost:3000/login.html');
        console.log('\n💡 After logging in, you can access:');
        console.log('   • Settings: http://localhost:3000/settings.html');
        console.log('   • Dashboard: http://localhost:3000/dashboard.html');
        console.log('   • Test Auth: http://localhost:3000/test-auth.html');

    } catch (error) {
        console.error('❌ Error creating test users:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('\n💡 Some users may already exist. Checking existing users...');
            const [users] = await connection.execute('SELECT username, role, employee_code FROM employees WHERE username IS NOT NULL');
            console.log('\n👤 Current users:');
            users.forEach(user => console.log(`   - ${user.username} (${user.role}) - ${user.employee_code}`));
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
createTestUsers();
