const mysql = require('mysql2/promise');

async function checkAttendanceData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('Checking attendance data...');

        // Check if records exist
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM attendance_records');
        console.log('Total attendance records:', countResult[0].count);

        // Get sample records
        const [records] = await connection.execute('SELECT * FROM attendance_records ORDER BY date DESC LIMIT 10');
        console.log('Sample records:');
        records.forEach(record => {
            console.log(`  ${record.employee_id}: ${record.date} - ${record.total_hours}h (${record.overtime_hours}h OT)`);
        });

        // Check specific employees
        const [empRecords] = await connection.execute(
            'SELECT employee_id, COUNT(*) as record_count FROM attendance_records GROUP BY employee_id'
        );
        console.log('\nRecords per employee:');
        empRecords.forEach(emp => {
            console.log(`  ${emp.employee_id}: ${emp.record_count} records`);
        });

    } catch (error) {
        console.error('Error checking attendance:', error);
    } finally {
        await connection.end();
    }
}

checkAttendanceData();
