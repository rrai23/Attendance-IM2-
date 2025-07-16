const db = require('./backend/database/connection');

async function testQuery() {
  try {
    const query = `
      SELECT
          ar.id,
          ar.employee_id,
          ar.date,
          ar.time_in,
          ar.time_out,
          ar.break_start,
          ar.break_end,
          ar.total_hours as hours_worked,
          ar.overtime_hours,
          ar.status,
          ar.notes,
          ar.created_at,
          ar.updated_at,
          e.full_name as employee_name,
          e.employee_id as employee_code,
          e.department,
          e.position
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.employee_id
      WHERE 1=1
      ORDER BY ar.date DESC, ar.created_at DESC LIMIT ? OFFSET ?
    `;
    
    const params = [50, 0];
    
    console.log('Executing query...');
    const result = await db.execute(query, params);
    console.log('Query result type:', typeof result);
    console.log('Query result is array:', Array.isArray(result));
    console.log('Query result length:', result.length);
    
    if (result.length > 0) {
      console.log('First element type:', typeof result[0]);
      console.log('First element is array:', Array.isArray(result[0]));
      console.log('First element length:', result[0].length);
      if (result[0].length > 0) {
        console.log('First record:', result[0][0]);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testQuery();
