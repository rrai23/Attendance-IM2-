const mysql = require('mysql2/promise');

async function checkUserData() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root', 
        password: '',
        database: 'bricks_attendance'
    });

    try {
        const [result] = await db.execute(`
            SELECT 
                ua.username,
                ua.first_name as ua_first_name,
                ua.last_name as ua_last_name,
                e.first_name as e_first_name,
                e.last_name as e_last_name,
                COALESCE(e.first_name, ua.first_name) as final_first_name,
                COALESCE(e.last_name, ua.last_name) as final_last_name,
                CONCAT(COALESCE(e.first_name, ua.first_name), ' ', COALESCE(e.last_name, ua.last_name)) as full_name
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.username = 'admin' AND ua.is_active = TRUE
        `);
        
        console.log('User data for admin:');
        console.log(JSON.stringify(result[0], null, 2));
        
        // Also check one of the generated accounts
        const [result2] = await db.execute(`
            SELECT 
                ua.username,
                ua.first_name as ua_first_name,
                ua.last_name as ua_last_name,
                e.first_name as e_first_name,
                e.last_name as e_last_name,
                COALESCE(e.first_name, ua.first_name) as final_first_name,
                COALESCE(e.last_name, ua.last_name) as final_last_name,
                CONCAT(COALESCE(e.first_name, ua.first_name), ' ', COALESCE(e.last_name, ua.last_name)) as full_name
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.username = 'emp_097316' AND ua.is_active = TRUE
        `);
        
        console.log('\nUser data for emp_097316:');
        console.log(JSON.stringify(result2[0], null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

checkUserData();
