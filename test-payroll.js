const axios = require('axios');

async function testPayrollGeneration() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.token;
    
    // Generate payroll
    const payrollResponse = await axios.post('http://localhost:3000/api/payroll/generate', {
      pay_period_start: '2025-07-01',
      pay_period_end: '2025-07-14'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Payroll generation response:');
    console.log(JSON.stringify(payrollResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPayrollGeneration();
