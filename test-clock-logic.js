const db = require('./backend/database/connection');

async function testClockInLogic() {
    try {
        const employee_id = 'EMP250012';
        const now = new Date();
        const today = now.toLocaleDateString('en-CA');
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8);
        
        console.log('=== Testing Clock In Logic ===');
        console.log('Employee ID:', employee_id);
        console.log('Today:', today);
        console.log('Current Time:', currentTime);
        
        // Test the exact query from the route
        console.log('\n1. Testing database query...');
        const result = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);
        
        console.log('Query result structure:', typeof result, Array.isArray(result));
        console.log('Result[0] structure:', typeof result[0], Array.isArray(result[0]));
        
        const existingRecords = Array.isArray(result[0]) ? result[0] : (result[0] ? [result[0]] : []);
        console.log('Processed records:', existingRecords.length);
        
        if (existingRecords.length > 0) {
            console.log('Existing record:', existingRecords[0]);
            
            // Check conditions
            const hasTimeIn = existingRecords[0].time_in;
            const hasTimeOut = existingRecords[0].time_out;
            
            console.log('Has time_in:', hasTimeIn);
            console.log('Has time_out:', hasTimeOut);
            
            if (hasTimeIn && !hasTimeOut) {
                console.log('❌ Already clocked in, cannot clock in again');
            } else if (hasTimeIn && hasTimeOut) {
                console.log('❌ Already completed attendance for today');
            } else {
                console.log('✅ Can clock in');
            }
        } else {
            console.log('✅ No existing record, can clock in');
            
            // Test the insert
            console.log('\n2. Testing insert...');
            const [insertResult] = await db.execute(`
                INSERT INTO attendance_records (
                    employee_id, date, time_in, status, notes, created_at, updated_at
                ) VALUES (?, ?, ?, 'present', ?, NOW(), NOW())
            `, [employee_id, today, currentTime, 'Test insert']);
            
            console.log('✅ Insert successful! ID:', insertResult.insertId);
            
            // Clean up
            await db.execute('DELETE FROM attendance_records WHERE id = ?', [insertResult.insertId]);
            console.log('✅ Cleanup complete');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testClockInLogic();
