const mysql = require('mysql2/promise');

const directCheck = async () => {
    try {
        console.log('🔍 Direct database check...');
        
        // Direct connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 's24100604_bricksdb',
            password: process.env.DB_PASSWORD || 'bricksdatabase',
            database: process.env.DB_NAME || 's24100604_bricksdb'
        });
        
        console.log('✅ Connected directly to database');
        
        // Check current database
        const [dbResult] = await connection.execute('SELECT DATABASE() as current_db');
        console.log('Current database:', dbResult[0].current_db);
        
        // Show tables
        const [tablesResult] = await connection.execute('SHOW TABLES');
        console.log('\nTables found:');
        tablesResult.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`  ${index + 1}. ${tableName}`);
        });
        
        // Check a specific table if it exists
        if (tablesResult.length > 0) {
            const firstTableName = Object.values(tablesResult[0])[0];
            console.log(`\n📋 Columns in ${firstTableName}:`);
            
            const [columnsResult] = await connection.execute(`SHOW COLUMNS FROM \`${firstTableName}\``);
            columnsResult.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Direct check failed:', error);
    }
};

directCheck().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Failed:', error);
    process.exit(1);
});
