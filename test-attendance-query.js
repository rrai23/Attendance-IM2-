const db = require('./backend/database/connection');

async function testAttendanceQuery() {
    try {
        console.log('🔍 Testing attendance query...');
        
        // First, check if attendance_records table has data
        console.log('📋 Checking attendance_records table...');
        const [records] = await db.execute('SELECT COUNT(*) as count FROM attendance_records');
        console.log('📊 Raw query result:', records);
        
        // Handle the count properly - the raw result shows { count: 4 }
        const count = records && records.count ? records.count : 0;
        console.log(`📊 Total attendance records: ${count}`);
        
        // Test the JOIN query used in the attendance route
        console.log('🔍 Testing attendance JOIN query...');
        const [joinResults] = await db.execute(`
            SELECT 
                ar.*,
                e.full_name as employee_name,
                e.employee_id as employee_code,
                e.department,
                e.position
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            WHERE 1=1
            ORDER BY ar.date DESC, ar.created_at DESC
            LIMIT 10
        `);
        
        console.log(`📊 JOIN query results: ${joinResults ? joinResults.length : 0} records`);
        console.log('📊 JOIN query raw result:', joinResults);
        
        if (joinResults && joinResults.length > 0) {
            console.log('✅ Sample JOIN result:');
            console.log(joinResults[0]);
        } else {
            console.log('⚠️ No records found with JOIN. Checking for employee_id mismatches...');
            
            // Check attendance records employee_ids
            const [attRecords] = await db.execute('SELECT DISTINCT employee_id FROM attendance_records');
            console.log('📋 Attendance record employee_ids:', attRecords || 'None');
            
            // Check employees table employee_ids
            const [empRecords] = await db.execute('SELECT employee_id FROM employees');
            console.log('📋 Employee table employee_ids:', empRecords || 'None');
        }
        
        // Check attendance_records data
        console.log('\n📋 Checking attendance_records raw data:');
        const [rawAttendance] = await db.execute('SELECT * FROM attendance_records LIMIT 5');
        console.log('Raw attendance records:', rawAttendance || 'None');
        
    } catch (error) {
        console.error('❌ Error testing attendance query:', error);
    } finally {
        process.exit(0);
    }
}

testAttendanceQuery();
