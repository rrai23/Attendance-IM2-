/**
 * Test creating employee directly in database to isolate the issue
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function testDirectDBInsert() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // Use a pre-hashed password (this is 'password123' hashed with bcrypt)
        const hashedPassword = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewNdGNOqOyXM'; // password123

        // Test direct insert with minimal required data
        const [result] = await connection.execute(`
            INSERT INTO employees (
                employee_id, username, password, role, full_name,
                first_name, last_name, email, phone, department, position,
                hire_date, status, wage, overtime_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'TEST_DIRECT_002',
            'test.direct.002',
            hashedPassword,
            'employee',
            'Test Direct Employee',
            'Test',
            'Direct',
            'test.direct.002@example.com',
            '1234567890',
            'IT',
            'Developer',
            '2025-01-15',
            'active',
            25.00,
            1.5
        ]);

        console.log('✅ Employee created successfully!');
        console.log('New employee ID:', result.insertId);

        // Verify the employee was created
        const [created] = await connection.execute(
            'SELECT id, employee_id, full_name, email FROM employees WHERE id = ?',
            [result.insertId]
        );

        if (created.length > 0) {
            console.log('✅ Verified employee in database:', created[0]);
        }

    } catch (error) {
        console.error('❌ Database insert error:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL State:', error.sqlState);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testDirectDBInsert();
