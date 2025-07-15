/**
 * Reset Password for Existing Users
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function resetPasswords() {
    let connection;
    
    try {
        console.log('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Show existing users
        const [existingUsers] = await connection.execute('SELECT id, username, role, employee_code, full_name FROM employees WHERE username IS NOT NULL');
        console.log('\n👤 Current users:');
        existingUsers.forEach(user => console.log(`   - ${user.username} (${user.role}) - ${user.employee_code} - ${user.full_name}`));

        // Set standard passwords for testing
        const passwordUpdates = [
            { username: 'admin', password: 'admin123' },
            { username: 'john.smith', password: 'john123' },
            { username: 'jane.doe', password: 'jane123' },
            { username: 'mike.johnson', password: 'mike123' },
            { username: 'sarah.wilson', password: 'sarah123' },
            { username: 'lisa.crane', password: 'lisa123' },
            { username: 'john.doe', password: 'johndoe123' },
            { username: 'jane.smith', password: 'janesmith123' }
        ];

        console.log('\n🔐 Updating passwords...');
        
        for (const update of passwordUpdates) {
            // Check if user exists
            const [userExists] = await connection.execute('SELECT id FROM employees WHERE username = ?', [update.username]);
            
            if (userExists.length > 0) {
                const hashedPassword = await bcrypt.hash(update.password, 12);
                await connection.execute(
                    'UPDATE employees SET password_hash = ?, updated_at = NOW() WHERE username = ?',
                    [hashedPassword, update.username]
                );
                console.log(`✅ Updated password for: ${update.username}`);
            }
        }

        console.log('\n🎉 Passwords updated successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('┌─────────────────┬─────────────────┬─────────────┬─────────────┐');
        console.log('│ Username        │ Password        │ Role        │ Code        │');
        console.log('├─────────────────┼─────────────────┼─────────────┼─────────────┤');
        console.log('│ admin           │ admin123        │ admin       │ emp_001     │');
        console.log('│ john.smith      │ john123         │ employee    │ emp_002     │');
        console.log('│ jane.doe        │ jane123         │ employee    │ emp_003     │');
        console.log('│ mike.johnson    │ mike123         │ employee    │ emp_004     │');
        console.log('│ sarah.wilson    │ sarah123        │ employee    │ emp_005     │');
        console.log('│ lisa.crane      │ lisa123         │ employee    │ emp_006     │');
        console.log('│ john.doe        │ johndoe123      │ employee    │ EMP001      │');
        console.log('│ jane.smith      │ janesmith123    │ employee    │ EMP002      │');
        console.log('└─────────────────┴─────────────────┴─────────────┴─────────────┘');
        console.log('\n🌐 Login URL: http://localhost:3000/login.html');
        console.log('\n💡 Try logging in with admin/admin123 for full access!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetPasswords();
