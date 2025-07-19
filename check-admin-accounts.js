const db = require('./backend/database/connection');

async function checkAdminAccounts() {
    try {
        console.log('🔍 Checking admin accounts in the database...\n');
        
        // Check user_accounts table
        const [accounts] = await db.execute(`
            SELECT 
                ua.id,
                ua.employee_id,
                ua.username,
                ua.role,
                ua.is_active,
                ua.last_login,
                e.first_name,
                e.last_name
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.role = 'admin' OR ua.username LIKE '%admin%'
            ORDER BY ua.created_at DESC
        `);
        
        console.log('Admin Accounts Found:');
        if (accounts.length > 0) {
            accounts.forEach((account, index) => {
                console.log(`${index + 1}. Username: ${account.username}`);
                console.log(`   Employee ID: ${account.employee_id}`);
                console.log(`   Role: ${account.role}`);
                console.log(`   Active: ${account.is_active ? 'Yes' : 'No'}`);
                console.log(`   Name: ${account.first_name} ${account.last_name}`);
                console.log(`   Last Login: ${account.last_login || 'Never'}`);
                console.log('---');
            });
        } else {
            console.log('❌ No admin accounts found!');
        }
        
        // Also check all accounts
        console.log('\nAll User Accounts:');
        const [allAccounts] = await db.execute(`
            SELECT 
                ua.username,
                ua.role,
                ua.is_active,
                e.first_name,
                e.last_name
            FROM user_accounts ua
            LEFT JOIN employees e ON ua.employee_id = e.employee_id
            ORDER BY ua.role, ua.username
        `);
        
        if (allAccounts.length > 0) {
            allAccounts.forEach((account, index) => {
                console.log(`${index + 1}. ${account.username} (${account.role}) - ${account.is_active ? 'Active' : 'Inactive'} - ${account.first_name} ${account.last_name}`);
            });
        } else {
            console.log('❌ No user accounts found!');
        }
        
    } catch (error) {
        console.error('❌ Error checking accounts:', error.message);
    } finally {
        process.exit(0);
    }
}

checkAdminAccounts();
