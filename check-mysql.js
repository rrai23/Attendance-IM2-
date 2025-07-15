const mysql = require('mysql2/promise');

async function checkMySQLConnection() {
    try {
        console.log('🔍 Checking MySQL connection...');
        
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'bricks_attendance'
        });
        
        await connection.execute('SELECT 1');
        console.log('✅ MySQL connection successful!');
        await connection.end();
        
        return true;
    } catch (error) {
        console.log('❌ MySQL connection failed:', error.code);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('💡 MySQL server is not running. Please:');
            console.log('   1. Open XAMPP Control Panel');
            console.log('   2. Start the MySQL service');
            console.log('   3. Wait for it to show "Running" status');
            console.log('   4. Then restart the Node.js server');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 Database "bricks_attendance" does not exist');
        }
        
        return false;
    }
}

async function main() {
    const isConnected = await checkMySQLConnection();
    
    if (isConnected) {
        console.log('🚀 Ready to start the server!');
    } else {
        console.log('⚠️ Fix MySQL connection first, then try again');
    }
    
    process.exit(0);
}

main();
