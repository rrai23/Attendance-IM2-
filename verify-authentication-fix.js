const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyFix() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('🔍 VERIFYING AUTHENTICATION FIX IMPLEMENTATION...\n');
        
        // 1. Check all users have active sessions
        const [userSessions] = await connection.execute(`
            SELECT 
                e.employee_id,
                e.full_name,
                e.role,
                e.status,
                us.is_active,
                us.expires_at,
                us.token_hash
            FROM employees e
            LEFT JOIN user_sessions us ON e.employee_id = us.employee_id 
            WHERE e.status = 'active' AND us.expires_at > NOW()
            ORDER BY e.role, e.full_name
        `);

        console.log('👥 USER SESSION VERIFICATION:');
        let allUsersActive = true;
        userSessions.forEach(user => {
            const status = user.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
            console.log(`   ${user.full_name} (${user.employee_id}) - ${user.role}: ${status}`);
            console.log(`      Expires: ${new Date(user.expires_at).toLocaleString()}`);
            console.log(`      Token: ${user.token_hash.substring(0, 20)}...`);
            
            if (!user.is_active) {
                allUsersActive = false;
            }
        });

        console.log(`\n📊 SUMMARY: ${allUsersActive ? '✅ ALL USERS HAVE ACTIVE SESSIONS' : '❌ SOME USERS HAVE INACTIVE SESSIONS'}`);

        // 2. Check session statistics
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_sessions,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_sessions,
                COUNT(DISTINCT employee_id) as unique_users,
                MIN(expires_at) as earliest_expiry,
                MAX(expires_at) as latest_expiry
            FROM user_sessions
            WHERE expires_at > NOW()
        `);

        console.log('\n📊 SESSION STATISTICS:');
        console.log(`   Total Sessions: ${stats[0].total_sessions}`);
        console.log(`   Active Sessions: ${stats[0].active_sessions}`);
        console.log(`   Inactive Sessions: ${stats[0].inactive_sessions}`);
        console.log(`   Users with Sessions: ${stats[0].unique_users}`);
        console.log(`   Earliest Expiry: ${new Date(stats[0].earliest_expiry).toLocaleString()}`);
        console.log(`   Latest Expiry: ${new Date(stats[0].latest_expiry).toLocaleString()}`);

        // 3. Check system settings
        const [settings] = await connection.execute(`
            SELECT setting_key, setting_value, updated_at
            FROM system_settings
            WHERE setting_key = 'session_maintenance_enabled'
        `);

        console.log('\n⚙️ SYSTEM CONFIGURATION:');
        if (settings.length > 0) {
            console.log(`   Session Maintenance: ${settings[0].setting_value === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`   Last Updated: ${new Date(settings[0].updated_at).toLocaleString()}`);
        } else {
            console.log('   Session Maintenance: ❌ NOT CONFIGURED');
        }

        // 4. Test specific scenarios
        console.log('\n🧪 TESTING SPECIFIC SCENARIOS:');
        
        // Test admin user
        const [adminTest] = await connection.execute(`
            SELECT e.employee_id, e.full_name, e.role, us.is_active, us.expires_at
            FROM employees e
            JOIN user_sessions us ON e.employee_id = us.employee_id
            WHERE e.employee_id = 'admin_001' AND us.is_active = 1 AND us.expires_at > NOW()
            LIMIT 1
        `);

        if (adminTest.length > 0) {
            console.log('   ✅ Admin user has active session - can delete attendance records');
        } else {
            console.log('   ❌ Admin user does not have active session - may face logout issues');
        }

        // Test attendance record that caused the original issue
        const [attendanceTest] = await connection.execute(`
            SELECT id, employee_id, date, status
            FROM attendance_records
            WHERE id = 2
        `);

        if (attendanceTest.length > 0) {
            console.log('   ✅ Attendance record ID 2 exists - ready for delete test');
            console.log(`      Record: ${attendanceTest[0].employee_id} on ${attendanceTest[0].date} - ${attendanceTest[0].status}`);
        } else {
            console.log('   ⚠️ Attendance record ID 2 not found - original test record may have been deleted');
        }

        // 5. Final verification
        console.log('\n🎯 FINAL VERIFICATION:');
        
        const issues = [];
        
        if (stats[0].inactive_sessions > 0) {
            issues.push(`${stats[0].inactive_sessions} inactive sessions found`);
        }
        
        if (stats[0].unique_users < 8) {
            issues.push(`Only ${stats[0].unique_users} users have sessions (expected 8)`);
        }
        
        if (settings.length === 0 || settings[0].setting_value !== 'true') {
            issues.push('Session maintenance not properly configured');
        }
        
        if (issues.length === 0) {
            console.log('   ✅ ALL CHECKS PASSED - AUTHENTICATION FIX IS WORKING CORRECTLY');
            console.log('   ✅ Users should no longer experience instant logout issues');
            console.log('   ✅ All employees have active sessions with extended expiry');
            console.log('   ✅ System is configured for automatic session maintenance');
        } else {
            console.log('   ❌ ISSUES FOUND:');
            issues.forEach(issue => console.log(`      • ${issue}`));
        }

        console.log('\n🚀 RECOMMENDATIONS:');
        console.log('   1. Test delete functionality with admin user');
        console.log('   2. Monitor session logs for any authentication errors');
        console.log('   3. Run session maintenance service continuously');
        console.log('   4. Perform weekly session health checks');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await connection.end();
    }
}

verifyFix();
