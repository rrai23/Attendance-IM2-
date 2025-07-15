const db = require('./connection');
const bcrypt = require('bcryptjs');

const createUpdatedTables = async () => {
    try {
        console.log('🔧 Creating/updating database tables to match current system...');

        // 1. USER_ACCOUNTS table (primary employee authentication table)
        await db.execute(`
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
                
                -- Additional employee profile fields that frontend expects
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

        // 2. EMPLOYEES table (extended employee profile data)
        await db.execute(`
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
                INDEX idx_role (role),
                FOREIGN KEY (employee_id) REFERENCES user_accounts(employee_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 3. ATTENDANCE_RECORDS table (matches current API usage)
        await db.execute(`
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
                
                FOREIGN KEY (employee_id) REFERENCES user_accounts(employee_id) ON DELETE CASCADE,
                UNIQUE KEY unique_employee_date (employee_id, date),
                INDEX idx_date (date),
                INDEX idx_status (status),
                INDEX idx_employee_date (employee_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 4. USER_SESSIONS table (for JWT token management)
        await db.execute(`
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
                
                FOREIGN KEY (employee_id) REFERENCES user_accounts(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_token_hash (token_hash),
                INDEX idx_expires_at (expires_at),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 5. PAYROLL_RECORDS table (enhanced for Philippine payroll)
        await db.execute(`
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
                
                FOREIGN KEY (employee_id) REFERENCES user_accounts(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_pay_period (pay_period_start, pay_period_end),
                INDEX idx_status (status),
                INDEX idx_pay_date (pay_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // 6. SYSTEM_SETTINGS table (application configuration)
        await db.execute(`
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

        // 7. DEPARTMENTS table (organizational structure)
        await db.execute(`
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

        // 8. AUDIT_LOG table (system activity tracking)
        await db.execute(`
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

        // 9. OVERTIME_REQUESTS table (overtime approval workflow)
        await db.execute(`
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
                
                FOREIGN KEY (employee_id) REFERENCES user_accounts(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_request_date (request_date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ All tables created/updated successfully');

        // Insert default system settings
        await insertDefaultSettings();

        // Insert default departments
        await insertDefaultDepartments();

        console.log('✅ Database migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

const insertDefaultSettings = async () => {
    try {
        console.log('📋 Inserting default system settings...');
        
        const defaultSettings = [
            ['company', 'name', 'Bricks Attendance System', 'string', 'Company name'],
            ['company', 'timezone', 'Asia/Manila', 'string', 'System timezone'],
            ['attendance', 'standard_hours', '8', 'number', 'Standard work hours per day'],
            ['attendance', 'late_threshold', '15', 'number', 'Late threshold in minutes'],
            ['attendance', 'overtime_threshold', '8.5', 'number', 'Overtime threshold in hours'],
            ['payroll', 'sss_rate', '0.045', 'number', 'SSS contribution rate'],
            ['payroll', 'philhealth_rate', '0.025', 'number', 'PhilHealth contribution rate'],
            ['payroll', 'pagibig_rate', '0.02', 'number', 'Pag-IBIG contribution rate'],
            ['system', 'auto_logout', '30', 'number', 'Auto logout time in minutes'],
            ['system', 'backup_enabled', 'true', 'boolean', 'Enable automatic backups']
        ];

        for (const [category, key, value, type, description] of defaultSettings) {
            await db.execute(`
                INSERT IGNORE INTO system_settings (category, setting_key, setting_value, data_type, description)
                VALUES (?, ?, ?, ?, ?)
            `, [category, key, value, type, description]);
        }

        console.log('✅ Default settings inserted');
    } catch (error) {
        console.error('❌ Error inserting settings:', error);
    }
};

const insertDefaultDepartments = async () => {
    try {
        console.log('🏢 Inserting default departments...');
        
        const defaultDepartments = [
            ['ADMIN', 'Administration', 'Administrative and management functions'],
            ['HR', 'Human Resources', 'Employee relations and recruitment'],
            ['IT', 'Information Technology', 'Technical support and development'],
            ['FINANCE', 'Finance', 'Financial operations and accounting'],
            ['OPERATIONS', 'Operations', 'Daily business operations'],
            ['SALES', 'Sales', 'Sales and customer relations'],
            ['MARKETING', 'Marketing', 'Marketing and promotions']
        ];

        for (const [code, name, description] of defaultDepartments) {
            await db.execute(`
                INSERT IGNORE INTO departments (department_code, department_name, description)
                VALUES (?, ?, ?)
            `, [code, name, description]);
        }

        console.log('✅ Default departments inserted');
    } catch (error) {
        console.error('❌ Error inserting departments:', error);
    }
};

// Main execution
const runMigration = async () => {
    try {
        await createUpdatedTables();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

// Run migration if called directly
if (require.main === module) {
    runMigration();
}

module.exports = { createUpdatedTables, insertDefaultSettings, insertDefaultDepartments };
