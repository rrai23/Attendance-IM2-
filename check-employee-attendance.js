const db = require('./backend/database/connection');

async function checkEmployeeAttendance() {
  try {
    const result = await db.execute('SELECT employee_id, COUNT(*) as days_worked, SUM(total_hours) as total_hours FROM attendance_records WHERE date >= "2025-07-01" AND date <= "2025-07-14" GROUP BY employee_id ORDER BY employee_id');
    console.log('Employee attendance for 2025-07-01 to 2025-07-14:');
    console.table(result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEmployeeAttendance();
