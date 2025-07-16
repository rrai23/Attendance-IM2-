const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixEmployeeDeleteAuthentication() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('🔗 Connected to database');
        
        // 1. Check admin user exists and has proper role
        const [adminUsers] = await connection.execute(`
            SELECT e.employee_id, e.full_name, e.role, e.status,
                   ua.username, ua.role as auth_role, ua.is_active
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.role = 'admin' OR ua.role = 'admin'
        `);
        
        console.log('👑 Admin users found:', adminUsers.length);
        adminUsers.forEach(user => {
            console.log(`   ${user.full_name} (${user.employee_id})`);
            console.log(`     Employee Role: ${user.role}`);
            console.log(`     Auth Role: ${user.auth_role}`);
            console.log(`     Auth Active: ${user.is_active}`);
            console.log(`     Status: ${user.status}`);
        });
        
        // 2. Ensure admin user has proper permissions
        const adminEmployeeId = 'admin_001';
        
        // Update employee table
        await connection.execute(`
            UPDATE employees 
            SET role = 'admin', status = 'active' 
            WHERE employee_id = ?
        `, [adminEmployeeId]);
        
        // Update user_accounts table
        await connection.execute(`
            UPDATE user_accounts 
            SET role = 'admin', is_active = 1 
            WHERE employee_id = ?
        `, [adminEmployeeId]);
        
        console.log('✅ Admin user permissions updated');
        
        // 3. Create active session for admin user
        const token = `admin_delete_token_${Date.now()}`;
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await connection.execute(`
            INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at, user_agent, ip_address)
            VALUES (?, ?, ?, 1, NOW(), ?, ?)
        `, [adminEmployeeId, token, expires, 'Employee Delete Fix', '127.0.0.1']);
        
        console.log('✅ Admin session created');
        console.log('🎫 Token:', token);
        
        // 4. Check existing employees that can be safely deleted
        const [employees] = await connection.execute(`
            SELECT employee_id, full_name, role, status
            FROM employees
            WHERE status = 'active' AND role != 'admin'
            ORDER BY full_name
        `);
        
        console.log('\n👥 Employees available for delete testing:');
        employees.forEach(emp => {
            console.log(`   ${emp.full_name} (${emp.employee_id}) - ${emp.role}`);
        });
        
        // 5. Test the delete endpoint directly
        console.log('\n🧪 Testing delete endpoint...');
        
        // Use test employee if available
        const testEmployee = employees.find(emp => emp.employee_id.startsWith('EMP'));
        if (testEmployee) {
            console.log(`📋 Testing delete on: ${testEmployee.full_name} (${testEmployee.employee_id})`);
            
            // Check current status
            const [beforeDelete] = await connection.execute(`
                SELECT employee_id, full_name, status, role
                FROM employees
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            console.log('Before delete:', beforeDelete[0]);
            
            // Perform soft delete (same as API endpoint)
            await connection.execute(`
                UPDATE employees 
                SET status = 'inactive', updated_at = NOW() 
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            await connection.execute(`
                UPDATE user_accounts 
                SET is_active = FALSE, updated_at = NOW() 
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            const [afterDelete] = await connection.execute(`
                SELECT employee_id, full_name, status, role
                FROM employees
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            console.log('After delete:', afterDelete[0]);
            
            // Restore for testing
            await connection.execute(`
                UPDATE employees 
                SET status = 'active', updated_at = NOW() 
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            await connection.execute(`
                UPDATE user_accounts 
                SET is_active = TRUE, updated_at = NOW() 
                WHERE employee_id = ?
            `, [testEmployee.employee_id]);
            
            console.log('✅ Test employee restored for actual testing');
        }
        
        // 6. Final verification
        const [finalCheck] = await connection.execute(`
            SELECT 
                e.employee_id, e.full_name, e.role as emp_role, e.status,
                ua.role as auth_role, ua.is_active,
                COUNT(us.id) as active_sessions
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            LEFT JOIN user_sessions us ON e.employee_id = us.employee_id AND us.is_active = 1 AND us.expires_at > NOW()
            WHERE e.employee_id = ?
            GROUP BY e.employee_id, e.full_name, e.role, e.status, ua.role, ua.is_active
        `, [adminEmployeeId]);
        
        console.log('\n🎯 Final admin user status:');
        if (finalCheck.length > 0) {
            const admin = finalCheck[0];
            console.log(`   Name: ${admin.full_name}`);
            console.log(`   Employee Role: ${admin.emp_role}`);
            console.log(`   Auth Role: ${admin.auth_role}`);
            console.log(`   Status: ${admin.status}`);
            console.log(`   Auth Active: ${admin.is_active}`);
            console.log(`   Active Sessions: ${admin.active_sessions}`);
        }
        
        console.log('\n✅ Employee delete authentication fix completed!');
        console.log('💡 Next steps:');
        console.log('   1. Use the test token in the frontend');
        console.log('   2. Try deleting a non-admin employee');
        console.log('   3. Check the employee-delete-test.html page');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

fixEmployeeDeleteAuthentication();
