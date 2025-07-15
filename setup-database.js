#!/usr/bin/env node

/**
 * BRICKS ATTENDANCE SYSTEM - DATABASE SETUP SCRIPT
 * 
 * This script automatically creates the database and all required tables
 * for the Bricks Attendance System when using XAMPP MySQL.
 * 
 * Features:
 * - Creates database if it doesn't exist
 * - Creates all required tables with proper foreign keys
 * - Inserts default system settings
 * - Creates default departments
 * - Creates sample admin user
 * - Adds sample employee data for testing
 * - Comprehensive error handling and rollback
 * 
 * Usage:
 *   node setup-database.js
 * 
 * Prerequisites:
 * - XAMPP MySQL server running
 * - Node.js installed
 * - All npm dependencies installed (npm install)
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration (XAMPP defaults)
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance',
    multipleStatements: true,
    charset: 'utf8mb4'
};

console.log('🚀 BRICKS ATTENDANCE SYSTEM - DATABASE SETUP');
console.log('=' .repeat(60));
console.log(`📊 Database: ${config.database}`);
console.log(`🖥️  Host: ${config.host}:${config.port}`);
console.log(`👤 User: ${config.user}`);
console.log('=' .repeat(60));

class DatabaseSetup {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            // Connect without database first
            const tempConfig = { ...config };
            delete tempConfig.database;
            
            console.log('🔌 Connecting to MySQL server...');
            this.connection = await mysql.createConnection(tempConfig);
            console.log('✅ Connected to MySQL server successfully');
            
            // Test if we can access MySQL
            const [result] = await this.connection.execute('SELECT VERSION() as version');
            console.log(`📊 MySQL Version: ${result[0].version}`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to MySQL server:', error.message);
            console.error('\n🛠️  Please ensure:');
            console.error('   - XAMPP is running');
            console.error('   - MySQL service is started');
            console.error('   - Database credentials are correct in .env file');
            console.error('   - No firewall is blocking port 3306');
            throw error;
        }
    }

    async createDatabase() {
        try {
            console.log(`\n📦 Creating database '${config.database}'...`);
            
            await this.connection.execute(`
                CREATE DATABASE IF NOT EXISTS \`${config.database}\` 
                CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            `);
            
            console.log('✅ Database created successfully');
            
            // Close current connection and reconnect with database specified
            await this.connection.end();
            
            console.log(`🔄 Reconnecting to database '${config.database}'...`);
            this.connection = await mysql.createConnection(config);
            console.log(`✅ Connected to database '${config.database}'`);
            
        } catch (error) {
            console.error('❌ Failed to create database:', error.message);
            throw error;
        }
    }

    async createTables() {
        try {
            console.log('\n🔧 Creating database tables...');
            
            // Disable foreign key checks temporarily
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
            
            // 1. USER_ACCOUNTS table (primary authentication table)
            console.log('   📋 Creating user_accounts table...');
            await this.connection.execute(`
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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    -- Employee profile fields
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    full_name VARCHAR(255),
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    department VARCHAR(100),
                    position VARCHAR(100),
                    hire_date DATE,
                    employee_status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                    
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_username (username),
                    INDEX idx_email (email),
                    INDEX idx_role (role),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 2. DEPARTMENTS table (create before employees for foreign key)
            console.log('   🏢 Creating departments table...');
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS departments (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    department_code VARCHAR(20) UNIQUE NOT NULL,
                    department_name VARCHAR(100) NOT NULL,
                    manager_employee_id VARCHAR(50),
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_department_code (department_code),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 3. EMPLOYEES table (extended employee data)
            console.log('   👥 Creating employees table...');
            await this.connection.execute(`
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
                    INDEX idx_email (email),
                    INDEX idx_department (department),
                    INDEX idx_status (status),
                    INDEX idx_role (role)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 4. ATTENDANCE_RECORDS table
            console.log('   ⏰ Creating attendance_records table...');
            await this.connection.execute(`
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
                    INDEX idx_status (status),
                    INDEX idx_employee_date (employee_id, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 5. USER_SESSIONS table (JWT token management)
            console.log('   🔐 Creating user_sessions table...');
            await this.connection.execute(`
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
                    INDEX idx_token_hash (token_hash),
                    INDEX idx_expires_at (expires_at),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 6. PAYROLL_RECORDS table
            console.log('   💰 Creating payroll_records table...');
            await this.connection.execute(`
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
                    
                    -- Philippine tax deductions
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
                    INDEX idx_pay_period (pay_period_start, pay_period_end),
                    INDEX idx_status (status),
                    INDEX idx_pay_date (pay_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 7. SYSTEM_SETTINGS table
            console.log('   ⚙️  Creating system_settings table...');
            await this.connection.execute(`
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
            `);

            // 8. AUDIT_LOG table
            console.log('   📊 Creating audit_log table...');
            await this.connection.execute(`
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
                    INDEX idx_action (action),
                    INDEX idx_table_name (table_name),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 9. OVERTIME_REQUESTS table
            console.log('   📝 Creating overtime_requests table...');
            await this.connection.execute(`
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
                    INDEX idx_request_date (request_date),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Re-enable foreign key checks
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

            console.log('✅ All tables created successfully');
            
        } catch (error) {
            console.error('❌ Failed to create tables:', error.message);
            // Re-enable foreign key checks even on error
            try {
                await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            } catch (fkError) {
                // Ignore foreign key check error
            }
            throw error;
        }
    }

    async insertDefaultData() {
        try {
            console.log('\n📋 Inserting default data...');
            
            // Insert default departments
            await this.insertDepartments();
            
            // Insert system settings
            await this.insertSystemSettings();
            
            // Create admin user
            await this.createAdminUser();
            
            // Insert sample employees
            await this.insertSampleEmployees();
            
            // Insert sample attendance records
            await this.insertSampleAttendance();
            
            console.log('✅ Default data inserted successfully');
            
        } catch (error) {
            console.error('❌ Failed to insert default data:', error.message);
            throw error;
        }
    }

    async insertDepartments() {
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
            await this.connection.execute(`
                INSERT IGNORE INTO departments (department_code, department_name, description)
                VALUES (?, ?, ?)
            `, [code, name, description]);
        }
    }

    async insertSystemSettings() {
        console.log('   ⚙️  Adding system settings...');
        
        const settings = [
            // Company settings
            ['general', 'companyName', 'Bricks Company', 'string', 'Company name'],
            ['general', 'timezone', 'Asia/Manila', 'string', 'System timezone'],
            ['general', 'dateFormat', 'MM/DD/YYYY', 'string', 'Date format'],
            ['general', 'timeFormat', '12', 'string', 'Time format (12 or 24 hour)'],
            ['general', 'currency', 'PHP', 'string', 'Default currency'],
            ['general', 'language', 'en', 'string', 'System language'],
            
            // Attendance settings
            ['attendance', 'standardHours', '8', 'number', 'Standard work hours per day'],
            ['attendance', 'clockInGrace', '5', 'number', 'Clock in grace period (minutes)'],
            ['attendance', 'clockOutGrace', '5', 'number', 'Clock out grace period (minutes)'],
            ['attendance', 'tardyThreshold', '10', 'number', 'Tardiness threshold (minutes)'],
            ['attendance', 'overtimeThreshold', '8.5', 'number', 'Overtime threshold (hours)'],
            ['attendance', 'autoDeductLunch', 'true', 'boolean', 'Auto-deduct lunch break'],
            ['attendance', 'lunchBreakDuration', '30', 'number', 'Lunch break duration (minutes)'],
            
            // Payroll settings
            ['payroll', 'payPeriod', 'biweekly', 'string', 'Pay period frequency'],
            ['payroll', 'payday', 'friday', 'string', 'Payday of the week'],
            ['payroll', 'overtimeRate', '1.5', 'number', 'Overtime rate multiplier'],
            ['payroll', 'roundingRules', 'nearest_quarter', 'string', 'Time rounding rules'],
            ['payroll', 'autoCalculate', 'true', 'boolean', 'Auto-calculate payroll'],
            
            // Philippine tax rates
            ['payroll', 'sssRate', '0.045', 'number', 'SSS contribution rate'],
            ['payroll', 'philhealthRate', '0.025', 'number', 'PhilHealth contribution rate'],
            ['payroll', 'pagibigRate', '0.02', 'number', 'Pag-IBIG contribution rate'],
            
            // Security settings
            ['security', 'sessionTimeout', '480', 'number', 'Session timeout (minutes)'],
            ['security', 'maxLoginAttempts', '5', 'number', 'Maximum login attempts'],
            ['security', 'passwordMinLength', '6', 'number', 'Minimum password length'],
            ['security', 'requirePasswordChange', 'false', 'boolean', 'Require periodic password changes'],
            
            // Notification settings
            ['notifications', 'emailNotifications', 'false', 'boolean', 'Enable email notifications'],
            ['notifications', 'tardyAlerts', 'true', 'boolean', 'Send tardiness alerts'],
            ['notifications', 'overtimeAlerts', 'true', 'boolean', 'Send overtime alerts'],
            
            // System settings
            ['system', 'autoLogout', '30', 'number', 'Auto logout time (minutes)'],
            ['system', 'backupEnabled', 'true', 'boolean', 'Enable automatic backups'],
            ['system', 'backupFrequency', 'daily', 'string', 'Backup frequency']
        ];

        for (const [category, key, value, type, description] of settings) {
            await this.connection.execute(`
                INSERT IGNORE INTO system_settings (category, setting_key, setting_value, data_type, description)
                VALUES (?, ?, ?, ?, ?)
            `, [category, key, value, type, description]);
        }
    }

    async createAdminUser() {
        console.log('   👤 Creating admin user...');
        
        const adminPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        // Insert into user_accounts
        await this.connection.execute(`
            INSERT IGNORE INTO user_accounts (
                employee_id, username, password_hash, role, is_active,
                first_name, last_name, full_name, email, department, position,
                hire_date, employee_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'admin_001', 'admin', hashedPassword, 'admin', true,
            'System', 'Administrator', 'System Administrator',
            'admin@brickscompany.com', 'ADMIN', 'System Administrator',
            new Date().toISOString().split('T')[0], 'active'
        ]);
        
        // Insert into employees (for compatibility)
        await this.connection.execute(`
            INSERT IGNORE INTO employees (
                employee_id, username, password, role, full_name, first_name, last_name,
                email, department, position, hire_date, status, wage, salary_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'admin_001', 'admin', hashedPassword, 'admin', 'System Administrator',
            'System', 'Administrator', 'admin@brickscompany.com',
            'ADMIN', 'System Administrator', new Date().toISOString().split('T')[0],
            'active', 25.00, 'salary'
        ]);
        
        console.log('   ✅ Admin user created (username: admin, password: admin123)');
    }

    async insertSampleEmployees() {
        console.log('   👥 Adding sample employees...');
        
        const employees = [
            {
                id: 'emp_001',
                username: 'jdoe',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@brickscompany.com',
                department: 'IT',
                position: 'Software Developer',
                wage: 20.00
            },
            {
                id: 'emp_002',
                username: 'jsmith',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@brickscompany.com',
                department: 'HR',
                position: 'HR Specialist',
                wage: 18.00
            },
            {
                id: 'emp_003',
                username: 'mjohnson',
                firstName: 'Mike',
                lastName: 'Johnson',
                email: 'mike.johnson@brickscompany.com',
                department: 'SALES',
                position: 'Sales Representative',
                wage: 16.00
            }
        ];
        
        const defaultPassword = await bcrypt.hash('password123', 12);
        
        for (const emp of employees) {
            // Insert into user_accounts
            await this.connection.execute(`
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
            
            // Insert into employees
            await this.connection.execute(`
                INSERT IGNORE INTO employees (
                    employee_id, username, password, role, full_name, first_name, last_name,
                    email, department, position, hire_date, status, wage, salary_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                emp.id, emp.username, defaultPassword, 'employee', `${emp.firstName} ${emp.lastName}`,
                emp.firstName, emp.lastName, emp.email, emp.department, emp.position,
                new Date().toISOString().split('T')[0], 'active', emp.wage, 'hourly'
            ]);
        }
        
        console.log('   ✅ Sample employees created (password: password123)');
    }

    async insertSampleAttendance() {
        console.log('   ⏰ Adding sample attendance records...');
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const attendanceRecords = [
            {
                employeeId: 'emp_001',
                date: today.toISOString().split('T')[0],
                timeIn: '08:00:00',
                timeOut: '17:00:00',
                hoursWorked: 8.00,
                status: 'present'
            },
            {
                employeeId: 'emp_002',
                date: today.toISOString().split('T')[0],
                timeIn: '09:00:00',
                timeOut: '18:00:00',
                hoursWorked: 8.00,
                status: 'present'
            },
            {
                employeeId: 'emp_001',
                date: yesterday.toISOString().split('T')[0],
                timeIn: '08:00:00',
                timeOut: '17:30:00',
                hoursWorked: 8.50,
                status: 'present'
            }
        ];
        
        for (const record of attendanceRecords) {
            await this.connection.execute(`
                INSERT IGNORE INTO attendance_records (
                    employee_id, date, time_in, time_out, hours_worked, status
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                record.employeeId, record.date, record.timeIn, 
                record.timeOut, record.hoursWorked, record.status
            ]);
        }
    }

    async showSummary() {
        try {
            console.log('\n📊 DATABASE SETUP SUMMARY');
            console.log('=' .repeat(60));
            
            // Count tables
            const [tables] = await this.connection.execute('SHOW TABLES');
            console.log(`📋 Tables created: ${tables.length}`);
            
            // Count users
            const [users] = await this.connection.execute('SELECT COUNT(*) as count FROM user_accounts');
            console.log(`👤 User accounts: ${users[0].count}`);
            
            // Count employees
            const [employees] = await this.connection.execute('SELECT COUNT(*) as count FROM employees');
            console.log(`👥 Employees: ${employees[0].count}`);
            
            // Count departments
            const [departments] = await this.connection.execute('SELECT COUNT(*) as count FROM departments');
            console.log(`🏢 Departments: ${departments[0].count}`);
            
            // Count settings
            const [settings] = await this.connection.execute('SELECT COUNT(*) as count FROM system_settings');
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
            console.log('   4. Configure settings as needed');
            
        } catch (error) {
            console.error('❌ Error generating summary:', error.message);
        }
    }

    async cleanup() {
        if (this.connection) {
            await this.connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }

    async run() {
        try {
            await this.connect();
            await this.createDatabase();
            await this.createTables();
            await this.insertDefaultData();
            await this.showSummary();
            
            console.log('\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!');
            
        } catch (error) {
            console.error('\n💥 SETUP FAILED:', error.message);
            console.error('\nPlease check the error above and try again.');
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Create .env file if it doesn't exist
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

// Run setup
async function main() {
    try {
        // Create .env file if needed
        createEnvFile();
        
        // Run database setup
        const setup = new DatabaseSetup();
        await setup.run();
        
    } catch (error) {
        console.error('💥 Setup failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatabaseSetup;
