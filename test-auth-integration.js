// Quick authentication test for DirectFlow
console.log('Testing DirectFlow authentication integration...');

// Check localStorage for auth data
console.log('=== localStorage Auth Data ===');
console.log('bricks_auth_session:', localStorage.getItem('bricks_auth_session'));
console.log('bricks_auth_user:', localStorage.getItem('bricks_auth_user'));
console.log('bricks_auth_expiry:', localStorage.getItem('bricks_auth_expiry'));

// Check if auth service is available
if (typeof window !== 'undefined' && window.authService) {
    console.log('=== Auth Service Status ===');
    console.log('Auth service available:', true);
    console.log('Is authenticated:', window.authService.isAuthenticated());
    
    try {
        const user = window.authService.getCurrentUser();
        console.log('Current user:', user);
    } catch (error) {
        console.log('Error getting current user:', error);
    }
} else {
    console.log('Auth service not available');
}

// Check DirectFlow token detection
if (typeof window !== 'undefined' && window.directFlow) {
    console.log('=== DirectFlow Token Detection ===');
    const token = window.directFlow.getAuthToken();
    console.log('DirectFlow detected token:', token ? 'Yes' : 'No');
    console.log('Token value:', token);
    
    console.log('=== DirectFlow Status ===');
    const status = window.directFlow.getStatus();
    console.log('DirectFlow status:', status);
} else {
    console.log('DirectFlow not available');
}

// Test authentication flow
async function testAuth() {
    try {
        console.log('=== Testing Authentication Flow ===');
        
        // First try to login if not authenticated
        if (typeof window !== 'undefined' && window.authService && !window.authService.isAuthenticated()) {
            console.log('Attempting login with default credentials...');
            const loginResult = await window.authService.login('admin', 'admin123');
            console.log('Login result:', loginResult);
        }
        
        // Test DirectFlow API call
        if (typeof window !== 'undefined' && window.directFlow) {
            console.log('Testing DirectFlow API call...');
            const health = await window.directFlow.healthCheck();
            console.log('Health check result:', health);
        }
        
    } catch (error) {
        console.error('Authentication test failed:', error);
    }
}

// Run the test
testAuth();
