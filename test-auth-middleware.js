// Test login to trigger updated auth middleware debugging
async function testAuthMiddleware() {
    try {
        console.log('🔧 Testing auth middleware with improved debugging...');
        
        // Test login to get a fresh token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123',
                rememberMe: false
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginData.success) {
            console.log('✅ Login successful, testing data endpoint...');
            
            // Test the data endpoint that's failing
            const dataResponse = await fetch('http://localhost:3000/api/unified/data', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${loginData.data.token}`
                }
            });
            
            console.log('Data response status:', dataResponse.status);
            
            if (dataResponse.status === 401) {
                console.log('❌ Data request failed - auth middleware rejected token');
                console.log('This is the issue causing dashboard logout');
            } else {
                const dataResult = await dataResponse.json();
                console.log('✅ Data request successful');
            }
            
        } else {
            console.log('❌ Login failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAuthMiddleware();
