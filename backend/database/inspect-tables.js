const db = require('./connection');

const inspectTableColumns = async () => {
    try {
        console.log('🔍 Inspecting current database table structures...');
        
        // Get all table names
        const [tables] = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'bricks_attendance'
        `);
        
        console.log('Tables found:', tables);
        
        if (!tables || tables.length === 0) {
            console.log('No tables found in database');
            return;
        }
        
        for (const table of tables) {
            const tableName = table.table_name || table.TABLE_NAME;
            console.log(`\n📋 Table: ${tableName}`);
            
            try {
                const [columns] = await db.execute(`
                    SELECT column_name, data_type, is_nullable, column_default, column_key
                    FROM information_schema.columns 
                    WHERE table_schema = 'bricks_attendance' 
                    AND table_name = ?
                    ORDER BY ordinal_position
                `, [tableName]);
                
                if (columns && columns.length > 0) {
                    columns.forEach(col => {
                        const name = col.column_name || col.COLUMN_NAME;
                        const type = col.data_type || col.DATA_TYPE;
                        const nullable = col.is_nullable || col.IS_NULLABLE;
                        const defaultVal = col.column_default || col.COLUMN_DEFAULT;
                        const key = col.column_key || col.COLUMN_KEY;
                        
                        console.log(`  - ${name} (${type}) ${key ? '[' + key + ']' : ''} ${nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${defaultVal ? 'DEFAULT: ' + defaultVal : ''}`);
                    });
                } else {
                    console.log(`  No columns found for table ${tableName}`);
                }
            } catch (error) {
                console.log(`  Error getting columns for ${tableName}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error inspecting tables:', error);
    }
};

// Run inspection
inspectTableColumns().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Inspection failed:', error);
    process.exit(1);
});
