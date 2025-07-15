const mysql = require('mysql2/promise');

async function testBackendData() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        // Test the same query that the backend uses
        const [rows] = await db.execute(`
            SELECT 
                id,
                employee_id as employeeId,
                employee_id as employeeCode,
                username as name,
                username as fullName,
                username as firstName,
                username as lastName,
                username as email,
                role as department,
                role as position,
                created_at as dateHired,
                created_at as hireDate,
                CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END as status,
                created_at as createdAt,
                updated_at as updatedAt
            FROM user_accounts
            WHERE is_active = 1
            ORDER BY username
            LIMIT 3
        `);

        console.log('Backend query result:');
        rows.forEach((row, index) => {
            console.log(`Employee ${index + 1}:`, {
                id: row.id,
                name: row.name,
                status: row.status,
                statusType: typeof row.status
            });
        });

        await db.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testBackendData();
