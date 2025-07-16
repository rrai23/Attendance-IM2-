const db = require('./backend/database/connection');

async function verifyAttendanceData() {
    try {
        console.log('Verifying attendance data...');
        
        // Get total count
        const totalResult = await db.execute(`
            SELECT COUNT(*) as total FROM attendance_records
        `);
        console.log(`\nTotal attendance records: ${totalResult[0].total}`);
        
        // Get status breakdown
        const statusResult = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM attendance_records 
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.log('\nStatus breakdown:');
        statusResult.forEach(row => {
            console.log(`- ${row.status}: ${row.count} records`);
        });
        
        // Get date range
        const dateRangeResult = await db.execute(`
            SELECT 
                MIN(date) as earliest_date,
                MAX(date) as latest_date,
                COUNT(DISTINCT date) as unique_dates
            FROM attendance_records
        `);
        
        console.log('\nDate range:');
        console.log(`- Earliest: ${dateRangeResult[0].earliest_date}`);
        console.log(`- Latest: ${dateRangeResult[0].latest_date}`);
        console.log(`- Unique dates: ${dateRangeResult[0].unique_dates}`);
        
        // Get employee breakdown
        const employeeResult = await db.execute(`
            SELECT 
                ar.employee_id,
                e.full_name,
                e.department,
                COUNT(*) as record_count,
                AVG(ar.total_hours) as avg_hours
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            GROUP BY ar.employee_id, e.full_name, e.department
            ORDER BY record_count DESC
        `);
        
        console.log('\nEmployee breakdown:');
        employeeResult.forEach(row => {
            console.log(`- ${row.full_name} (${row.employee_id}): ${row.record_count} records, avg ${parseFloat(row.avg_hours || 0).toFixed(2)} hours`);
        });
        
        // Show sample records
        const sampleResult = await db.execute(`
            SELECT 
                ar.*,
                e.full_name,
                e.department
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            ORDER BY ar.date DESC, ar.employee_id
            LIMIT 10
        `);
        
        console.log('\nSample records (latest 10):');
        console.log('=====================================');
        sampleResult.forEach(record => {
            console.log(`Date: ${record.date}`);
            console.log(`Employee: ${record.full_name} (${record.employee_id}) - ${record.department}`);
            console.log(`Status: ${record.status}`);
            console.log(`Time: ${record.time_in || 'N/A'} - ${record.time_out || 'N/A'}`);
            console.log(`Hours: ${record.total_hours || 0} (Overtime: ${record.overtime_hours || 0})`);
            console.log(`Notes: ${record.notes || 'None'}`);
            console.log('---');
        });
        
        // Check for data consistency
        const consistencyResult = await db.execute(`
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN time_in IS NULL AND time_out IS NULL AND status = 'absent' THEN 1 ELSE 0 END) as absent_records,
                SUM(CASE WHEN time_in IS NOT NULL AND time_out IS NOT NULL AND status != 'absent' THEN 1 ELSE 0 END) as present_records,
                SUM(CASE WHEN total_hours > 0 THEN 1 ELSE 0 END) as records_with_hours
            FROM attendance_records
        `);
        
        console.log('\nData consistency check:');
        console.log(`- Total records: ${consistencyResult[0].total_records}`);
        console.log(`- Absent records (no time): ${consistencyResult[0].absent_records}`);
        console.log(`- Present records (with time): ${consistencyResult[0].present_records}`);
        console.log(`- Records with hours: ${consistencyResult[0].records_with_hours}`);
        
        await db.end();
        console.log('\n✅ Verification completed successfully!');
        
    } catch (error) {
        console.error('Error verifying attendance data:', error);
        process.exit(1);
    }
}

verifyAttendanceData();
