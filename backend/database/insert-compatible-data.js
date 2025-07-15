const mysql = require('mysql2/promise');

const insertCompatibleData = async () => {
    try {
        console.log('🔧 Inserting data compatible with existing table structure...');
        
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });
        
        console.log('✅ Connected to database');
        
        // Insert into system_settings with existing structure
        console.log('📋 Inserting system settings...');
        
        const systemSettings = [
            ['company_name', 'Bricks Attendance System', 'Company name'],
            ['company_timezone', 'Asia/Manila', 'System timezone'],
            ['standard_work_hours', '8', 'Standard work hours per day'],
            ['late_threshold_minutes', '15', 'Late threshold in minutes'],
            ['overtime_threshold_hours', '8.5', 'Overtime threshold in hours'],
            ['sss_contribution_rate', '0.045', 'SSS contribution rate'],
            ['philhealth_rate', '0.025', 'PhilHealth contribution rate'],
            ['pagibig_rate', '0.02', 'Pag-IBIG contribution rate'],
            ['auto_logout_minutes', '30', 'Auto logout time in minutes'],
            ['backup_enabled', 'true', 'Enable automatic backups']
        ];

        for (const [key, value, description] of systemSettings) {
            try {
                await connection.execute(`
                    INSERT INTO system_settings (setting_key, setting_value, description)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value),
                    description = VALUES(description)
                `, [key, value, description]);
                console.log(`  ✅ Added setting: ${key}`);
            } catch (error) {
                console.log(`  ❌ Error adding setting ${key}: ${error.message}`);
            }
        }

        // Insert into departments with existing structure (name column instead of department_code/department_name)
        console.log('\n🏢 Inserting departments...');
        
        const departments = [
            ['Administration', 'Administrative and management functions'],
            ['Human Resources', 'Employee relations and recruitment'],
            ['Information Technology', 'Technical support and development'],
            ['Finance', 'Financial operations and accounting'],
            ['Operations', 'Daily business operations'],
            ['Sales', 'Sales and customer relations'],
            ['Marketing', 'Marketing and promotions']
        ];

        for (const [name, description] of departments) {
            try {
                await connection.execute(`
                    INSERT INTO departments (name, description)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE 
                    description = VALUES(description)
                `, [name, description]);
                console.log(`  ✅ Added department: ${name}`);
            } catch (error) {
                console.log(`  ❌ Error adding department ${name}: ${error.message}`);
            }
        }

        // Create an admin user if it doesn't exist
        console.log('\n👤 Creating admin user...');
        try {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await connection.execute(`
                INSERT INTO user_accounts (employee_id, username, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                password_hash = VALUES(password_hash),
                is_active = VALUES(is_active)
            `, ['EMP001', 'admin', hashedPassword, 'admin', 1]);
            console.log('  ✅ Created admin user (username: admin, password: admin123)');
        } catch (error) {
            console.log(`  ❌ Error creating admin user: ${error.message}`);
        }

        await connection.end();
        console.log('\n✅ Data insertion completed successfully!');
        
    } catch (error) {
        console.error('❌ Data insertion failed:', error);
    }
};

insertCompatibleData().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Failed:', error);
    process.exit(1);
});
