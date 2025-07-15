const mysql = require('mysql2/promise');

async function checkTableStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });
    
    try {
        console.log('🔍 Checking employees table structure...');
        const [empResult] = await connection.execute('DESCRIBE employees');
        console.log('employees table fields:');
        empResult.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type}`);
        });
        
        console.log('\n🔍 Checking user_sessions table structure...');
        const [sessResult] = await connection.execute('DESCRIBE user_sessions');
        console.log('user_sessions table fields:');
        sessResult.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type}`);
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkTableStructure();
