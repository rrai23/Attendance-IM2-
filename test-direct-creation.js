/**
 * Test employee creation directly via database
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function testEmployeeCreationDirect() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // Test data that matches the schema exactly
        const employeeData = {
            employee_id: 'TEST_SCHEMA_001',
            username: 'test.schema.001',
            password: 'password123',
            role: 'employee',
            full_name: 'Test Schema Employee',
            first_name: 'Test',
            last_name: 'Schema',
            email: 'test.schema@example.com',
            phone: '123-456-7890',
            department: 'IT',
            position: 'Developer',
            hire_date: '2025-01-15',
            status: 'active',
            wage: 25.00,
            salary_type: 'hourly'
        };

        // Insert using exact schema fields
        const [result] = await connection.execute(`
            INSERT INTO employees (
                employee_id, username, password, role, full_name, 
                first_name, last_name, email, phone, department, 
                position, hire_date, status, wage, salary_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            employeeData.employee_id,
            employeeData.username,
            employeeData.password,
            employeeData.role,
            employeeData.full_name,
            employeeData.first_name,
            employeeData.last_name,
            employeeData.email,
            employeeData.phone,
            employeeData.department,
            employeeData.position,
            employeeData.hire_date,
            employeeData.status,
            employeeData.wage,
            employeeData.salary_type
        ]);

        console.log('✅ Employee created successfully with ID:', result.insertId);

        // Verify the insertion
        const [employees] = await connection.execute(
            'SELECT id, employee_id, full_name, email, department, wage FROM employees WHERE id = ?',
            [result.insertId]
        );

        if (employees.length > 0) {
            console.log('📋 Created employee:', employees[0]);
        }

        // Clean up - delete the test employee
        await connection.execute('DELETE FROM employees WHERE id = ?', [result.insertId]);
        console.log('🧹 Test employee cleaned up');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testEmployeeCreationDirect();
