/**
 * Simple Database Check and Setup
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function checkAndSetupDatabase() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Show existing tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\n📋 Existing tables:');
        if (tables.length === 0) {
            console.log('   (no tables found)');
        } else {
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
        }

        // Check if employees table exists
        const [employeeTableCheck] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance' 
            AND table_name = 'employees'
        `);

        if (employeeTableCheck[0].count === 0) {
            console.log('\n🔨 Creating employees table...');
            await connection.execute(`
                CREATE TABLE employees (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255) DEFAULT NULL,
                    department VARCHAR(100) DEFAULT 'General',
                    position VARCHAR(100) DEFAULT 'Employee',
                    wage DECIMAL(10,2) DEFAULT 15.00,
                    status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                    date_hired DATE DEFAULT (CURRENT_DATE),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Employees table created');
        } else {
            console.log('✅ Employees table already exists');
        }

        // Check if user_accounts table exists
        const [userTableCheck] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance' 
            AND table_name = 'user_accounts'
        `);

        if (userTableCheck[0].count === 0) {
            console.log('\n🔨 Creating user_accounts table...');
            await connection.execute(`
                CREATE TABLE user_accounts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                )
            `);
            console.log('✅ User accounts table created');
        } else {
            console.log('✅ User accounts table already exists');
        }

        // Check if user_sessions table exists
        const [sessionTableCheck] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance' 
            AND table_name = 'user_sessions'
        `);

        if (sessionTableCheck[0].count === 0) {
            console.log('\n🔨 Creating user_sessions table...');
            await connection.execute(`
                CREATE TABLE user_sessions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    token_hash VARCHAR(500) NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                )
            `);
            console.log('✅ User sessions table created');
        } else {
            console.log('✅ User sessions table already exists');
        }

        // Check if attendance_records table exists
        const [attendanceTableCheck] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance' 
            AND table_name = 'attendance_records'
        `);

        if (attendanceTableCheck[0].count === 0) {
            console.log('\n🔨 Creating attendance_records table...');
            await connection.execute(`
                CREATE TABLE attendance_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    time_in TIME DEFAULT NULL,
                    time_out TIME DEFAULT NULL,
                    hours_worked DECIMAL(4,2) DEFAULT 0.00,
                    status ENUM('present', 'absent', 'late', 'half_day') DEFAULT 'present',
                    notes TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_employee_date (employee_id, date),
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
                )
            `);
            console.log('✅ Attendance records table created');
        } else {
            console.log('✅ Attendance records table already exists');
        }

        console.log('\n🎉 Database setup completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAndSetupDatabase();
