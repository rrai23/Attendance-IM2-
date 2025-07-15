const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('🔍 Testing MySQL Connection...');
    console.log('');
    
    // Display current configuration
    console.log('📋 Current Configuration:');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || '3306'}`);
    console.log(`   User: ${process.env.DB_USER || 'root'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'bricks_attendance'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'empty (XAMPP default)'}`);
    console.log('');

    // Check if this looks like XAMPP configuration
    const isXAMPP = (process.env.DB_HOST === 'localhost' || !process.env.DB_HOST) && 
                    (process.env.DB_USER === 'root' || !process.env.DB_USER) && 
                    (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === '');
    
    if (isXAMPP) {
        console.log('🔧 Detected XAMPP configuration');
        console.log('   Make sure XAMPP Control Panel shows MySQL as "Running"');
        console.log('');
    }

    try {
        // Test 1: Connect without database (to create it if needed)
        console.log('🔧 Step 1: Testing basic connection...');
        const tempConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            timeout: 10000
        };

        const tempConnection = await mysql.createConnection(tempConfig);
        console.log('✅ Basic connection successful!');
        
        // Test 2: Check MySQL version
        console.log('🔧 Step 2: Checking MySQL version...');
        const [versionRows] = await tempConnection.execute('SELECT VERSION() as version');
        console.log(`✅ MySQL Version: ${versionRows[0].version}`);
        
        // Test 3: Create database if it doesn't exist
        console.log('🔧 Step 3: Creating database if not exists...');
        const dbName = process.env.DB_NAME || 'bricks_attendance';
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${dbName}' ready!`);
        
        // Test 4: Connect to the specific database
        console.log('🔧 Step 4: Testing connection to target database...');
        await tempConnection.end();
        
        const fullConfig = {
            ...tempConfig,
            database: dbName
        };
        
        const dbConnection = await mysql.createConnection(fullConfig);
        console.log('✅ Database connection successful!');
        
        // Test 5: Test basic query
        console.log('🔧 Step 5: Testing basic query...');
        const [tables] = await dbConnection.execute('SHOW TABLES');
        console.log(`✅ Query successful! Found ${tables.length} existing tables.`);
        
        await dbConnection.end();
        
        console.log('');
        console.log('🎉 All connection tests passed!');
        console.log('✅ Your MySQL setup is working correctly.');
        console.log('');
        console.log('You can now run: npm run migrate');
        
    } catch (error) {
        console.log('');
        console.log('❌ Connection test failed!');
        console.log('');
        console.log('Error details:', error.message);
        console.log('Error code:', error.code);
        console.log('');
        
        // Provide specific troubleshooting based on error type
        if (error.code === 'ECONNREFUSED') {
            console.log('🔧 TROUBLESHOOTING - Connection Refused:');
            console.log('   For XAMPP users:');
            console.log('   1. Open XAMPP Control Panel');
            console.log('   2. Start MySQL service (click "Start" button)');
            console.log('   3. MySQL should show green "Running" status');
            console.log('   4. If port 3306 is busy, restart XAMPP as Administrator');
            console.log('');
            console.log('   For other MySQL installations:');
            console.log('   1. Start MySQL service: net start mysql80');
            console.log('   2. Check if MySQL is listening: netstat -an | findstr 3306');
            console.log('   3. Verify firewall settings');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('🔧 TROUBLESHOOTING - Access Denied:');
            console.log('   For XAMPP (default setup):');
            console.log('   - Username: root');
            console.log('   - Password: (leave empty)');
            console.log('   - Host: localhost');
            console.log('   - Port: 3306');
            console.log('');
            console.log('   If you changed XAMPP MySQL password:');
            console.log('   - Update DB_PASSWORD in .env file');
            console.log('   - Or reset password in phpMyAdmin');
        } else if (error.code === 'ENOTFOUND') {
            console.log('🔧 TROUBLESHOOTING - Host Not Found:');
            console.log('   1. Check DB_HOST in .env file (should be localhost for XAMPP)');
            console.log('   2. Ensure XAMPP MySQL is running locally');
            console.log('   3. Check network connectivity if using remote host');
        } else {
            console.log('🔧 TROUBLESHOOTING - General:');
            console.log('   1. Verify XAMPP MySQL service is running');
            console.log('   2. Check .env file exists and has correct values');
            console.log('   3. Try accessing phpMyAdmin: http://localhost/phpmyadmin');
            console.log('   4. Check Windows Firewall settings');
            console.log('   5. Restart XAMPP as Administrator if needed');
        }
        
        console.log('');
        console.log('💡 Alternative: Run in local mode (no backend)');
        console.log('   Just open dashboard.html directly in your browser');
        console.log('   The system will work with localStorage only');
        
        process.exit(1);
    }
}

// Run the test
testConnection().catch(console.error);
