#!/usr/bin/env node

/**
 * BRICKS ATTENDANCE SYSTEM - DATABASE CONNECTION TEST
 * 
 * This script tests the database connection and verifies the setup
 * 
 * Usage: node test-db-connection.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance'
};

console.log('🔍 TESTING DATABASE CONNECTION');
console.log('=' .repeat(50));
console.log(`Host: ${config.host}:${config.port}`);
console.log(`Database: ${config.database}`);
console.log(`User: ${config.user}`);
console.log('=' .repeat(50));

async function testConnection() {
    let connection;
    
    try {
        // Test connection
        console.log('\n🔌 Testing MySQL connection...');
        connection = await mysql.createConnection(config);
        console.log('✅ Database connection successful!');
        
        // Test database exists
        console.log('\n📊 Checking database...');
        const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [config.database]);
        if (databases.length === 0) {
            console.log(`❌ Database '${config.database}' does not exist`);
            return false;
        }
        console.log(`✅ Database '${config.database}' exists`);
        
        // Test tables exist
        console.log('\n📋 Checking tables...');
        const [tables] = await connection.execute('SHOW TABLES');
        
        const expectedTables = [
            'user_accounts',
            'employees', 
            'departments',
            'attendance_records',
            'user_sessions',
            'payroll_records',
            'system_settings',
            'audit_log',
            'overtime_requests'
        ];
        
        const existingTables = tables.map(row => Object.values(row)[0]);
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
            console.log('💡 Run: node setup-database.js');
            return false;
        }
        
        console.log(`✅ All ${expectedTables.length} tables exist`);
        
        // Test data exists
        console.log('\n👤 Checking users...');
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
        const userCount = users[0].count;
        
        if (userCount === 0) {
            console.log('❌ No users found in database');
            console.log('💡 Run: node setup-database.js');
            return false;
        }
        
        console.log(`✅ Found ${userCount} user(s)`);
        
        // Test admin user
        const [admin] = await connection.execute('SELECT username, role FROM user_accounts WHERE role = "admin" LIMIT 1');
        if (admin.length === 0) {
            console.log('❌ No admin user found');
            return false;
        }
        
        console.log(`✅ Admin user exists: ${admin[0].username}`);
        
        // Test settings
        console.log('\n⚙️  Checking system settings...');
        const [settings] = await connection.execute('SELECT COUNT(*) as count FROM system_settings');
        const settingsCount = settings[0].count;
        
        if (settingsCount === 0) {
            console.log('❌ No system settings found');
            return false;
        }
        
        console.log(`✅ Found ${settingsCount} system setting(s)`);
        
        console.log('\n🎉 DATABASE IS READY FOR USE!');
        console.log('\nNext steps:');
        console.log('1. Start server: npm start');
        console.log('2. Open browser: http://localhost:3000');
        console.log('3. Login with admin credentials');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Database connection failed:');
        console.error(error.message);
        
        console.log('\n🛠️  Troubleshooting:');
        console.log('1. Make sure XAMPP MySQL service is running');
        console.log('2. Check database credentials in .env file');
        console.log('3. Verify port 3306 is not blocked');
        console.log('4. Try running: node setup-database.js');
        
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run test
testConnection().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});
