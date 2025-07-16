#!/usr/bin/env node

/**
 * BRICKS ATTENDANCE SYSTEM - DATABASE CREATION SCRIPT
 * 
 * This script creates a complete database structure for the Bricks Attendance System
 * Database: bricks_attendance
 * 
 * Tables created:
 * - user_accounts (primary authentication)
 * - employees (employee master data)
 * - departments (department structure)
 * - attendance_records (daily attendance)
 * - payroll_records (payroll data)
 * - system_settings (system configuration)
 * - audit_log (audit trail)
 * - overtime_requests (overtime management)
 * 
 * All tables have proper foreign key relationships to employees table
 * 
 * Usage: node create-database.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Database configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'bricks_attendance',
    multipleStatements: true,
    charset: 'utf8mb4'
};

class DatabaseCreator {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            // Connect without database first to create it
            const tempConfig = { ...config };
            delete tempConfig.database;
            
            console.log('🔌 Connecting to MySQL server...');
            this.connection = await mysql.createConnection(tempConfig);
            console.log('✅ Connected to MySQL server');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to MySQL:', error.message);
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
            
            // Reconnect with database
            await this.connection.end();
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
            
            // 1. DEPARTMENTS table (create first for FK reference)
            console.log('   🏢 Creating departments table...');
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS departments (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    department_code VARCHAR(20) UNIQUE NOT NULL,
                    department_name VARCHAR(100) NOT NULL,
                    manager_employee_id VARCHAR(50) NULL,
                    description TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_department_code (department_code),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 2. EMPLOYEES table (central table for FK relationships)
            console.log('   👥 Creating employees table...');
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS employees (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    employee_id VARCHAR(50) UNIQUE NOT NULL,
                    username VARCHAR(100) UNIQUE,
                    password VARCHAR(255),
                    role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                    full_name VARCHAR(255) NOT NULL,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    email VARCHAR(255),
                    phone VARCHAR(20),
                    department_id INT,
                    department VARCHAR(100),
                    position VARCHAR(100),
                    manager_id VARCHAR(50),
                    hire_date DATE,
                    status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
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
                    INDEX idx_role (role),
                    
                    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
                    FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 3. USER_ACCOUNTS table (modern authentication)
            console.log('   🔐 Creating user_accounts table...');
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
                    
                    -- Profile fields (duplicated for quick access)
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
                    INDEX idx_active (is_active),
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE
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
                    INDEX idx_employee_date (employee_id, date),
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (approved_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 5. PAYROLL_RECORDS table
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
                    
                    -- Deductions
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
                    INDEX idx_pay_date (pay_date),
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (processed_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // 6. OVERTIME_REQUESTS table
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
                    INDEX idx_status (status),
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (requested_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
                    FOREIGN KEY (approved_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
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
                    INDEX idx_created_at (created_at),
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
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
                console.error('Failed to re-enable foreign key checks:', fkError.message);
            }
            throw error;
        }
    }

    async insertDefaultData() {
        try {
            console.log('\n📋 Inserting default data...');
            
            // Insert departments
            await this.insertDepartments();
            
            // Insert system settings
            await this.insertSystemSettings();
            
            // Create admin user
            await this.createAdminUser();
            
            // Insert sample employees
            await this.insertSampleEmployees();
            
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
            ['payroll', 'overtimeRate', '1.5', 'number', 'Overtime rate multiplier'],
            ['payroll', 'sssRate', '0.045', 'number', 'SSS contribution rate'],
            ['payroll', 'philhealthRate', '0.025', 'number', 'PhilHealth contribution rate'],
            ['payroll', 'pagibigRate', '0.02', 'number', 'Pag-IBIG contribution rate'],
            
            // Security settings
            ['security', 'sessionTimeout', '480', 'number', 'Session timeout (minutes)'],
            ['security', 'maxLoginAttempts', '5', 'number', 'Maximum login attempts'],
            ['security', 'passwordMinLength', '6', 'number', 'Minimum password length']
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
        
        // Insert admin employee first
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
        
        console.log('   ✅ Admin user created (username: admin, password: admin123)');
    }

    async insertSampleEmployees() {
        console.log('   👥 Adding sample employees...');
        
        const employees = [
            {
                id: 'john.smith',
                username: 'john.smith',
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@brickscompany.com',
                department: 'HR',
                position: 'Manager',
                wage: 20.00,
                role: 'manager'
            },
            {
                id: 'jane.doe',
                username: 'jane.doe',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@brickscompany.com',
                department: 'IT',
                position: 'Developer',
                wage: 18.00,
                role: 'employee'
            },
            {
                id: 'mike.johnson',
                username: 'mike.johnson',
                firstName: 'Mike',
                lastName: 'Johnson',
                email: 'mike.johnson@brickscompany.com',
                department: 'SALES',
                position: 'Sales Rep',
                wage: 16.00,
                role: 'employee'
            }
        ];
        
        const defaultPassword = await bcrypt.hash('john123', 12);
        
        for (const emp of employees) {
            const empPassword = emp.id === 'john.smith' ? defaultPassword : await bcrypt.hash('password123', 12);
            
            // Insert into employees
            await this.connection.execute(`
                INSERT IGNORE INTO employees (
                    employee_id, username, password, role, full_name, first_name, last_name,
                    email, department, position, hire_date, status, wage, salary_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                emp.id, emp.username, empPassword, emp.role, `${emp.firstName} ${emp.lastName}`,
                emp.firstName, emp.lastName, emp.email, emp.department, emp.position,
                new Date().toISOString().split('T')[0], 'active', emp.wage, 'hourly'
            ]);
            
            // Insert into user_accounts
            await this.connection.execute(`
                INSERT IGNORE INTO user_accounts (
                    employee_id, username, password_hash, role, is_active,
                    first_name, last_name, full_name, email, department, position,
                    hire_date, employee_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                emp.id, emp.username, empPassword, emp.role, true,
                emp.firstName, emp.lastName, `${emp.firstName} ${emp.lastName}`,
                emp.email, emp.department, emp.position,
                new Date().toISOString().split('T')[0], 'active'
            ]);
        }
        
        console.log('   ✅ Sample employees created');
        console.log('      - john.smith (Manager) - password: john123');
        console.log('      - jane.doe (Employee) - password: password123');
        console.log('      - mike.johnson (Employee) - password: password123');
    }

    async showSummary() {
        try {
            console.log('\n📊 DATABASE CREATION SUMMARY');
            console.log('=' .repeat(60));
            
            // Count tables
            const [tables] = await this.connection.execute('SHOW TABLES');
            console.log(`📋 Tables created: ${tables.length}`);
            
            // List all tables
            console.log('\n📋 Database Tables:');
            for (const table of tables) {
                const tableName = table[`Tables_in_${config.database}`];
                console.log(`   ✅ ${tableName}`);
            }
            
            // Show foreign key relationships
            console.log('\n🔗 Foreign Key Relationships:');
            console.log('   employees <- user_accounts (employee_id)');
            console.log('   employees <- attendance_records (employee_id)');
            console.log('   employees <- payroll_records (employee_id)');
            console.log('   employees <- overtime_requests (employee_id)');
            console.log('   employees <- audit_log (employee_id)');
            console.log('   departments <- employees (department_id)');
            
            // Count records
            const [userCount] = await this.connection.execute('SELECT COUNT(*) as count FROM user_accounts');
            const [empCount] = await this.connection.execute('SELECT COUNT(*) as count FROM employees');
            const [deptCount] = await this.connection.execute('SELECT COUNT(*) as count FROM departments');
            const [settingsCount] = await this.connection.execute('SELECT COUNT(*) as count FROM system_settings');
            
            console.log(`\n📊 Data Summary:`);
            console.log(`   👤 User accounts: ${userCount[0].count}`);
            console.log(`   👥 Employees: ${empCount[0].count}`);
            console.log(`   🏢 Departments: ${deptCount[0].count}`);
            console.log(`   ⚙️  System settings: ${settingsCount[0].count}`);
            
            console.log('\n🔐 LOGIN CREDENTIALS:');
            console.log('   Admin: admin / admin123');
            console.log('   Manager: john.smith / john123');
            console.log('   Employee: jane.doe / password123');
            console.log('   Employee: mike.johnson / password123');
            
            console.log('\n🚀 NEXT STEPS:');
            console.log('   1. Start your application server');
            console.log('   2. Login with admin credentials');
            console.log('   3. Configure additional settings as needed');
            console.log('   4. Add more employees via the admin interface');
            
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
        console.log('🚀 BRICKS ATTENDANCE SYSTEM - DATABASE CREATOR');
        console.log('=' .repeat(60));
        console.log(`📊 Database: ${config.database}`);
        console.log(`🖥️  Host: ${config.host}:${config.port}`);
        console.log(`👤 User: ${config.user}`);
        console.log('=' .repeat(60));
        
        try {
            await this.connect();
            await this.createDatabase();
            await this.createTables();
            await this.insertDefaultData();
            await this.showSummary();
            
            console.log('\n🎉 DATABASE CREATION COMPLETED SUCCESSFULLY!');
            
        } catch (error) {
            console.error('\n💥 DATABASE CREATION FAILED:', error.message);
            console.error('\nPlease check the error above and try again.');
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the database creator
if (require.main === module) {
    const creator = new DatabaseCreator();
    creator.run();
}

module.exports = DatabaseCreator;
