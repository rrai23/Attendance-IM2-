const mysql = require('mysql2/promise');

async function checkEmployeeAttendanceMatch() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('Checking employee vs attendance data match...');

        // Get all employee IDs from employees table
        const [employees] = await connection.execute('SELECT employee_id, full_name FROM employees ORDER BY employee_id');
        console.log('\n📋 Employees in employees table:');
        employees.forEach(emp => {
            console.log(`  ${emp.employee_id}: ${emp.full_name}`);
        });

        // Get all employee IDs from attendance records
        const [attendanceEmpIds] = await connection.execute(
            'SELECT DISTINCT employee_id, COUNT(*) as record_count FROM attendance_records GROUP BY employee_id ORDER BY employee_id'
        );
        console.log('\n📋 Employee IDs in attendance_records:');
        attendanceEmpIds.forEach(emp => {
            console.log(`  ${emp.employee_id}: ${emp.record_count} records`);
        });

        // Find employees with attendance data
        const empIds = employees.map(e => e.employee_id);
        const attIds = attendanceEmpIds.map(a => a.employee_id);
        
        console.log('\n🔍 Analysis:');
        console.log('Employees WITH attendance data:', empIds.filter(id => attIds.includes(id)));
        console.log('Employees WITHOUT attendance data:', empIds.filter(id => !attIds.includes(id)));
        console.log('Attendance records for UNKNOWN employees:', attIds.filter(id => !empIds.includes(id)));

        // Check recent attendance for known employees
        console.log('\n📅 Recent attendance for known employees:');
        for (const emp of employees) {
            const [recentAttendance] = await connection.execute(
                'SELECT date, total_hours, overtime_hours FROM attendance_records WHERE employee_id = ? ORDER BY date DESC LIMIT 3',
                [emp.employee_id]
            );
            
            if (recentAttendance.length > 0) {
                console.log(`\n  ${emp.employee_id} (${emp.full_name}):`);
                recentAttendance.forEach(record => {
                    console.log(`    ${record.date}: ${record.total_hours}h (${record.overtime_hours}h OT)`);
                });
            } else {
                console.log(`\n  ${emp.employee_id} (${emp.full_name}): NO ATTENDANCE DATA`);
            }
        }

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await connection.end();
    }
}

checkEmployeeAttendanceMatch();
