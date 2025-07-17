const mysql = require('mysql2/promise');

async function createSampleAttendance() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bricks_attendance'
    });

    try {
        console.log('Creating sample attendance records...');

        // Get today's date and create records for the past 10 days
        const today = new Date();
        const records = [];

        // Employee IDs from check-employees.js output
        const employeeIds = ['john.smith', 'jane.doe', 'emp_015', 'emp_097316'];

        for (let i = 0; i < 10; i++) {
            const recordDate = new Date(today);
            recordDate.setDate(today.getDate() - i);
            
            // Skip weekends
            if (recordDate.getDay() === 0 || recordDate.getDay() === 6) continue;

            const dateStr = recordDate.toISOString().split('T')[0];

            for (const employeeId of employeeIds) {
                // Create realistic attendance data
                const timeIn = '08:00:00';
                const timeOut = '17:00:00';
                const breakStart = '12:00:00';
                const breakEnd = '13:00:00';
                const totalHours = 8.0; // 9 hours - 1 hour break
                const overtimeHours = Math.random() > 0.7 ? Math.random() * 2 : 0; // Random overtime

                records.push([
                    employeeId,
                    dateStr,
                    timeIn,
                    timeOut,
                    breakStart,
                    breakEnd,
                    totalHours,
                    overtimeHours,
                    'present',
                    `Sample attendance for ${dateStr}`
                ]);
            }
        }

        // Insert all records
        const insertQuery = `
            INSERT INTO attendance_records 
            (employee_id, date, time_in, time_out, break_start, break_end, total_hours, overtime_hours, status, notes) 
            VALUES ?
        `;

        const [result] = await connection.query(insertQuery, [records]);
        console.log(`✅ Created ${result.affectedRows} attendance records`);

        // Show sample of created records
        const [sample] = await connection.execute(
            'SELECT employee_id, date, total_hours, overtime_hours FROM attendance_records ORDER BY date DESC LIMIT 10'
        );
        
        console.log('📋 Sample records created:');
        sample.forEach(record => {
            console.log(`  ${record.employee_id}: ${record.date} - ${record.total_hours}h (${record.overtime_hours}h OT)`);
        });

    } catch (error) {
        console.error('❌ Error creating sample attendance:', error);
    } finally {
        await connection.end();
    }
}

createSampleAttendance();
