#!/usr/bin/env node

/**
 * BRICKS ATTENDANCE SYSTEM - SIMPLIFIED DATABASE SETUP
 * 
 * This is a simplified version that focuses on compatibility with XAMPP MySQL
 * and avoids complex foreign key constraints that might cause setup issues.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance',
    charset: 'utf8mb4'
};

console.log('🚀 BRICKS ATTENDANCE SYSTEM - SIMPLIFIED DATABASE SETUP');
console.log('=' .repeat(70));
console.log(`📊 Database: ${config.database}`);
console.log(`🖥️  Host: ${config.host}:${config.port}`);
console.log(`👤 User: ${config.user}`);
console.log('=' .repeat(70));

async function setupDatabase() {
    let connection;
    
    try {
        // Step 1: Connect to MySQL (without database)
        console.log('\n🔌 Connecting to MySQL server...');
        connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            charset: config.charset
        });
        console.log('✅ Connected to MySQL server successfully');
        
        // Show MySQL version
        const [version] = await connection.execute('SELECT VERSION() as version');
        console.log(`📊 MySQL Version: ${version[0].version}`);
        
        // Step 2: Create database
        console.log(`\n📦 Creating database '${config.database}'...`);
        await connection.execute(`
            CREATE DATABASE IF NOT EXISTS \`${config.database}\` 
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Database created successfully');
        
        // Step 3: Close and reconnect with database
        await connection.end();
        console.log('🔄 Reconnecting with database...');
        
        connection = await mysql.createConnection(config);
        console.log(`✅ Connected to database '${config.database}'`);
        
        // Step 4: Create tables
        console.log('\n🔧 Creating tables...');
        await createTables(connection);
        
        // Step 5: Insert default data
        console.log('\n📋 Inserting default data...');
        await insertDefaultData(connection);
        
        // Step 6: Show summary
        await showSummary(connection);
        
        console.log('\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('\n💥 SETUP FAILED:', error.message);
        console.error('\nPlease check the error above and try again.');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

async function createTables(connection) {
    const tables = [
        {
            name: 'user_accounts',
            sql: `
                CREATE TABLE IF NOT EXISTS user_accounts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP NULL,
                    failed_login_attempts INT DEFAULT 0,
                    account_locked_until TIMESTAMP NULL,
                    password_reset_token VARCHAR(255) NULL,
                    password_reset_expires TIMESTAMP NULL,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    full_name VARCHAR(255),
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    department VARCHAR(100),
                    position VARCHAR(100),
                    hire_date DATE,
                    employee_status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_username (username),
                    INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'employees',
            sql: `
                CREATE TABLE IF NOT EXISTS employees (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    username VARCHAR(100),
                    password VARCHAR(255),
                    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                    full_name VARCHAR(255) NOT NULL,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    department VARCHAR(100),
                    position VARCHAR(100),
                    manager_id VARCHAR(50),
                    date_hired DATE,
                    hire_date DATE,
                    status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                    employee_status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                    wage DECIMAL(10,2) DEFAULT 15.00,
                    overtime_rate DECIMAL(4,2) DEFAULT 1.5,
                    salary_type ENUM('hourly', 'salary') DEFAULT 'hourly',
                    avatar VARCHAR(500),
                    address TEXT,
                    emergency_contact VARCHAR(255),
                    emergency_phone VARCHAR(20),
                    work_schedule JSON,
                    permissions JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_username (username),
                    INDEX idx_department (department)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'departments',
            sql: `
                CREATE TABLE IF NOT EXISTS departments (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    department_code VARCHAR(20) UNIQUE NOT NULL,
                    department_name VARCHAR(100) NOT NULL,
                    manager_employee_id VARCHAR(50),
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_department_code (department_code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'attendance_records',
            sql: `
                CREATE TABLE IF NOT EXISTS attendance_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    time_in TIME,
                    time_out TIME,
                    clock_in DATETIME,
                    clock_out DATETIME,
                    break_start_time DATETIME,
                    break_end_time DATETIME,
                    lunch_start DATETIME,
                    lunch_end DATETIME,
                    hours_worked DECIMAL(5,2) DEFAULT 0.00,
                    regular_hours DECIMAL(5,2) DEFAULT 0.00,
                    overtime_hours DECIMAL(5,2) DEFAULT 0.00,
                    status ENUM('present', 'absent', 'late', 'tardy', 'on_leave', 'sick', 'vacation', 'overtime', 'halfday') DEFAULT 'present',
                    notes TEXT,
                    ip_address VARCHAR(45),
                    location VARCHAR(255),
                    approved_by VARCHAR(50),
                    approved_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_employee_date (employee_id, date),
                    INDEX idx_date (date),
                    INDEX idx_employee_id (employee_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'user_sessions',
            sql: `
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    token_hash VARCHAR(255) NOT NULL,
                    device_info TEXT,
                    ip_address VARCHAR(45),
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_token_hash (token_hash)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'payroll_records',
            sql: `
                CREATE TABLE IF NOT EXISTS payroll_records (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    pay_period_start DATE NOT NULL,
                    pay_period_end DATE NOT NULL,
                    regular_hours DECIMAL(8,2) DEFAULT 0.00,
                    overtime_hours DECIMAL(8,2) DEFAULT 0.00,
                    holiday_hours DECIMAL(8,2) DEFAULT 0.00,
                    sick_hours DECIMAL(8,2) DEFAULT 0.00,
                    vacation_hours DECIMAL(8,2) DEFAULT 0.00,
                    hourly_rate DECIMAL(10,2),
                    regular_pay DECIMAL(10,2) DEFAULT 0.00,
                    overtime_pay DECIMAL(10,2) DEFAULT 0.00,
                    holiday_pay DECIMAL(10,2) DEFAULT 0.00,
                    gross_pay DECIMAL(10,2) DEFAULT 0.00,
                    tax_deductions DECIMAL(10,2) DEFAULT 0.00,
                    sss_deduction DECIMAL(10,2) DEFAULT 0.00,
                    philhealth_deduction DECIMAL(10,2) DEFAULT 0.00,
                    pagibig_deduction DECIMAL(10,2) DEFAULT 0.00,
                    other_deductions DECIMAL(10,2) DEFAULT 0.00,
                    total_deductions DECIMAL(10,2) DEFAULT 0.00,
                    net_pay DECIMAL(10,2) DEFAULT 0.00,
                    status ENUM('draft', 'calculated', 'approved', 'paid', 'cancelled') DEFAULT 'draft',
                    pay_date DATE,
                    processed_by VARCHAR(50),
                    processed_at TIMESTAMP NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_pay_period (pay_period_start, pay_period_end)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'system_settings',
            sql: `
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    category VARCHAR(50) NOT NULL,
                    setting_key VARCHAR(100) NOT NULL,
                    setting_value TEXT,
                    data_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
                    description TEXT,
                    is_encrypted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_category_key (category, setting_key),
                    INDEX idx_category (category)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'audit_log',
            sql: `
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50),
                    action VARCHAR(100) NOT NULL,
                    table_name VARCHAR(50),
                    record_id VARCHAR(50),
                    old_values JSON,
                    new_values JSON,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        },
        {
            name: 'overtime_requests',
            sql: `
                CREATE TABLE IF NOT EXISTS overtime_requests (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) NOT NULL,
                    request_date DATE NOT NULL,
                    overtime_hours DECIMAL(5,2) NOT NULL,
                    reason TEXT,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    requested_by VARCHAR(50),
                    approved_by VARCHAR(50),
                    approved_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_request_date (request_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `
        }
    ];

    for (const table of tables) {
        console.log(`   📋 Creating ${table.name} table...`);
        await connection.execute(table.sql);
    }
    
    console.log('✅ All tables created successfully');
}

async function insertDefaultData(connection) {
    // Insert departments
    console.log('   🏢 Adding departments...');
    const departments = [
        ['ADMIN', 'Administration', 'Administrative and management functions'],
        ['HR', 'Human Resources', 'Employee relations and recruitment'],
        ['IT', 'Information Technology', 'Technical support and development'],
        ['FINANCE', 'Finance', 'Financial operations and accounting'],
        ['OPERATIONS', 'Operations', 'Daily business operations'],
        ['SALES', 'Sales', 'Sales and customer relations'],
        ['MARKETING', 'Marketing', 'Marketing and promotions']
    ];

    for (const [code, name, description] of departments) {
        await connection.execute(`
            INSERT IGNORE INTO departments (department_code, department_name, description)
            VALUES (?, ?, ?)
        `, [code, name, description]);
    }

    // Insert system settings
    console.log('   ⚙️  Adding system settings...');
    const settings = [
        ['general', 'companyName', 'Bricks Company', 'string', 'Company name'],
        ['general', 'timezone', 'Asia/Manila', 'string', 'System timezone'],
        ['general', 'dateFormat', 'MM/DD/YYYY', 'string', 'Date format'],
        ['general', 'timeFormat', '12', 'string', 'Time format'],
        ['general', 'currency', 'PHP', 'string', 'Default currency'],
        ['attendance', 'standardHours', '8', 'number', 'Standard work hours per day'],
        ['attendance', 'overtimeThreshold', '8.5', 'number', 'Overtime threshold'],
        ['payroll', 'overtimeRate', '1.5', 'number', 'Overtime rate multiplier'],
        ['payroll', 'payPeriod', 'biweekly', 'string', 'Pay period frequency'],
        ['security', 'sessionTimeout', '480', 'number', 'Session timeout in minutes']
    ];

    for (const [category, key, value, type, description] of settings) {
        await connection.execute(`
            INSERT IGNORE INTO system_settings (category, setting_key, setting_value, data_type, description)
            VALUES (?, ?, ?, ?, ?)
        `, [category, key, value, type, description]);
    }

    // Create admin user
    console.log('   👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    await connection.execute(`
        INSERT IGNORE INTO user_accounts (
            employee_id, username, password_hash, role, is_active,
            first_name, last_name, full_name, email, department, position,
            hire_date, employee_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        'admin_001', 'admin', adminPassword, 'admin', true,
        'System', 'Administrator', 'System Administrator',
        'admin@brickscompany.com', 'ADMIN', 'System Administrator',
        new Date().toISOString().split('T')[0], 'active'
    ]);
    
    await connection.execute(`
        INSERT IGNORE INTO employees (
            employee_id, username, password, role, full_name, first_name, last_name,
            email, department, position, hire_date, status, wage, salary_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        'admin_001', 'admin', adminPassword, 'admin', 'System Administrator',
        'System', 'Administrator', 'admin@brickscompany.com',
        'ADMIN', 'System Administrator', new Date().toISOString().split('T')[0],
        'active', 25.00, 'salary'
    ]);

    // Create sample employees
    console.log('   👥 Adding sample employees...');
    const employees = [
        { id: 'emp_001', username: 'jdoe', firstName: 'John', lastName: 'Doe', email: 'john.doe@brickscompany.com', department: 'IT', position: 'Software Developer' },
        { id: 'emp_002', username: 'jsmith', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@brickscompany.com', department: 'HR', position: 'HR Specialist' },
        { id: 'emp_003', username: 'mjohnson', firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@brickscompany.com', department: 'SALES', position: 'Sales Representative' }
    ];
    
    const defaultPassword = await bcrypt.hash('password123', 12);
    
    for (const emp of employees) {
        await connection.execute(`
            INSERT IGNORE INTO user_accounts (
                employee_id, username, password_hash, role, is_active,
                first_name, last_name, full_name, email, department, position,
                hire_date, employee_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            emp.id, emp.username, defaultPassword, 'employee', true,
            emp.firstName, emp.lastName, `${emp.firstName} ${emp.lastName}`,
            emp.email, emp.department, emp.position,
            new Date().toISOString().split('T')[0], 'active'
        ]);
        
        await connection.execute(`
            INSERT IGNORE INTO employees (
                employee_id, username, password, role, full_name, first_name, last_name,
                email, department, position, hire_date, status, wage, salary_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            emp.id, emp.username, defaultPassword, 'employee', `${emp.firstName} ${emp.lastName}`,
            emp.firstName, emp.lastName, emp.email, emp.department, emp.position,
            new Date().toISOString().split('T')[0], 'active', 18.00, 'hourly'
        ]);
    }

    // Add sample attendance
    console.log('   ⏰ Adding sample attendance records...');
    const today = new Date().toISOString().split('T')[0];
    
    await connection.execute(`
        INSERT IGNORE INTO attendance_records (employee_id, date, time_in, time_out, hours_worked, status)
        VALUES 
            ('emp_001', ?, '08:00:00', '17:00:00', 8.00, 'present'),
            ('emp_002', ?, '09:00:00', '18:00:00', 8.00, 'present')
    `, [today, today]);
}

async function showSummary(connection) {
    console.log('\n📊 DATABASE SETUP SUMMARY');
    console.log('=' .repeat(60));
    
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Tables created: ${tables.length}`);
    
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
    console.log(`👤 User accounts: ${users[0].count}`);
    
    const [departments] = await connection.execute('SELECT COUNT(*) as count FROM departments');
    console.log(`🏢 Departments: ${departments[0].count}`);
    
    const [settings] = await connection.execute('SELECT COUNT(*) as count FROM system_settings');
    console.log(`⚙️  System settings: ${settings[0].count}`);
    
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Administrator');
    
    console.log('\n👥 SAMPLE EMPLOYEES:');
    console.log('   Username: jdoe (password: password123)');
    console.log('   Username: jsmith (password: password123)');
    console.log('   Username: mjohnson (password: password123)');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Login with admin credentials');
}

// Create .env file if needed
function createEnvFile() {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        console.log('📄 Creating .env file...');
        
        const envContent = `# Database Configuration (XAMPP MySQL Default Settings)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bricks_attendance

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=bricks_attendance_secret_key_change_in_production_2025
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Security
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Timezone
TZ=UTC
`;
        
        fs.writeFileSync(envPath, envContent);
        console.log('✅ .env file created with XAMPP defaults');
    }
}

// Main execution
async function main() {
    try {
        createEnvFile();
        await setupDatabase();
    } catch (error) {
        console.error('💥 Setup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { setupDatabase };
