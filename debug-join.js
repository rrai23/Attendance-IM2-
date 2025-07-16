const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bricks_attendance'
});

console.log('Checking employee_id values in attendance_records:');
connection.execute('SELECT DISTINCT employee_id FROM attendance_records ORDER BY employee_id', (err, results) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Attendance records employee_ids:', results.map(r => r.employee_id));
  
  console.log('\nChecking employee_id values in employees table:');
  connection.execute('SELECT employee_id FROM employees ORDER BY employee_id', (err, results) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log('Employees table employee_ids:', results.map(r => r.employee_id));
    
    console.log('\nTesting the JOIN query:');
    const joinQuery = `
      SELECT 
          ar.id,
          ar.employee_id,
          ar.date,
          ar.time_in,
          ar.time_out,
          ar.total_hours as hours_worked,
          e.full_name as employee_name,
          e.employee_id as employee_code,
          e.department
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.employee_id
      WHERE 1=1
      ORDER BY ar.date DESC
      LIMIT 5
    `;
    
    connection.execute(joinQuery, (err, results) => {
      if (err) {
        console.error('Error with JOIN:', err);
        return;
      }
      
      console.log('JOIN results:', results.length, 'records');
      if (results.length > 0) {
        console.log('First record:', results[0]);
      }
      
      connection.end();
    });
  });
});
