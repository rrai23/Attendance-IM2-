const axios = require('axios');

async function testPayrollGeneration() {
    try {
        console.log('Testing payroll generation endpoint...');
        
        // First, let's get a JWT token
        console.log('Attempting login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        console.log('Login response:', loginResponse.data);
        
        if (!loginResponse.data.success) {
            throw new Error('Failed to login: ' + loginResponse.data.message);
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Successfully logged in, token:', token.substring(0, 30) + '...');
        
        // Test a simple authenticated endpoint first to verify token works
        console.log('Testing auth with employees endpoint...');
        const testResponse = await axios.get('http://localhost:3000/api/employees', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Auth test successful, employees response status:', testResponse.status);
        
        // Now test the payroll generation endpoint
        const payrollPayload = {
            employee_ids: null, // Generate for all active employees
            pay_period_start: '2025-07-01',
            pay_period_end: '2025-07-14',
            include_overtime: true,
            include_holidays: true
        };
        
        console.log('Sending payroll generation request with payload:', payrollPayload);
        
        const payrollResponse = await axios.post('http://localhost:3000/api/payroll/generate', payrollPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Payroll generation response:', payrollResponse.data);
        
        if (payrollResponse.data.success) {
            console.log(`✅ Success! Created ${payrollResponse.data.data?.results?.length || 0} payroll records`);
            if (payrollResponse.data.data?.errors?.length > 0) {
                console.log('⚠️ Errors:', payrollResponse.data.data.errors);
            }
        } else {
            console.log('❌ Payroll generation failed:', payrollResponse.data.message);
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.statusText);
            console.error('Response data:', error.response.data);
        } else {
            console.error('❌ Network Error:', error.message);
        }
    }
}

testPayrollGeneration();
