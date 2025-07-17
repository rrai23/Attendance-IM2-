/**
 * Test delete functionality
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bricks_attendance',
    port: 3306
};

async function testDeleteEmployee() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Connected to database');

        // First, create a test employee to delete
        const [result] = await connection.execute(`
            INSERT INTO employees (
                employee_id, first_name, last_name, email, 
                department, position, status, hire_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'TEST_DELETE_001',
            'Test',
            'Employee',
            'test.delete@example.com',
            'IT',
            'Test Position',
            'active',
            new Date().toISOString().split('T')[0]
        ]);

        const testEmployeeId = result.insertId;
        console.log(`✅ Created test employee with ID: ${testEmployeeId}`);

        // Verify the employee exists
        const [beforeDelete] = await connection.execute(
            'SELECT id, employee_id, first_name, last_name FROM employees WHERE id = ?',
            [testEmployeeId]
        );

        if (beforeDelete.length > 0) {
            console.log('📋 Test employee before delete:', beforeDelete[0]);
        }

        // Now test the delete operation (simulating backend API)
        const [deleteResult] = await connection.execute(
            'DELETE FROM employees WHERE id = ?',
            [testEmployeeId]
        );

        console.log(`🗑️ Delete result - affected rows: ${deleteResult.affectedRows}`);

        // Verify the employee was deleted
        const [afterDelete] = await connection.execute(
            'SELECT id, employee_id, first_name, last_name FROM employees WHERE id = ?',
            [testEmployeeId]
        );

        if (afterDelete.length === 0) {
            console.log('✅ Employee successfully deleted');
        } else {
            console.log('❌ Employee still exists after delete');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testDeleteEmployee();
