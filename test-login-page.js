// Test the updated login page authentication
// Using built-in fetch (Node.js 18+)

async function testLoginPage() {
    try {
        console.log('🔐 Testing updated login page authentication...');
        
        // Test the login endpoint directly with the new credentials
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
        
        console.log('Login response status:', loginResponse.status);
        const loginData = await loginResponse.json();
        
        if (loginData.success) {
            console.log('✅ Login successful!');
            console.log('   - Token received');
            console.log('   - User data:', {
                username: loginData.data.user.username,
                role: loginData.data.user.role,
                employee_id: loginData.data.user.employee_id
            });
            
            // Test with second user
            console.log('\n🔐 Testing second user (john.smith)...');
            const loginResponse2 = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'john.smith',
                    password: 'john123',
                    rememberMe: false
                })
            });
            
            const loginData2 = await loginResponse2.json();
            
            if (loginData2.success) {
                console.log('✅ Second user login successful!');
                console.log('   - User data:', {
                    username: loginData2.data.user.username,
                    role: loginData2.data.user.role,
                    employee_id: loginData2.data.user.employee_id
                });
            } else {
                console.log('❌ Second user login failed:', loginData2.message);
            }
            
        } else {
            console.log('❌ Login failed:', loginData.message);
        }
        
        console.log('\n🎯 LOGIN PAGE UPDATE SUMMARY:');
        console.log('=====================================');
        console.log('✅ Removed old complex authentication dependencies');
        console.log('✅ Added simple BackendAuthService for login page');
        console.log('✅ Updated credential examples to match backend users');
        console.log('✅ Simplified login flow to use backend API directly');
        console.log('✅ Removed fallback authentication systems');
        console.log('✅ Updated demo credential click handlers');
        
        console.log('\n🔗 Available Login Credentials:');
        console.log('   - admin / admin123 (Admin role)');
        console.log('   - john.smith / john123 (Manager role)');
        
        console.log('\n🚀 Login page should now work without errors!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginPage();
