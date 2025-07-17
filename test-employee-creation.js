const axios = require('axios');

async function testEmployeeCreation() {
    try {
        // First login to get a fresh token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        console.log('✅ Login successful');
        console.log('📊 Login response data:', JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.data.token;

        if (!token) {
            console.error('❌ No token received');
            return;
        }

        // Now create employee with correct field names
        console.log('👤 Creating employee...');
        const response = await axios.post('http://localhost:3000/api/employees', {
            first_name: 'Jane',
            last_name: 'Smith',
            email: `jane.smith.${Date.now()}@testfresh.com`,
            phone: '123-456-7890',
            department: 'HR',
            position: 'HR Manager',
            hire_date: '2025-01-15',
            wage: 30.00,
            salary_type: 'hourly'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Employee created successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Employee creation failed:');
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error:', error.message);
    }
}

testEmployeeCreation();
