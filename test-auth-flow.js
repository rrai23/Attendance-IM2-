/**
 * Test Authentication Flow
 */

async function testAuth() {
    console.log('🧪 Testing Authentication Flow');
    
    // Test 1: Login with admin
    console.log('\n📝 Test 1: Login with admin/admin123');
    try {
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login status:', loginResponse.status);
        console.log('Login result:', loginResult);
        
        if (loginResult.success) {
            const token = loginResult.data.token;
            console.log('✅ Login successful, token received');
            
            // Test 2: Use token to access protected endpoint
            console.log('\n📝 Test 2: Test protected endpoint with token');
            const dataResponse = await fetch('http://localhost:3000/api/unified/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Data endpoint status:', dataResponse.status);
            if (dataResponse.ok) {
                const data = await dataResponse.json();
                console.log('✅ Protected endpoint accessible');
                console.log('Employees count:', data.employees?.length || 0);
            } else {
                const error = await dataResponse.text();
                console.log('❌ Protected endpoint failed:', error);
            }
            
        } else {
            console.log('❌ Login failed:', loginResult.message);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
    
    // Test 3: Login with john.smith
    console.log('\n📝 Test 3: Login with john.smith/john123');
    try {
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'john.smith', password: 'john123' })
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login status:', loginResponse.status);
        console.log('Login success:', loginResult.success);
        
        if (!loginResult.success) {
            console.log('❌ Login failed:', loginResult.message);
        } else {
            console.log('✅ John.smith login successful');
        }
        
    } catch (error) {
        console.log('❌ John.smith test failed:', error.message);
    }
}

testAuth();
