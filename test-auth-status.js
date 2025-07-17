const axios = require('axios');

async function testAuthStatus() {
    try {
        // First login to get a fresh token
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');
        console.log('🔑 Token:', token.substring(0, 50) + '...');

        // Test authenticated request
        console.log('\n📋 Testing authenticated request...');
        const employeeResponse = await axios.get('http://localhost:3000/api/employees', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Authenticated request successful');
        console.log('📊 Response status:', employeeResponse.status);
        console.log('👥 Employee count:', employeeResponse.data.data.employees.length);

        // Test delete specific employee (we'll use a fake ID to see the auth response)
        console.log('\n🗑️ Testing delete request...');
        try {
            const deleteResponse = await axios.delete('http://localhost:3000/api/employees/999', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Delete response:', deleteResponse.status);
        } catch (deleteError) {
            console.log('❌ Delete error status:', deleteError.response?.status);
            console.log('📋 Delete error message:', deleteError.response?.data?.message);
            if (deleteError.response?.status === 401) {
                console.log('🔒 Authentication issue detected!');
            } else {
                console.log('✅ Authentication working, just employee not found');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:');
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

testAuthStatus();
