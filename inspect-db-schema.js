const db = require('./backend/database/connection');

const getCurrentSchema = async () => {
    try {
        console.log('🔍 Getting current database schema...\n');

        // Check employees table structure
        console.log('👥 EMPLOYEES TABLE:');
        const [employeeColumns] = await db.execute('SHOW COLUMNS FROM employees');
        console.table(employeeColumns);

        // Check user_accounts table structure  
        console.log('\n🔐 USER_ACCOUNTS TABLE:');
        const [userColumns] = await db.execute('SHOW COLUMNS FROM user_accounts');
        console.table(userColumns);

        // Check attendance_records table structure
        console.log('\n📅 ATTENDANCE_RECORDS TABLE:');
        const [attendanceColumns] = await db.execute('SHOW COLUMNS FROM attendance_records');
        console.table(attendanceColumns);

        // Check user_sessions table structure
        console.log('\n🔑 USER_SESSIONS TABLE:');
        const [sessionColumns] = await db.execute('SHOW COLUMNS FROM user_sessions');
        console.table(sessionColumns);

        // Check payroll_records table structure
        console.log('\n💰 PAYROLL_RECORDS TABLE:');
        const [payrollColumns] = await db.execute('SHOW COLUMNS FROM payroll_records');
        console.table(payrollColumns);

        // Check system_settings table structure
        console.log('\n⚙️ SYSTEM_SETTINGS TABLE:');
        const [settingsColumns] = await db.execute('SHOW COLUMNS FROM system_settings');
        console.table(settingsColumns);

        // Check other tables
        const [tables] = await db.execute('SHOW TABLES');
        console.log('\n📋 ALL TABLES:');
        console.table(tables);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
};

getCurrentSchema();
