const db = require('./backend/database/connection');

async function checkData() {
  try {
    // Check attendance data for the period
    console.log('=== ATTENDANCE DATA CHECK ===');
    const attendance = await db.execute('SELECT employee_id, date, time_in, time_out FROM attendance_records WHERE date >= ? AND date <= ? ORDER BY employee_id, date', ['2025-07-01', '2025-07-14']);
    console.log(`Found ${attendance.length} attendance records for period 2025-07-01 to 2025-07-14`);
    if (attendance.length > 0) {
      console.table(attendance.slice(0, 10)); // Show first 10 records
    }
    
    // Check employees table structure
    console.log('\n=== EMPLOYEES TABLE STRUCTURE ===');
    const structure = await db.execute('DESCRIBE employees');
    console.table(structure);
    
    // Check employee wage data
    console.log('\n=== EMPLOYEE WAGE DATA ===');
    const employees = await db.execute('SELECT employee_id, full_name, wage, salary_type FROM employees WHERE status = "active" ORDER BY employee_id');
    console.log(`Found ${employees.length} active employees`);
    console.table(employees.map(e => ({ 
      employee_id: e.employee_id, 
      name: e.full_name, 
      wage: e.wage,
      salary_type: e.salary_type 
    })));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkData();
