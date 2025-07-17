const mysql = require('mysql2/promise');

async function checkTableStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });
    
    try {
        console.log('🔍 Checking attendance_records table structure...');
        
        // First check if table exists
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'attendance_records'
        `);
        
        if (tables.length === 0) {
            console.log('❌ attendance_records table does not exist!');
            return;
        }
        
        console.log('✅ attendance_records table exists');
        
        console.log('✅ attendance_records table exists');
        
        // Get table structure
        const [result] = await connection.execute('DESCRIBE attendance_records');
        console.log('\n📋 attendance_records table fields:');
        result.forEach(row => {
            console.log(`  ${row.Field}: ${row.Type} (Null: ${row.Null}, Default: ${row.Default || 'None'})`);
        });
        
        // Check specifically for hours_worked column
        const hoursWorkedColumn = result.find(row => row.Field === 'hours_worked');
        console.log('\n🎯 hours_worked Column Check:');
        if (hoursWorkedColumn) {
            console.log('✅ hours_worked column EXISTS');
            console.log(`   Type: ${hoursWorkedColumn.Type}`);
            console.log(`   Nullable: ${hoursWorkedColumn.Null}`);
            console.log(`   Default: ${hoursWorkedColumn.Default || 'None'}`);
        } else {
            console.log('❌ hours_worked column DOES NOT EXIST');
            console.log('🔧 Available columns:', result.map(r => r.Field).join(', '));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkTableStructure();
