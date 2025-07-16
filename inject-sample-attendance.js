const db = require('./backend/database/connection');

async function injectSampleAttendanceData() {
    try {
        console.log('Starting sample data injection for attendance_records table...');
        
        // First, get available employees
        const employees = await db.execute(`
            SELECT employee_id, full_name, department FROM employees LIMIT 10
        `);
        
        if (!Array.isArray(employees)) {
            console.log('Unexpected response format for employees');
            return;
        }
        
        if (employees.length === 0) {
            console.log('No employees found! Creating sample employees first...');
            
            // Create sample employees if none exist
            const sampleEmployees = [
                { employee_id: 'EMP001', full_name: 'John Doe', department: 'IT', email: 'john.doe@company.com' },
                { employee_id: 'EMP002', full_name: 'Jane Smith', department: 'HR', email: 'jane.smith@company.com' },
                { employee_id: 'EMP003', full_name: 'Mike Johnson', department: 'Finance', email: 'mike.johnson@company.com' },
                { employee_id: 'EMP004', full_name: 'Sarah Wilson', department: 'Marketing', email: 'sarah.wilson@company.com' },
                { employee_id: 'EMP005', full_name: 'David Brown', department: 'IT', email: 'david.brown@company.com' }
            ];
            
            for (const emp of sampleEmployees) {
                try {
                    await db.execute(`
                        INSERT INTO employees (employee_id, full_name, department, email, status, created_at)
                        VALUES (?, ?, ?, ?, 'active', NOW())
                    `, [emp.employee_id, emp.full_name, emp.department, emp.email]);
                    console.log(`Created employee: ${emp.full_name}`);
                } catch (error) {
                    console.log(`Employee ${emp.employee_id} might already exist, skipping...`);
                }
            }
            
            // Re-fetch employees after creation
            const newEmployees = await db.execute(`
                SELECT employee_id, full_name, department FROM employees LIMIT 10
            `);
            
            if (Array.isArray(newEmployees)) {
                employees.push(...newEmployees);
            }
        }
        
        console.log(`\nFound ${employees.length} employees for sample data:`);
        employees.forEach(emp => {
            console.log(`- ${emp.employee_id}: ${emp.full_name} (${emp.department})`);
        });
        
        // Check existing attendance records
        const existingCountResult = await db.execute(`
            SELECT COUNT(*) as count FROM attendance_records
        `);
        
        console.log(`\nExisting attendance records: ${existingCountResult[0] ? existingCountResult[0].count : 0}`);
        
        // Generate sample attendance data for the last 30 days
        const sampleData = [];
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (date.getDay() === 0 || date.getDay() === 6) {
                continue;
            }
            
            for (const employee of employees) {
                // 90% chance of attendance
                if (Math.random() < 0.9) {
                    const timeIn = generateRandomTime(8, 9); // 8:00 AM to 9:00 AM
                    const timeOut = generateRandomTime(17, 18); // 5:00 PM to 6:00 PM
                    const breakStart = generateRandomTime(12, 13); // 12:00 PM to 1:00 PM
                    const breakEnd = addMinutes(breakStart, 30 + Math.floor(Math.random() * 30)); // 30-60 min break
                    
                    // Calculate total hours (excluding break)
                    const totalMinutes = getMinutesDifference(timeIn, timeOut) - getMinutesDifference(breakStart, breakEnd);
                    const totalHours = (totalMinutes / 60).toFixed(2);
                    
                    // Determine status
                    let status = 'present';
                    if (timeIn > '09:00:00') {
                        status = 'late';
                    }
                    
                    // Random chance of other statuses
                    const randomStatus = Math.random();
                    if (randomStatus < 0.05) {
                        status = 'sick';
                    } else if (randomStatus < 0.08) {
                        status = 'vacation';
                    } else if (randomStatus < 0.1) {
                        status = 'half_day';
                    }
                    
                    sampleData.push({
                        employee_id: employee.employee_id,
                        date: dateStr,
                        time_in: timeIn,
                        time_out: timeOut,
                        break_start: breakStart,
                        break_end: breakEnd,
                        total_hours: parseFloat(totalHours),
                        overtime_hours: Math.max(0, parseFloat(totalHours) - 8).toFixed(2),
                        status: status,
                        notes: generateRandomNote(status)
                    });
                } else {
                    // Absent
                    sampleData.push({
                        employee_id: employee.employee_id,
                        date: dateStr,
                        time_in: null,
                        time_out: null,
                        break_start: null,
                        break_end: null,
                        total_hours: 0.00,
                        overtime_hours: 0.00,
                        status: 'absent',
                        notes: 'Unexcused absence'
                    });
                }
            }
        }
        
        console.log(`\nGenerated ${sampleData.length} sample attendance records`);
        
        // Insert sample data
        let insertedCount = 0;
        for (const record of sampleData) {
            try {
                // Check if record already exists
                const existingResult = await db.execute(`
                    SELECT id FROM attendance_records 
                    WHERE employee_id = ? AND date = ?
                `, [record.employee_id, record.date]);
                
                if (!existingResult || existingResult.length === 0) {
                    await db.execute(`
                        INSERT INTO attendance_records (
                            employee_id, date, time_in, time_out, break_start, break_end,
                            total_hours, overtime_hours, status, notes, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    `, [
                        record.employee_id,
                        record.date,
                        record.time_in,
                        record.time_out,
                        record.break_start,
                        record.break_end,
                        record.total_hours,
                        record.overtime_hours,
                        record.status,
                        record.notes
                    ]);
                    insertedCount++;
                }
            } catch (error) {
                console.error(`Error inserting record for ${record.employee_id} on ${record.date}:`, error.message);
            }
        }
        
        console.log(`\n✅ Successfully inserted ${insertedCount} attendance records`);
        
        // Show summary
        const finalCountResult = await db.execute(`
            SELECT COUNT(*) as count FROM attendance_records
        `);
        
        const statusBreakdownResult = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM attendance_records 
            GROUP BY status
        `);
        
        console.log(`\nFinal attendance records count: ${finalCountResult[0] ? finalCountResult[0].count : 0}`);
        console.log('\nStatus breakdown:');
        if (Array.isArray(statusBreakdownResult)) {
            statusBreakdownResult.forEach(row => {
                console.log(`- ${row.status}: ${row.count} records`);
            });
        }
        
        await db.end();
        
    } catch (error) {
        console.error('Error injecting sample data:', error);
        process.exit(1);
    }
}

// Helper functions
function generateRandomTime(startHour, endHour) {
    const hour = startHour + Math.floor(Math.random() * (endHour - startHour));
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
}

function addMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}:00`;
}

function getMinutesDifference(startTime, endTime) {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    
    const startTotalMins = startHours * 60 + startMins;
    const endTotalMins = endHours * 60 + endMins;
    
    return endTotalMins - startTotalMins;
}

function generateRandomNote(status) {
    const notes = {
        present: ['Regular attendance', 'On time', 'Good performance'],
        late: ['Traffic delay', 'Personal emergency', 'Overslept'],
        sick: ['Flu symptoms', 'Medical appointment', 'Fever'],
        vacation: ['Annual leave', 'Family time', 'Personal vacation'],
        half_day: ['Medical appointment', 'Personal matters', 'Family emergency'],
        absent: ['Unexcused absence', 'No notification', 'Personal reasons']
    };
    
    const statusNotes = notes[status] || ['No notes'];
    return statusNotes[Math.floor(Math.random() * statusNotes.length)];
}

injectSampleAttendanceData();
