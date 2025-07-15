const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bricks_attendance'
};

async function testDatabaseAndAPI() {
  console.log('🔍 FRONTEND-DATABASE SYNC DIAGNOSTIC');
  console.log('=====================================\n');

  try {
    // 1. Test database connection and current data
    console.log('1. TESTING DATABASE CONNECTION AND DATA:');
    const connection = await mysql.createConnection(dbConfig);
    
    const [employees] = await connection.execute('SELECT id, first_name, last_name, email, status FROM employees ORDER BY id');
    console.log(`✅ Database connected - Found ${employees.length} employees:`);
    employees.forEach(emp => {
      console.log(`   - ${emp.id}: ${emp.first_name} ${emp.last_name} (${emp.email}) - ${emp.status}`);
    });

    // 2. Test write capability
    console.log('\n2. TESTING DATABASE WRITE CAPABILITY:');
    const testTime = new Date().toISOString().replace(/[:.]/g, '-');
    const testEmail = `test-${testTime}@example.com`;
    
    const [insertResult] = await connection.execute(
      'INSERT INTO employees (first_name, last_name, email, department, position, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['TestWrite', 'User', testEmail, 'IT', 'Tester', '2025-01-15', 'active']
    );
    
    console.log(`✅ Write test successful - inserted ID: ${insertResult.insertId}`);
    
    // Clean up test record
    await connection.execute('DELETE FROM employees WHERE id = ?', [insertResult.insertId]);
    console.log('✅ Test record cleaned up - database is fully writable');

    // 3. Test if server is running and accessible
    console.log('\n3. TESTING BACKEND SERVER:');
    try {
      // Use setTimeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      // Try to test if the server is running by checking the port
      const net = require('net');
      const socket = new net.Socket();
      
      const portCheckPromise = new Promise((resolve, reject) => {
        socket.setTimeout(3000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Port check timeout'));
        });
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        socket.connect(3000, 'localhost');
      });
      
      await Promise.race([portCheckPromise, timeoutPromise]);
      console.log('✅ Backend server port 3000 is accessible');
      console.log('   Server appears to be running');
      
    } catch (apiError) {
      console.log(`❌ Backend server not accessible: ${apiError.message}`);
      console.log('   This means your Node.js server is likely not running!');
      console.log('   Start it with: node server.js');
    }

    // 4. Check for potential issues
    console.log('\n4. CHECKING FOR COMMON ISSUES:');
    
    // Check if there are any transactions or locks
    const [processes] = await connection.execute('SHOW PROCESSLIST');
    const activeProcesses = processes.filter(p => p.Command !== 'Sleep');
    if (activeProcesses.length > 1) {
      console.log('⚠️  Active database processes detected:');
      activeProcesses.forEach(p => {
        console.log(`   - ${p.User}: ${p.Command} - ${p.Info || 'N/A'}`);
      });
    } else {
      console.log('✅ No blocking database processes');
    }

    await connection.end();

    // 5. Provide diagnosis
    console.log('\n5. DIAGNOSIS AND SOLUTIONS:');
    console.log('===========================');
    
    console.log('\nMost likely causes of your issue:');
    console.log('1. 🔴 FRONTEND AUTHENTICATION ISSUE');
    console.log('   - Your frontend might not be properly authenticated');
    console.log('   - Check browser console for authentication errors');
    console.log('   - Verify JWT tokens are present and valid');
    
    console.log('\n2. 🔴 BACKEND SERVER NOT RUNNING');
    console.log('   - Make sure your Node.js server is running on port 3000');
    console.log('   - Run: node server.js');
    
    console.log('\n3. 🔴 FRONTEND USING CACHED/MOCK DATA');
    console.log('   - Frontend might be using localStorage cache');
    console.log('   - Frontend might be falling back to mock data');
    console.log('   - Check browser Network tab for actual API calls');
    
    console.log('\n4. 🔴 CORS OR API ENDPOINT ISSUES');
    console.log('   - Check browser console for CORS errors');
    console.log('   - Verify API endpoints are correct');
    
    console.log('\nTo fix this:');
    console.log('1. Open browser Developer Tools (F12)');
    console.log('2. Go to Console tab - look for errors');
    console.log('3. Go to Network tab - check if API calls are being made');
    console.log('4. Check Application tab > Local Storage for cached data');
    console.log('5. Make sure your Node.js server is running');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔧 FIX: Database access denied - check MySQL credentials');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 FIX: Database connection refused - make sure MySQL/XAMPP is running');
    }
  }
}

// Run the diagnostic
testDatabaseAndAPI().catch(console.error);
