const axios = require('axios');

async function testAttendanceAPI() {
    try {
        console.log('🔐 Testing login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'polarbear',
            password: 'bear123'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login failed: ' + loginResponse.data.message);
        }

        const token = loginResponse.data.data.token;
        const employee_id = loginResponse.data.data.user.employee_id;
        
        console.log('✅ Login successful!');
        console.log('🆔 Employee ID:', employee_id);
        console.log('🎫 Token:', token.substring(0, 20) + '...');

        // Test current status
        console.log('\n📊 Testing current status...');
        const statusResponse = await axios.get('http://localhost:3000/api/attendance/current-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Status:', statusResponse.data.data.status);
        console.log('Can clock in:', statusResponse.data.data.capabilities.canClockIn);

        // Test clock in
        console.log('\n🕐 Testing clock in...');
        const clockInResponse = await axios.post('http://localhost:3000/api/attendance/clock', {
            action: 'in',
            notes: 'Test clock in from script'
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Clock in successful!');
        console.log('Time in:', clockInResponse.data.data.time_in);
        console.log('Date:', clockInResponse.data.data.date);

        // Test current status after clock in
        console.log('\n📊 Testing status after clock in...');
        const statusAfterResponse = await axios.get('http://localhost:3000/api/attendance/current-status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('New status:', statusAfterResponse.data.data.status);
        console.log('Can clock out:', statusAfterResponse.data.data.capabilities.canClockOut);

        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testAttendanceAPI();
