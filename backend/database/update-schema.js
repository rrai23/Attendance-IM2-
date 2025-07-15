const db = require('./connection');

const updateExistingTables = async () => {
    try {
        console.log('🔧 Updating existing database tables with missing columns...');

        // Check and update system_settings table
        try {
            console.log('📋 Checking system_settings table...');
            
            // Check if category column exists
            const [settingsColumns] = await db.execute('SHOW COLUMNS FROM system_settings');
            const hasCategory = settingsColumns.some(col => col.Field === 'category');
            
            if (!hasCategory) {
                console.log('Adding missing columns to system_settings...');
                await db.execute(`
                    ALTER TABLE system_settings 
                    ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'general' AFTER id,
                    ADD COLUMN setting_key VARCHAR(100) NOT NULL DEFAULT '' AFTER category,
                    ADD COLUMN setting_value TEXT AFTER setting_key,
                    ADD COLUMN data_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string' AFTER setting_value,
                    ADD COLUMN description TEXT AFTER data_type
                `);
                console.log('✅ Updated system_settings table');
            } else {
                console.log('✅ system_settings table already has required columns');
            }
        } catch (error) {
            console.log('❌ Error updating system_settings:', error.message);
        }

        // Check and update departments table
        try {
            console.log('🏢 Checking departments table...');
            
            const [deptColumns] = await db.execute('SHOW COLUMNS FROM departments');
            const hasDeptCode = deptColumns.some(col => col.Field === 'department_code');
            
            if (!hasDeptCode) {
                console.log('Adding missing columns to departments...');
                await db.execute(`
                    ALTER TABLE departments 
                    ADD COLUMN department_code VARCHAR(20) UNIQUE NOT NULL DEFAULT '' AFTER id,
                    ADD COLUMN department_name VARCHAR(100) NOT NULL DEFAULT '' AFTER department_code,
                    ADD COLUMN manager_employee_id VARCHAR(50) AFTER department_name,
                    ADD COLUMN description TEXT AFTER manager_employee_id,
                    ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER description
                `);
                console.log('✅ Updated departments table');
            } else {
                console.log('✅ departments table already has required columns');
            }
        } catch (error) {
            console.log('❌ Error updating departments:', error.message);
        }

        // Check and update user_accounts table with extended fields
        try {
            console.log('👤 Checking user_accounts table...');
            
            const [userColumns] = await db.execute('SHOW COLUMNS FROM user_accounts');
            const hasFirstName = userColumns.some(col => col.Field === 'first_name');
            
            if (!hasFirstName) {
                console.log('Adding missing employee profile columns to user_accounts...');
                await db.execute(`
                    ALTER TABLE user_accounts 
                    ADD COLUMN first_name VARCHAR(100) AFTER password_reset_expires,
                    ADD COLUMN last_name VARCHAR(100) AFTER first_name,
                    ADD COLUMN full_name VARCHAR(255) AFTER last_name,
                    ADD COLUMN email VARCHAR(255) AFTER full_name,
                    ADD COLUMN phone VARCHAR(20) AFTER email,
                    ADD COLUMN department VARCHAR(100) AFTER phone,
                    ADD COLUMN position VARCHAR(100) AFTER department,
                    ADD COLUMN hire_date DATE AFTER position,
                    ADD COLUMN employee_status ENUM('active', 'inactive', 'terminated') DEFAULT 'active' AFTER hire_date
                `);
                console.log('✅ Updated user_accounts table with employee profile fields');
            } else {
                console.log('✅ user_accounts table already has extended fields');
            }
        } catch (error) {
            console.log('❌ Error updating user_accounts:', error.message);
        }

        // Check and update attendance_records table
        try {
            console.log('📅 Checking attendance_records table...');
            
            const [attendanceColumns] = await db.execute('SHOW COLUMNS FROM attendance_records');
            const hasLunchStart = attendanceColumns.some(col => col.Field === 'lunch_start');
            
            if (!hasLunchStart) {
                console.log('Adding missing columns to attendance_records...');
                await db.execute(`
                    ALTER TABLE attendance_records 
                    ADD COLUMN lunch_start DATETIME AFTER break_end_time,
                    ADD COLUMN lunch_end DATETIME AFTER lunch_start,
                    ADD COLUMN regular_hours DECIMAL(5,2) DEFAULT 0.00 AFTER hours_worked
                `);
                console.log('✅ Updated attendance_records table');
            } else {
                console.log('✅ attendance_records table already has required columns');
            }
        } catch (error) {
            console.log('❌ Error updating attendance_records:', error.message);
        }

        console.log('✅ Database schema update completed!');
        
        // Now try to insert default data
        await insertDefaultData();
        
    } catch (error) {
        console.error('❌ Schema update failed:', error);
        throw error;
    }
};

const insertDefaultData = async () => {
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
            try {
                await db.execute(`
                    INSERT IGNORE INTO system_settings (category, setting_key, setting_value, data_type, description)
                    VALUES (?, ?, ?, ?, ?)
                `, [category, key, value, type, description]);
            } catch (error) {
                console.log(`Skipping setting ${category}.${key}: ${error.message}`);
            }
        }

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
            try {
                await db.execute(`
                    INSERT IGNORE INTO departments (department_code, department_name, description)
                    VALUES (?, ?, ?)
                `, [code, name, description]);
            } catch (error) {
                console.log(`Skipping department ${code}: ${error.message}`);
            }
        }

        console.log('✅ Default data insertion completed');
    } catch (error) {
        console.error('❌ Error inserting default data:', error);
    }
};

// Main execution
const runUpdate = async () => {
    try {
        await updateExistingTables();
        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
};

// Run update if called directly
if (require.main === module) {
    runUpdate();
}

module.exports = { updateExistingTables };
