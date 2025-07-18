const mysql = require('mysql2/promise');

async function checkUserSessionsTable() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root', 
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('🔍 Checking user_sessions table...');
        
        // Check if table exists
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'bricks_attendance' 
            AND TABLE_NAME = 'user_sessions'
        `);
        
        if (tables.length === 0) {
            console.log('❌ user_sessions table does not exist!');
            return;
        }
        
        console.log('✅ user_sessions table exists');
        
        // Check table structure
        const [columns] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'bricks_attendance' 
            AND TABLE_NAME = 'user_sessions'
        `);
        
        console.log('📋 Table structure:');
        columns.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        });
        
        // Test session insertion
        console.log('\n🧪 Testing session insertion...');
        
        try {
            await db.execute(`
                INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at)
                VALUES (?, ?, ?, TRUE, NOW())
            `, ['admin_001', 'test_token_12345', new Date(Date.now() + 24*60*60*1000)]);
            
            console.log('✅ Session insertion successful');
            
            // Clean up test session
            await db.execute(`DELETE FROM user_sessions WHERE token_hash = 'test_token_12345'`);
            
        } catch (insertError) {
            console.error('❌ Session insertion failed:', {
                message: insertError.message,
                code: insertError.code,
                errno: insertError.errno,
                sqlState: insertError.sqlState,
                sqlMessage: insertError.sqlMessage
            });
        }

    } catch (error) {
        console.error('💥 Error checking user_sessions:', error.message);
    } finally {
        await db.end();
    }
}

checkUserSessionsTable();
