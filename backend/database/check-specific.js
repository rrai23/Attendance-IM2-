const mysql = require('mysql2/promise');

const checkSpecificTables = async () => {
    try {
        console.log('🔍 Checking specific table structures...');
        
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 's24100604_bricksdb',
            password: process.env.DB_PASSWORD || 'bricksdatabase',
            database: process.env.DB_NAME || 's24100604_bricksdb'
        });
        
        const tablesToCheck = ['system_settings', 'departments', 'user_accounts'];
        
        for (const tableName of tablesToCheck) {
            console.log(`\n📋 Table: ${tableName}`);
            
            const [columnsResult] = await connection.execute(`SHOW COLUMNS FROM \`${tableName}\``);
            columnsResult.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Check failed:', error);
    }
};

checkSpecificTables().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Failed:', error);
    process.exit(1);
});
