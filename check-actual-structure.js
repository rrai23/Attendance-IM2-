const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function checkActualStructure() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Check users table structure
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
            
            // Create default admin user
            console.log('\n🔧 Creating default admin user...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await connection.execute(`
                INSERT INTO users (username, password_hash, role, is_active) 
                VALUES ('admin', ?, 'admin', TRUE)
            `, [hashedPassword]);
            
            console.log('✅ Default admin user created');
        } else {
            usersData.forEach(user => {
                console.log(`   ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Active: ${user.is_active}`);
            });
        }

        // Check employees table structure
        console.log('\n🔍 Employees table structure:');
        const [employeesColumns] = await connection.execute('DESCRIBE employees');
        employeesColumns.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkActualStructure();
