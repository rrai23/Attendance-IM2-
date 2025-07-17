/**
 * Check employees table constraints to understand why create is failing
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function checkEmployeesConstraints() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // Get detailed table structure including constraints
        const [columns] = await connection.execute('DESCRIBE employees');
        console.log('\n📋 Employees table structure:');
        console.log('Field                | Type                    | Null | Key | Default | Extra');
        console.log('---------------------|-------------------------|------|-----|---------|--------');
        columns.forEach(col => {
            const field = col.Field.padEnd(20);
            const type = col.Type.padEnd(23);
            const nullable = col.Null.padEnd(4);
            const key = col.Key.padEnd(3);
            const defaultVal = (col.Default || 'NULL').toString().padEnd(7);
            console.log(`${field} | ${type} | ${nullable} | ${key} | ${defaultVal} | ${col.Extra}`);
        });

        // Check for any unique constraints
        const [indexes] = await connection.execute(`
            SHOW INDEX FROM employees WHERE Non_unique = 0
        `);
        
        if (indexes.length > 0) {
            console.log('\n🔑 Unique constraints:');
            indexes.forEach(idx => {
                console.log(`   ${idx.Key_name}: ${idx.Column_name}`);
            });
        }

        // Check existing employees to see what values are already used
        const [existingEmployees] = await connection.execute(`
            SELECT employee_id, email, username 
            FROM employees 
            WHERE employee_id LIKE 'TEST_%' OR email LIKE '%test%'
        `);

        if (existingEmployees.length > 0) {
            console.log('\n⚠️ Existing test employees that might conflict:');
            existingEmployees.forEach(emp => {
                console.log(`   ID: ${emp.employee_id}, Email: ${emp.email}, Username: ${emp.username || 'NULL'}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkEmployeesConstraints();
