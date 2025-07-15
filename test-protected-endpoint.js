// Using built-in fetch (Node.js 18+)

async function testAuthFlow() {
    try {
        console.log('🧪 Testing Login + Protected Data');
        
        // First login to get fresh token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login successful:', loginData.success);
        
        if (loginData.success) {
            const token = loginData.data.token;
            console.log('Token received, testing protected endpoint...');
            
            // Test protected endpoint immediately
            const dataResponse = await fetch('http://localhost:3000/api/unified/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Data endpoint status:', dataResponse.status);
            
            if (dataResponse.status === 200) {
                const data = await dataResponse.json();
                console.log('✅ Protected endpoint successful!');
                console.log('Data received:', {
                    employees: data.data?.employees?.length || 0,
                    attendance: data.data?.attendanceRecords?.length || 0
                });
            } else {
                const errorData = await dataResponse.json();
                console.log('❌ Protected endpoint failed:', errorData);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAuthFlow();
