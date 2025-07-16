const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function testAuth() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });

        console.log('✅ Connected to database');

        // Test token
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6ImFkbWluXzAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTI2NzQwNzEsImV4cCI6MTc1Mjc2MDQ3MX0.-2WOb2k7zAs4IiWe5w2akCLHD2ObOE7qSJbPMsVm36g';
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token verified:', decoded);

        // Test the exact query from auth middleware
        const result = await connection.execute(`
            SELECT 
                ua.*,
                COALESCE(e.first_name, ua.first_name) as first_name,
                COALESCE(e.last_name, ua.last_name) as last_name,
                COALESCE(e.full_name, ua.full_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                COALESCE(e.hire_date, ua.hire_date) as hire_date,
                COALESCE(e.status, ua.employee_status) as employee_status
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ? AND ua.is_active = TRUE
        `, [decoded.employee_id]);

        console.log('✅ Query result:', result[0]);

        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testAuth();
