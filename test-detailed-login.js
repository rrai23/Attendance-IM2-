const axios = require('axios');

async function testLogin() {
    try {
        console.log('🧪 Testing login with admin account...');
        
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            validateStatus: function (status) {
                return status < 600; // Accept any status code less than 600
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.status === 200) {
            console.log('✅ Login successful!');
        } else {
            console.log('❌ Login failed with status:', response.status);
        }
        
    } catch (error) {
        console.log('❌ Network or connection error!');
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        
        if (error.response) {
            console.log('Error response status:', error.response.status);
            console.log('Error response data:', error.response.data);
        }
    }
}

testLogin();
