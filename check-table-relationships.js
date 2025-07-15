const db = require('./backend/database/connection');

async function checkTableRelationships() {
    try {
        console.log('🔍 Checking table relationships...');
        
        // Check user_accounts structure
        console.log('\n📊 user_accounts table structure:');
        console.log('=====================================');
        const userAccountsSchema = await db.execute("DESCRIBE user_accounts");
        const userAccountsFields = Array.isArray(userAccountsSchema[0]) ? userAccountsSchema[0] : userAccountsSchema;
        userAccountsFields.forEach(row => {
            console.log(`${row.Field} | ${row.Type} | ${row.Null} | ${row.Key} | ${row.Default}`);
        });
        
        // Check sample data from user_accounts
        console.log('\n📝 Sample user_accounts data:');
        console.log('===============================');
        const userAccountsData = await db.execute("SELECT * FROM user_accounts LIMIT 3");
        const userAccounts = Array.isArray(userAccountsData[0]) ? userAccountsData[0] : userAccountsData;
        userAccounts.forEach(ua => {
            console.log(`Username: ${ua.username}, Employee_ID: ${ua.employee_id}`);
        });
        
        // Check employees structure (relevant fields)
        console.log('\n📊 employees table key fields:');
        console.log('================================');
        const employeesData = await db.execute("SELECT employee_code, id, first_name, last_name FROM employees LIMIT 3");
        const employees = Array.isArray(employeesData[0]) ? employeesData[0] : employeesData;
        employees.forEach(emp => {
            console.log(`ID: ${emp.id}, Employee_Code: ${emp.employee_code}, Name: ${emp.first_name} ${emp.last_name}`);
        });
        
        console.log('\n🎉 Table relationship check complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking table relationships:', error);
        process.exit(1);
    }
}

checkTableRelationships();
