const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

async function setupProductionDatabase() {
    let connection;
    
    try {
        console.log('🔗 Connecting to production database...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to production database');

        // Check if tables exist
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name IN ('employees', 'attendance', 'users', 'system_settings')
        `, [process.env.DB_NAME]);

        if (tables[0].count < 4) {
            console.log('🔧 Setting up database tables...');
            
            // Run the setup script
            const setupScript = require('./backend/database/setup-production-tables');
            await setupScript.createTables(connection);
            
            console.log('✅ Database tables created successfully');
        } else {
            console.log('✅ Database tables already exist');
        }

        // Verify database health
        await connection.execute('SELECT 1');
        console.log('✅ Database connection verified');

        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    setupProductionDatabase();
}

module.exports = { setupProductionDatabase };
