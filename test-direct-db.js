const db = require('./backend/database/connection');

async function testDirectDB() {
    try {
        const employee_id = 'EMP250012';
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8);
        
        console.log('Testing direct database insert...');
        console.log('Employee ID:', employee_id);
        console.log('Date:', today);
        console.log('Time:', currentTime);
        
        // Test the exact query from the route
        const [result] = await db.execute(`
            INSERT INTO attendance_records (
                employee_id, date, time_in, status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, 'present', ?, NOW(), NOW())
        `, [employee_id, today, currentTime, 'Test direct insert']);
        
        console.log('✅ Direct insert successful! ID:', result.insertId);
        
        // Clean up
        await db.execute('DELETE FROM attendance_records WHERE id = ?', [result.insertId]);
        console.log('✅ Cleanup complete');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Direct DB test failed:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL State:', error.sqlState);
        
        if (error.sql) {
            console.error('SQL:', error.sql);
        }
        
        process.exit(1);
    }
}

testDirectDB();
