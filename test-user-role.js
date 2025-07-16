// Test user role for settings permissions
async function testUserRole() {
    try {
        if (!window.directFlowAuth || !window.directFlowAuth.isAuthenticated()) {
            console.log('User not authenticated');
            return;
        }
        
        const user = window.directFlowAuth.getCurrentUser();
        console.log('Current user:', user);
        console.log('User role:', user?.role);
        
        // Test the /settings endpoint directly
        const response = await window.directFlowAuth.apiRequest('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: {
                    test_setting: 'test_value'
                }
            })
        });
        
        console.log('Settings update response status:', response.status);
        const data = await response.json();
        console.log('Settings update response data:', data);
        
    } catch (error) {
        console.error('Error testing user role:', error);
    }
}

testUserRole();
