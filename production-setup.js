/**
 * Production Setup Script for Bricks Attendance System
 * 
 * This script performs a complete setup including:
 * - Database creation and structure validation
 * - User sessions table creation
 * - Admin user creation with proper password hashing
 * - Data integrity checks
 * - Production-ready configuration
 * 
 * Run this script once during initial deployment or system reset
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    timezone: '+00:00',
    charset: 'utf8mb4'
};

// Production users configuration
const PRODUCTION_USERS = [
    {
        username: 'admin',
        password: 'admin123', // Change this in production
        employee_id: 'admin_001',
        role: 'admin',
        full_name: 'System Administrator',
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@brickscompany.com',
        department: 'ADMIN',
        position: 'System Administrator',
        status: 'active'
    },
    {
        username: 'john.smith',
        password: 'manager123', // Change this in production
        employee_id: 'john.smith',
        role: 'manager',
        full_name: 'John Smith',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@brickscompany.com',
        department: 'HR',
        position: 'Manager',
        status: 'active'
    },
    {
        username: 'jane.doe',
        password: 'employee123', // Change this in production
        employee_id: 'jane.doe',
        role: 'employee',
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@brickscompany.com',
        department: 'IT',
        position: 'Developer',
        status: 'active'
    }
];

class ProductionSetup {
    constructor() {
        this.connection = null;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.setupLog = [];
    }

    // Logging utility
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        
        console.log(logEntry);
        this.setupLog.push(logEntry);
    }

    // Connect to database
    async connect() {
        try {
            this.log('Connecting to database...');
            
            // First connect without database to create it if needed
            const tempConfig = { ...dbConfig };
            delete tempConfig.database;
            const tempConnection = await mysql.createConnection(tempConfig);
            
            // Create database if it doesn't exist
            await tempConnection.execute(`
                CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` 
                CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            `);
            
            this.log(`Database '${dbConfig.database}' created/verified`);
            await tempConnection.end();
            
            // Connect to the actual database
            this.connection = await mysql.createConnection(dbConfig);
            this.log('Connected to MySQL database successfully');
            
        } catch (error) {
            this.log(`Database connection failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // Create departments table
    async createDepartmentsTable() {
        const createDepartmentsSQL = `
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                manager_id VARCHAR(50),
                budget DECIMAL(15,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_department_name (name),
                INDEX idx_department_manager (manager_id),
                INDEX idx_department_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createDepartmentsSQL);
        this.log('Departments table created/verified');
    }

    // Create employees table
    async createEmployeesTable() {
        const createEmployeesSQL = `
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL UNIQUE,
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
                overtime_rate DECIMAL(4,2) DEFAULT 1.50,
                salary_type ENUM('hourly', 'salary') DEFAULT 'hourly',
                avatar VARCHAR(500),
                address TEXT,
                emergency_contact VARCHAR(255),
                emergency_phone VARCHAR(20),
                work_schedule LONGTEXT,
                permissions LONGTEXT,
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_employee_id (employee_id),
                INDEX idx_employee_username (username),
                INDEX idx_employee_email (email),
                INDEX idx_employee_department (department),
                INDEX idx_employee_manager (manager_id),
                INDEX idx_employee_role (role),
                INDEX idx_employee_status (status),
                INDEX idx_employee_active (is_active),
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createEmployeesSQL);
        this.log('Employees table created/verified');
    }

    // Create user_accounts table (separate from employees for security)
    async createUserAccountsTable() {
        const createUserAccountsSQL = `
            CREATE TABLE IF NOT EXISTS user_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL UNIQUE,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                failed_login_attempts INT DEFAULT 0,
                account_locked_until TIMESTAMP NULL,
                password_reset_token VARCHAR(255),
                password_reset_expires TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                full_name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(20),
                department VARCHAR(100),
                position VARCHAR(100),
                hire_date DATE,
                employee_status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
                INDEX idx_user_employee_id (employee_id),
                INDEX idx_user_username (username),
                INDEX idx_user_email (email),
                INDEX idx_user_role (role),
                INDEX idx_user_active (is_active),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createUserAccountsSQL);
        this.log('User accounts table created/verified');
    }

    // Create user_sessions table
    async createUserSessionsTable() {
        const createUserSessionsSQL = `
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                token_hash VARCHAR(500) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_agent VARCHAR(500),
                ip_address VARCHAR(45),
                INDEX idx_session_employee (employee_id),
                INDEX idx_session_token (token_hash),
                INDEX idx_session_expires (expires_at),
                INDEX idx_session_active (is_active),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createUserSessionsSQL);
        this.log('User sessions table created/verified');
    }

    // Create attendance_records table
    async createAttendanceRecordsTable() {
        const createAttendanceSQL = `
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                time_in TIME,
                time_out TIME,
                break_start TIME,
                break_end TIME,
                total_hours DECIMAL(5,2) DEFAULT 0.00,
                overtime_hours DECIMAL(5,2) DEFAULT 0.00,
                status ENUM('present', 'absent', 'late', 'half_day', 'sick', 'vacation', 'holiday') DEFAULT 'present',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_employee_date (employee_id, date),
                INDEX idx_attendance_employee (employee_id),
                INDEX idx_attendance_date (date),
                INDEX idx_attendance_status (status),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createAttendanceSQL);
        this.log('Attendance records table created/verified');
    }

    // Create payroll_records table
    async createPayrollRecordsTable() {
        const createPayrollSQL = `
            CREATE TABLE IF NOT EXISTS payroll_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                pay_period_start DATE NOT NULL,
                pay_period_end DATE NOT NULL,
                regular_hours DECIMAL(5,2) DEFAULT 0.00,
                overtime_hours DECIMAL(5,2) DEFAULT 0.00,
                regular_pay DECIMAL(10,2) DEFAULT 0.00,
                overtime_pay DECIMAL(10,2) DEFAULT 0.00,
                gross_pay DECIMAL(10,2) DEFAULT 0.00,
                deductions DECIMAL(10,2) DEFAULT 0.00,
                net_pay DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('draft', 'approved', 'paid') DEFAULT 'draft',
                processed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payroll_employee (employee_id),
                INDEX idx_payroll_period (pay_period_start, pay_period_end),
                INDEX idx_payroll_status (status),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createPayrollSQL);
        this.log('Payroll records table created/verified');
    }

    // Create system_settings table
    async createSystemSettingsTable() {
        const createSystemSettingsSQL = `
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT,
                setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                description TEXT,
                is_editable BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_setting_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createSystemSettingsSQL);
        this.log('System settings table created/verified');
    }

    // Create audit_log table
    async createAuditLogTable() {
        const createAuditLogSQL = `
            CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(100),
                record_id VARCHAR(100),
                old_values JSON,
                new_values JSON,
                ip_address VARCHAR(45),
                user_agent VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_audit_user (user_id),
                INDEX idx_audit_action (action),
                INDEX idx_audit_table (table_name),
                INDEX idx_audit_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createAuditLogSQL);
        this.log('Audit log table created/verified');
    }

    // Create overtime_requests table
    async createOvertimeRequestsTable() {
        const createOvertimeSQL = `
            CREATE TABLE IF NOT EXISTS overtime_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) NOT NULL,
                request_date DATE NOT NULL,
                hours_requested DECIMAL(5,2) NOT NULL,
                reason TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                approved_by VARCHAR(50),
                approved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_overtime_employee (employee_id),
                INDEX idx_overtime_date (request_date),
                INDEX idx_overtime_status (status),
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await this.connection.execute(createOvertimeSQL);
        this.log('Overtime requests table created/verified');
    }

    // Insert default departments
    async insertDefaultDepartments() {
        const departments = [
            { name: 'ADMIN', description: 'System Administration' },
            { name: 'HR', description: 'Human Resources' },
            { name: 'IT', description: 'Information Technology' },
            { name: 'SALES', description: 'Sales Department' },
            { name: 'MARKETING', description: 'Marketing Department' },
            { name: 'FINANCE', description: 'Finance Department' },
            { name: 'OPERATIONS', description: 'Operations Department' }
        ];

        for (const dept of departments) {
            await this.connection.execute(
                'INSERT IGNORE INTO departments (name, description) VALUES (?, ?)',
                [dept.name, dept.description]
            );
        }
        
        this.log('Default departments inserted/verified');
    }

    // Insert default system settings
    async insertDefaultSystemSettings() {
        const settings = [
            { key: 'company_name', value: 'Bricks Company', type: 'string', description: 'Company name' },
            { key: 'work_hours_per_day', value: '8', type: 'number', description: 'Standard work hours per day' },
            { key: 'work_days_per_week', value: '5', type: 'number', description: 'Standard work days per week' },
            { key: 'overtime_rate', value: '1.5', type: 'number', description: 'Overtime pay rate multiplier' },
            { key: 'timezone', value: 'UTC', type: 'string', description: 'System timezone' },
            { key: 'currency', value: 'USD', type: 'string', description: 'System currency' },
            { key: 'date_format', value: 'YYYY-MM-DD', type: 'string', description: 'Date format' },
            { key: 'time_format', value: 'HH:mm:ss', type: 'string', description: 'Time format' },
            { key: 'max_login_attempts', value: '5', type: 'number', description: 'Maximum login attempts before lockout' },
            { key: 'session_timeout', value: '24', type: 'number', description: 'Session timeout in hours' }
        ];

        for (const setting of settings) {
            await this.connection.execute(
                'INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)',
                [setting.key, setting.value, setting.type, setting.description]
            );
        }
        
        this.log('Default system settings inserted/verified');
    }

    // Create production users
    async createProductionUsers() {
        this.log('Creating production users...');
        
        for (const user of PRODUCTION_USERS) {
            // Hash password
            const hashedPassword = await bcrypt.hash(user.password, 12);
            
            // Insert employee record
            await this.connection.execute(`
                INSERT INTO employees (
                    employee_id, username, password, role, full_name, first_name, last_name,
                    email, department, position, hire_date, status, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, TRUE)
                ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    password = VALUES(password),
                    role = VALUES(role),
                    full_name = VALUES(full_name),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    email = VALUES(email),
                    department = VALUES(department),
                    position = VALUES(position),
                    status = VALUES(status),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                user.employee_id, user.username, hashedPassword, user.role,
                user.full_name, user.first_name, user.last_name,
                user.email, user.department, user.position, user.status
            ]);

            // Insert user account record
            await this.connection.execute(`
                INSERT INTO user_accounts (
                    employee_id, username, password_hash, role, first_name, last_name,
                    full_name, email, department, position, hire_date, employee_status, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, TRUE)
                ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    password_hash = VALUES(password_hash),
                    role = VALUES(role),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    full_name = VALUES(full_name),
                    email = VALUES(email),
                    department = VALUES(department),
                    position = VALUES(position),
                    employee_status = VALUES(employee_status),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                user.employee_id, user.username, hashedPassword, user.role,
                user.first_name, user.last_name, user.full_name,
                user.email, user.department, user.position, user.status
            ]);

            this.log(`User created/updated: ${user.username} (${user.role})`);
        }
    }

    // Validate database integrity
    async validateDatabaseIntegrity() {
        this.log('Validating database integrity...');
        
        // Check if all tables exist
        const [tables] = await this.connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        const expectedTables = [
            'departments', 'employees', 'user_accounts', 'user_sessions',
            'attendance_records', 'payroll_records', 'system_settings',
            'audit_log', 'overtime_requests'
        ];
        
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        if (missingTables.length > 0) {
            throw new Error(`Missing tables: ${missingTables.join(', ')}`);
        }
        
        // Check if admin user exists
        const [adminCheck] = await this.connection.execute(
            'SELECT COUNT(*) as count FROM user_accounts WHERE username = ? AND role = ?',
            ['admin', 'admin']
        );
        
        if (adminCheck[0].count === 0) {
            throw new Error('Admin user not found');
        }
        
        // Check if JOIN works correctly (the fix we implemented)
        const [joinCheck] = await this.connection.execute(`
            SELECT COUNT(*) as count 
            FROM user_accounts ua 
            JOIN employees e ON ua.employee_id = e.employee_id 
            WHERE ua.username = 'admin'
        `);
        
        if (joinCheck[0].count === 0) {
            throw new Error('JOIN query between user_accounts and employees failed');
        }
        
        this.log('Database integrity validation passed');
    }

    // Save setup log
    async saveSetupLog() {
        const logContent = this.setupLog.join('\n');
        const logPath = path.join(__dirname, 'setup-log.txt');
        
        try {
            await fs.writeFile(logPath, logContent);
            this.log(`Setup log saved to: ${logPath}`);
        } catch (error) {
            this.log(`Failed to save setup log: ${error.message}`, 'error');
        }
    }

    // Main setup process
    async run() {
        const startTime = Date.now();
        
        try {
            this.log('='.repeat(60));
            this.log('BRICKS ATTENDANCE SYSTEM - PRODUCTION SETUP');
            this.log('='.repeat(60));
            
            // Database setup
            await this.connect();
            
            // Create all tables
            await this.createDepartmentsTable();
            await this.createEmployeesTable();
            await this.createUserAccountsTable();
            await this.createUserSessionsTable();
            await this.createAttendanceRecordsTable();
            await this.createPayrollRecordsTable();
            await this.createSystemSettingsTable();
            await this.createAuditLogTable();
            await this.createOvertimeRequestsTable();
            
            // Insert default data
            await this.insertDefaultDepartments();
            await this.insertDefaultSystemSettings();
            await this.createProductionUsers();
            
            // Validate setup
            await this.validateDatabaseIntegrity();
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            this.log('='.repeat(60));
            this.log('✅ PRODUCTION SETUP COMPLETED SUCCESSFULLY');
            this.log(`⏱️  Setup completed in ${duration} seconds`);
            this.log('='.repeat(60));
            
            // Display login credentials
            this.log('\n🔐 LOGIN CREDENTIALS:');
            this.log('┌─────────────────┬─────────────────┬─────────────┐');
            this.log('│ Username        │ Password        │ Role        │');
            this.log('├─────────────────┼─────────────────┼─────────────┤');
            PRODUCTION_USERS.forEach(user => {
                this.log(`│ ${user.username.padEnd(15)} │ ${user.password.padEnd(15)} │ ${user.role.padEnd(11)} │`);
            });
            this.log('└─────────────────┴─────────────────┴─────────────┘');
            
            this.log('\n⚠️  IMPORTANT SECURITY NOTES:');
            this.log('   - Change default passwords immediately in production');
            this.log('   - Review and update system settings as needed');
            this.log('   - Enable SSL/TLS for database connections');
            this.log('   - Set up proper database user permissions');
            this.log('   - Configure firewall rules');
            
            await this.saveSetupLog();
            
        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'error');
            throw error;
        } finally {
            if (this.connection) {
                await this.connection.end();
                this.log('Database connection closed');
            }
        }
    }
}

// Export for use as module
module.exports = ProductionSetup;

// Run if executed directly
if (require.main === module) {
    const setup = new ProductionSetup();
    setup.run().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}
