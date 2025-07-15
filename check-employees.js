/**
 * Check employees table structure
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function checkEmployeesTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // Describe employees table
        const [columns] = await connection.execute('DESCRIBE employees');
        console.log('\n📋 Employees table structure:');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Check if user_accounts table exists
        const [userTableExists] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance' 
            AND table_name = 'user_accounts'
        `);

        if (userTableExists[0].count > 0) {
            console.log('\n📋 User accounts table structure:');
            const [userColumns] = await connection.execute('DESCRIBE user_accounts');
            userColumns.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
            });
        } else {
            console.log('\n⚠️ User accounts table does not exist');
        }

        // Check if any users exist
        try {
            const [users] = await connection.execute('SELECT username, role FROM user_accounts LIMIT 5');
            console.log('\n👤 Existing users:');
            users.forEach(user => console.log(`   - ${user.username} (${user.role})`));
        } catch (error) {
            console.log('\n⚠️ Cannot check users - table may not exist');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkEmployeesTable();
