const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeProductionDatabase() {
    console.log('🔧 Initializing production database...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 's24100604_bricksdb',
        password: process.env.DB_PASSWORD || 'bricksdatabase',
        database: process.env.DB_NAME || 's24100604_bricksdb',
        multipleStatements: true
    });

    try {
        // Test connection
        await connection.execute('SELECT 1');
        console.log('✅ Database connection successful');

        // Check if tables exist
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Found ${tables.length} existing tables`);

        if (tables.length === 0) {
            console.log('📦 No tables found, creating database schema...');
            
            // Read and execute schema from your existing SQL files
            const fs = require('fs');
            const path = require('path');
            
            // You might want to run your database creation script here
            console.log('⚠️  Please run your database setup script manually:');
            console.log('   node setup-database.js');
            console.log('   or import your SQL schema file');
        } else {
            console.log('✅ Database tables already exist');
        }

        // Create admin user if not exists
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM employees WHERE role = "admin"');
        if (users[0].count === 0) {
            console.log('👤 Creating default admin user...');
            
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await connection.execute(`
                INSERT INTO employees (
                    employee_id, first_name, last_name, email, 
                    username, password, role, status, created_at
                ) VALUES (
                    'ADMIN001', 'System', 'Administrator', 'admin@company.com',
                    'admin', ?, 'admin', 'active', NOW()
                )
            `, [hashedPassword]);
            
            console.log('✅ Admin user created (username: admin, password: admin123)');
        }

        console.log('\n🎉 Production database initialization complete!');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    initializeProductionDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        });
}

module.exports = initializeProductionDatabase;
