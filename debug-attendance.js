const db = require('./backend/database/connection');

async function debugAttendanceIssue() {
    try {
        console.log('=== Debugging Attendance Issue ===');
        
        // Check recent records for employee EMP250012
        const result = await db.execute(
            'SELECT employee_id, date, time_in, time_out FROM attendance_records WHERE employee_id = ? ORDER BY date DESC LIMIT 5', 
            ['EMP250012']
        );
        const records = result[0];
        
        console.log('\nRecent records for EMP250012:');
        if (Array.isArray(records)) {
            records.forEach((record, index) => {
                console.log(`${index + 1}. Date: ${record.date}, Time in: ${record.time_in}, Time out: ${record.time_out}`);
            });
        } else {
            console.log('No records or unexpected format:', records);
        }
        
        // Check what "today" should be
        const today = new Date().toISOString().split('T')[0];
        console.log('\nToday as ISO string:', today);
        
        // Check if there's a record for today
        const todayResult = await db.execute(
            'SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?', 
            ['EMP250012', today]
        );
        const todayRecords = todayResult[0];
        
        console.log('\nRecords for today (' + today + '):');
        if (Array.isArray(todayRecords) && todayRecords.length > 0) {
            todayRecords.forEach(record => {
                console.log('Record:', {
                    id: record.id,
                    date: record.date,
                    time_in: record.time_in,
                    time_out: record.time_out,
                    status: record.status
                });
            });
        } else {
            console.log('No records found for today');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugAttendanceIssue();
