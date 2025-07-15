console.log('🔍 QUICK FRONTEND-DATABASE DIAGNOSTIC');
console.log('=====================================\n');

// Check if required modules exist
try {
  require('mysql2/promise');
  console.log('✅ mysql2 module found');
} catch (e) {
  console.log('❌ mysql2 module missing - run: npm install mysql2');
  process.exit(1);
}

const mysql = require('mysql2/promise');
const net = require('net');

async function quickDiagnostic() {
  try {
    // 1. Test database connection
    console.log('1. TESTING DATABASE CONNECTION:');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bricks_attendance',
      timeout: 5000
    });
    
    const [employees] = await connection.execute('SELECT COUNT(*) as count FROM employees');
    console.log(`✅ Database connected - ${employees[0].count} employees found`);
    await connection.end();

    // 2. Test backend server port
    console.log('\n2. TESTING BACKEND SERVER:');
    const serverRunning = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(3000, 'localhost');
    });

    if (serverRunning) {
      console.log('✅ Backend server running on port 3000');
    } else {
      console.log('❌ Backend server NOT running on port 3000');
      console.log('   Start it with: node server.js');
    }

    // 3. Provide quick diagnosis
    console.log('\n3. QUICK DIAGNOSIS:');
    console.log('==================');
    
    if (!serverRunning) {
      console.log('🔴 MAIN ISSUE: Backend server is not running!');
      console.log('   SOLUTION: Run "node server.js" in a terminal');
      console.log('   This is why frontend changes don\'t reflect in database');
    } else {
      console.log('🟡 Server is running, but frontend might have other issues:');
      console.log('   1. Check browser console for authentication errors');
      console.log('   2. Check Network tab for failed API calls');
      console.log('   3. Clear browser cache/localStorage');
      console.log('   4. Make sure you\'re logged in properly');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Console tab - check for errors');
    console.log('3. Go to Network tab - see if API calls are made');
    console.log('4. Try adding/editing an employee and watch Network tab');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n🔧 FIX: MySQL/XAMPP is not running');
      console.log('   Start XAMPP and make sure MySQL is running');
    }
  }
}

quickDiagnostic().catch(console.error);
