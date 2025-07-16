const db = require('./backend/database/connection');

(async () => {
  try {
    console.log('=== DEBUGGING AUTHENTICATION QUERY ===');
    
    // First, check what's in user_accounts
    console.log('1. USER_ACCOUNTS TABLE:');
    const userAccountsResult = await db.execute('SELECT id, username, employee_id, role FROM user_accounts');
    console.log('User accounts result:', userAccountsResult);
    
    // Then check employees table
    console.log('\n2. EMPLOYEES TABLE:');
    const employeesResult = await db.execute('SELECT employee_code, first_name, last_name, status FROM employees LIMIT 3');
    console.log('Employees result:', employeesResult);
    
    // Test the exact authentication query
    console.log('\n3. TESTING AUTH QUERY:');
    const authResult = await db.execute(`
      SELECT 
        ua.*,
        e.first_name,
        e.last_name,
        e.full_name,
        e.email,
        e.department,
        e.position,
        e.date_hired as hire_date,
        e.status as employee_status
      FROM user_accounts ua
      JOIN employees e ON ua.employee_id = e.employee_code
      WHERE ua.username = ? AND ua.is_active = TRUE AND e.status = 'active'
    `, ['admin']);
    
    console.log('Auth query result:', authResult);
    console.log('Auth query result length:', authResult.length);
    
    if (authResult.length > 0) {
      console.log('First result:', authResult[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
