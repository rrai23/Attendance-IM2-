const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance'
};

async function cleanupEmployeesTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Check which auth-related columns exist in employees table
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM employees
        `);

        const authColumns = ['username', 'password_hash', 'role'];
        const existingAuthColumns = columns
            .map(col => col.Field)
            .filter(field => authColumns.includes(field));

        if (existingAuthColumns.length === 0) {
            console.log('ℹ️ No authentication columns found in employees table. Already clean!');
            return;
        }

        console.log(`📋 Found authentication columns in employees table: ${existingAuthColumns.join(', ')}`);
        console.log('🧹 Removing authentication columns from employees table...');

        // Drop auth-related columns
        for (const column of existingAuthColumns) {
            try {
                await connection.execute(`ALTER TABLE employees DROP COLUMN ${column}`);
                console.log(`✅ Dropped column: ${column}`);
            } catch (error) {
                console.error(`❌ Error dropping column ${column}:`, error.message);
            }
        }

        // Verify the cleanup
        const [newColumns] = await connection.execute(`
            SHOW COLUMNS FROM employees
        `);

        const remainingAuthColumns = newColumns
            .map(col => col.Field)
            .filter(field => authColumns.includes(field));

        if (remainingAuthColumns.length === 0) {
            console.log('✅ All authentication columns successfully removed from employees table');
        } else {
            console.log(`⚠️ Some authentication columns still remain: ${remainingAuthColumns.join(', ')}`);
        }

        console.log('\n📊 Current employees table structure:');
        newColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        console.log('\n🎉 Employees table cleanup completed!');

    } catch (error) {
        console.error('❌ Cleanup error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if called directly
if (require.main === module) {
    cleanupEmployeesTable()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupEmployeesTable };
