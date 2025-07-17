// Test delete endpoint directly
const fetch = require('node-fetch');

async function testDeleteEndpoint() {
    try {
        // Test authentication first
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login result:', loginData.success ? '✅ Success' : '❌ Failed');

        if (!loginData.success) {
            console.error('❌ Login failed:', loginData.message);
            return;
        }

        // Test different ID formats
        const testIds = ['EMP250003', '1', '2', '3'];
        
        for (const testId of testIds) {
            console.log(`\n🧪 Testing DELETE with ID: "${testId}"`);
            
            const deleteResponse = await fetch(`http://localhost:3000/api/employees/${testId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${loginData.data.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const deleteResult = await deleteResponse.json();
            console.log(`Status: ${deleteResponse.status}`);
            console.log(`Result:`, deleteResult);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testDeleteEndpoint();
