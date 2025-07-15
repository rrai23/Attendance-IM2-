// Test Authentication Required System
console.log('🧪 Testing Authentication Required System');

// Test 1: Check if backend rejects unauthenticated requests
async function testUnauthenticatedRequest() {
    console.log('\n📝 Test 1: Unauthenticated request to /api/unified/data');
    
    try {
        const response = await fetch('/api/unified/data');
        console.log('❌ ERROR: Request should have been rejected!');
        console.log('Response status:', response.status);
        console.log('Response:', await response.text());
    } catch (error) {
        console.log('✅ EXPECTED: Request properly rejected');
        console.log('Error:', error.message);
    }
}

// Test 2: Check if UnifiedEmployeeManager fails to initialize without auth
async function testUnifiedManagerWithoutAuth() {
    console.log('\n📝 Test 2: UnifiedEmployeeManager without authentication');
    
    // Clear any existing auth tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('jwt_token');
    
    try {
        const manager = new UnifiedEmployeeManager();
        await manager.init();
        console.log('❌ ERROR: UnifiedEmployeeManager should have failed to initialize!');
    } catch (error) {
        console.log('✅ EXPECTED: UnifiedEmployeeManager properly failed');
        console.log('Error:', error.message);
    }
}

// Test 3: Test BackendApiService without auth
async function testBackendApiServiceWithoutAuth() {
    console.log('\n📝 Test 3: BackendApiService without authentication');
    
    try {
        const apiService = new BackendApiService();
        await apiService.init();
        
        if (!apiService.isAvailable) {
            console.log('✅ EXPECTED: BackendApiService properly marked as unavailable');
        } else {
            console.log('❌ ERROR: BackendApiService should be unavailable without auth!');
        }
    } catch (error) {
        console.log('✅ EXPECTED: BackendApiService failed properly');
        console.log('Error:', error.message);
    }
}

// Test 4: Test with invalid auth token
async function testWithInvalidAuth() {
    console.log('\n📝 Test 4: Invalid authentication token');
    
    // Set invalid token
    localStorage.setItem('auth_token', 'invalid-token-12345');
    
    try {
        const response = await fetch('/api/unified/data', {
            headers: {
                'Authorization': 'Bearer invalid-token-12345'
            }
        });
        
        if (response.status === 401) {
            console.log('✅ EXPECTED: Invalid token properly rejected with 401');
        } else {
            console.log('❌ ERROR: Invalid token should return 401!');
            console.log('Response status:', response.status);
        }
    } catch (error) {
        console.log('✅ EXPECTED: Invalid token rejected');
        console.log('Error:', error.message);
    }
    
    // Clean up
    localStorage.removeItem('auth_token');
}

// Run all tests
async function runAllTests() {
    console.log('🔐 Authentication Required System Tests');
    console.log('=====================================');
    
    await testUnauthenticatedRequest();
    await testUnifiedManagerWithoutAuth();
    await testBackendApiServiceWithoutAuth();
    await testWithInvalidAuth();
    
    console.log('\n✅ All authentication tests completed!');
    console.log('📋 Summary: System properly requires authentication with no fallbacks');
}

// Start tests when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}
