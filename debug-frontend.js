const fetch = require('node-fetch');

async function testFrontendDataFlow() {
    console.log('🔍 Testing frontend data flow...');
    
    try {
        // Test 1: Login
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful:', loginData.success);
        
        const token = loginData.token;
        
        // Test 2: Check localStorage token storage
        const tokenVariations = [
            'auth_token',
            'auth-token', 
            'jwt_token',
            'token'
        ];
        
        console.log('🔍 Checking token storage variations:');
        tokenVariations.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`  ${key}: ${value ? 'EXISTS' : 'MISSING'}`);
        });
        
        // Store token in all variations for testing
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth-token', token);
        localStorage.setItem('jwt_token', token);
        
        // Test 3: Get unified data
        const dataResponse = await fetch('http://localhost:3000/api/unified/data', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await dataResponse.json();
        console.log('📊 Unified data response:', {
            success: data.success,
            employees: data.data?.employees?.length || 0,
            attendance: data.data?.attendanceRecords?.length || 0,
            message: data.message,
            fullResponse: data
        });
        
        if (data.success && data.data?.employees?.length > 0) {
            console.log('📋 Sample employee data:', data.data.employees[0]);
        }
        
        // Test 3: Check what UnifiedEmployeeManager would receive
        console.log('\n🔍 What UnifiedEmployeeManager should receive:');
        console.log('- Employees:', data.data?.employees?.length || 0);
        console.log('- First employee:', data.data?.employees?.[0] || 'None');
        
        // Test 4: Check if mock data is interfering
        console.log('\n⚠️  Potential issue: Check if mock data is being used instead of real data');
        
        return data;
        
    } catch (error) {
        console.error('❌ Error in frontend data flow test:', error.message);
        throw error;
    }
}

// Run the test
testFrontendDataFlow()
    .then(data => {
        console.log('\n🎉 Frontend data flow test completed successfully');
        console.log('📊 Final data check:', {
            employees: data.data?.employees?.length || 0,
            attendance: data.data?.attendanceRecords?.length || 0
        });
    })
    .catch(error => {
        console.error('\n💥 Frontend data flow test failed:', error.message);
    });
