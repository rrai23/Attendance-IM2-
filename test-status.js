const axios = require('axios');

async function testCurrentStatus() {
    try {
        console.log('🔐 Testing login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'polarbear',
            password: 'bear123'
        });

        const token = loginResponse.data.data.token;
        
        console.log('📊 Testing current status endpoint...');
        const statusResponse = await axios.get('http://localhost:3000/api/attendance/current-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testCurrentStatus();
