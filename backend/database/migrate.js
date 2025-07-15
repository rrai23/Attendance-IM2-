const db = require('./connection');
const bcrypt = require('bcryptjs');

const createTables = async () => {
    try {
        console.log('🔧 Creating database tables...');

        // Employees table (enhanced to match UnifiedEmployeeManager structure)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT PRIMARY KEY AUTO_INCREMENT,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE,
                password VARCHAR(255),
                role ENUM('admin', 'manager', 'employee') DEFAULT 'employee',
                full_name VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                department VARCHAR(100),
                position VARCHAR(100),
                manager_id VARCHAR(50),
                date_hired DATE,
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
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Attendance records table (enhanced to match frontend structure)
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
                hours_worked DECIMAL(5,2) DEFAULT 0.00,
                overtime_hours DECIMAL(5,2) DEFAULT 0.00,
                status ENUM('present', 'absent', 'late', 'tardy', 'on_leave', 'sick', 'vacation', 'overtime') DEFAULT 'present',
                notes TEXT,
                ip_address VARCHAR(45),
                location VARCHAR(255),
                approved_by VARCHAR(50),
                approved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                UNIQUE KEY unique_employee_date (employee_id, date),
                INDEX idx_date (date),
                INDEX idx_status (status),
                INDEX idx_employee_date (employee_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Payroll records table
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
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_pay_period (pay_period_start, pay_period_end),
                INDEX idx_status (status),
                INDEX idx_pay_date (pay_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // System settings table (matches your settings structure)
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

        // User sessions table (for JWT token management)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                employee_id VARCHAR(50) NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_token_hash (token_hash),
                INDEX idx_expires_at (expires_at),
                INDEX idx_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Departments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                manager_id VARCHAR(50),
                budget DECIMAL(15,2) DEFAULT 0.00,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_manager_id (manager_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Overtime requests table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS overtime_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                employee_id VARCHAR(50) NOT NULL,
                request_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                hours_requested DECIMAL(5,2) NOT NULL,
                reason TEXT,
                status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
                requested_by VARCHAR(50),
                approved_by VARCHAR(50),
                approved_at TIMESTAMP NULL,
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
                INDEX idx_employee_id (employee_id),
                INDEX idx_request_date (request_date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Audit log table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                employee_id VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(100),
                record_id VARCHAR(100),
                old_values JSON,
                new_values JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
                INDEX idx_employee_id (employee_id),
                INDEX idx_action (action),
                INDEX idx_table_name (table_name),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ All database tables created successfully');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

// Seed default data (matches your current localStorage data structure)
const seedDefaultData = async () => {
    try {
        console.log('🌱 Seeding default data...');

        // Check if we already have data
        const result = await db.execute('SELECT COUNT(*) as count FROM employees');
        const existingUsers = result[0];
        
        // Handle different result structures
        const count = existingUsers && existingUsers.length > 0 ? 
                     (existingUsers[0].count || existingUsers[0]['COUNT(*)']) : 0;
        
        console.log(`📊 Found ${count} existing employees`);
        
        if (count > 0) {
            console.log('📊 Database already has data, skipping seed');
            return;
        }

        // Create default departments
        const departments = [
            { name: 'IT', description: 'Information Technology Department' },
            { name: 'HR', description: 'Human Resources Department' },
            { name: 'Finance', description: 'Finance and Accounting Department' },
            { name: 'Operations', description: 'Operations Department' },
            { name: 'Marketing', description: 'Marketing Department' }
        ];

        for (const dept of departments) {
            await db.execute(
                'INSERT IGNORE INTO departments (name, description) VALUES (?, ?)',
                [dept.name, dept.description]
            );
        }

        // Create default admin user (matches your current system)
        const adminPassword = await bcrypt.hash('admin', 10);
        const adminEmployeeCode = 'ADMIN001';

        await db.execute(`
            INSERT IGNORE INTO employees (
                employee_code, username, password_hash, role, full_name, 
                first_name, last_name, email, department, position, 
                date_hired, hourly_rate, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            adminEmployeeCode,
            'admin',
            adminPassword,
            'admin',
            'System Administrator',
            'System',
            'Administrator',
            'admin@brickscompany.com',
            'IT',
            'System Administrator',
            new Date().toISOString().split('T')[0], // Today's date
            30.00,
            'active'
        ]);

        // Create sample employees (matching your current structure)
        const sampleEmployees = [
            {
                employee_code: 'EMP001',
                username: 'john.doe',
                full_name: 'John Doe',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@brickscompany.com',
                department: 'IT',
                position: 'Software Developer',
                hourly_rate: 25.00
            },
            {
                employee_code: 'EMP002',
                username: 'jane.smith',
                full_name: 'Jane Smith',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@brickscompany.com',
                department: 'HR',
                position: 'HR Specialist',
                hourly_rate: 22.00
            },
            {
                employee_code: 'EMP003',
                username: 'mike.johnson',
                full_name: 'Mike Johnson',
                first_name: 'Mike',
                last_name: 'Johnson',
                email: 'mike.johnson@brickscompany.com',
                department: 'Finance',
                position: 'Accountant',
                hourly_rate: 24.00
            }
        ];

        for (const emp of sampleEmployees) {
            const defaultPassword = await bcrypt.hash('employee', 10);
            
            await db.execute(`
                INSERT IGNORE INTO employees (
                    employee_code, username, password_hash, role, full_name,
                    first_name, last_name, email, department, position, 
                    date_hired, hourly_rate, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                emp.employee_code, emp.username, defaultPassword, 'employee',
                emp.full_name, emp.first_name, emp.last_name,
                emp.email, emp.department, emp.position, 
                new Date().toISOString().split('T')[0], // Today's date
                emp.hourly_rate, 'active'
            ]);
        }

        // Seed default system settings (matches your current settings structure)
        const defaultSettings = [
            { setting_key: 'companyName', setting_value: 'Bricks Company', description: 'Company name for system branding' },
            { setting_key: 'timezone', setting_value: 'Asia/Manila', description: 'Default timezone for the system' },
            { setting_key: 'dateFormat', setting_value: 'MM/DD/YYYY', description: 'Date format used throughout the system' },
            { setting_key: 'timeFormat', setting_value: '12', description: 'Time format (12 or 24 hour)' },
            { setting_key: 'currency', setting_value: 'PHP', description: 'Default currency for payroll' },
            { setting_key: 'payPeriod', setting_value: 'weekly', description: 'Default pay period frequency' },
            { setting_key: 'overtimeRate', setting_value: '1.5', description: 'Overtime rate multiplier' },
            { setting_key: 'overtimeThreshold', setting_value: '40', description: 'Hours threshold for overtime' },
            { setting_key: 'clockInGrace', setting_value: '5', description: 'Grace period for clock in (minutes)' },
            { setting_key: 'clockOutGrace', setting_value: '5', description: 'Grace period for clock out (minutes)' },
            { setting_key: 'lunchBreakDuration', setting_value: '30', description: 'Default lunch break duration (minutes)' }
        ];

        for (const setting of defaultSettings) {
            await db.execute(
                'INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
                [setting.setting_key, setting.setting_value, setting.description]
            );
        }

        console.log('✅ Default data seeded successfully');
        console.log('👤 Default admin user: username=admin, password=admin');
        console.log('👥 Sample employees created with username=email prefix, password=employee');

    } catch (error) {
        console.error('❌ Error seeding default data:', error);
        throw error;
    }
};

const migrate = async () => {
    try {
        await createTables();
        await seedDefaultData();
        console.log('🎉 Database migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

// Run migration if this file is executed directly
if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = {
    createTables,
    seedDefaultData,
    migrate
};
