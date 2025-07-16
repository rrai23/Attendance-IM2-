const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function checkDatabaseStructure() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Show all tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\n📋 Existing tables:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

        // Check user_accounts table structure
        console.log('\n🔍 User accounts table structure:');
        const [userAccountsColumns] = await connection.execute('DESCRIBE user_accounts');
        userAccountsColumns.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
        });

        // Check if there's any user data
        console.log('\n👥 User accounts data:');
        const [users] = await connection.execute('SELECT id, employee_id, username, role, is_active FROM user_accounts LIMIT 5');
        if (users.length === 0) {
            console.log('   (no user accounts found)');
        } else {
            users.forEach(user => {
                console.log(`   ID: ${user.id}, Employee ID: ${user.employee_id}, Username: ${user.username}, Role: ${user.role}, Active: ${user.is_active}`);
            });
        }

        // Check users table structure if it exists
        try {
            console.log('\n🔍 Users table structure:');
            const [usersColumns] = await connection.execute('DESCRIBE users');
            usersColumns.forEach(column => {
                console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
            });

            // Check if there's any user data in users table
            console.log('\n👥 Users table data:');
            const [usersData] = await connection.execute('SELECT * FROM users LIMIT 5');
            if (usersData.length === 0) {
                console.log('   (no users found)');
            } else {
                usersData.forEach(user => {
                    console.log(`   User:`, user);
                });
            }
        } catch (error) {
            console.log('   Users table not found or error:', error.message);
        }

        // Check if employees table exists
        try {
            console.log('\n🔍 Employees table structure:');
            const [employeesColumns] = await connection.execute('DESCRIBE employees');
            employeesColumns.forEach(column => {
                console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
            });
        } catch (error) {
            console.log('   Employees table not found or error:', error.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStructure();
