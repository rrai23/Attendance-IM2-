const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance'
};

async function migrateEmployeeAuthData() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Check if employees table has auth fields
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM employees LIKE 'username'
        `);

        if (columns.length === 0) {
            console.log('ℹ️ No username column found in employees table. Creating default accounts...');
            
            // Create default admin account
            const adminPasswordHash = await bcrypt.hash('admin123', 12);
            await connection.execute(`
                INSERT IGNORE INTO user_accounts (employee_id, username, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, ['EMP001', 'admin', adminPasswordHash, 'admin', true]);
            
            console.log('✅ Created default admin account (admin/admin123)');
            return;
        }

        // Get employees with auth data
        const [employees] = await connection.execute(`
            SELECT employee_code, username, password_hash, role, status 
            FROM employees 
            WHERE username IS NOT NULL AND username != ''
        `);

        console.log(`📋 Found ${employees.length} employees with auth data to migrate`);

        for (const employee of employees) {
            try {
                // Check if account already exists
                const [existing] = await connection.execute(
                    'SELECT id FROM user_accounts WHERE employee_id = ?',
                    [employee.employee_code]
                );

                if (existing.length > 0) {
                    console.log(`⏭️  Skipping ${employee.username} - account already exists`);
                    continue;
                }

                // Insert into user_accounts
                await connection.execute(`
                    INSERT INTO user_accounts (employee_id, username, password_hash, role, is_active)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    employee.employee_code,
                    employee.username,
                    employee.password_hash || await bcrypt.hash('password123', 12), // Default password if none
                    employee.role || 'employee',
                    employee.status === 'active'
                ]);

                console.log(`✅ Migrated ${employee.username} (${employee.employee_code})`);

            } catch (error) {
                console.error(`❌ Error migrating ${employee.username}:`, error.message);
            }
        }

        // Create additional test accounts if none exist
        const [accountCount] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
        
        if (accountCount[0].count === 0) {
            console.log('📝 Creating default test accounts...');
            
            const testAccounts = [
                { employee_id: 'EMP001', username: 'admin', password: 'admin123', role: 'admin' },
                { employee_id: 'EMP002', username: 'john.smith', password: 'john123', role: 'employee' },
                { employee_id: 'EMP003', username: 'jane.doe', password: 'jane123', role: 'manager' }
            ];

            for (const account of testAccounts) {
                const passwordHash = await bcrypt.hash(account.password, 12);
                
                try {
                    await connection.execute(`
                        INSERT IGNORE INTO user_accounts (employee_id, username, password_hash, role, is_active)
                        VALUES (?, ?, ?, ?, ?)
                    `, [account.employee_id, account.username, passwordHash, account.role, true]);
                    
                    console.log(`✅ Created test account: ${account.username}/${account.password} (${account.role})`);
                } catch (error) {
                    console.error(`❌ Error creating ${account.username}:`, error.message);
                }
            }
        }

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if called directly
if (require.main === module) {
    migrateEmployeeAuthData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateEmployeeAuthData };
