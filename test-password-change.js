const fetch = require('node-fetch');

async function testPasswordChange() {
    console.log('🔧 Testing Password Change API Endpoint...\n');
    
    try {
        // First, let's try to get a valid login token
        console.log('Step 1: Attempting to login to get authentication token...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'yuanalarde',  // Using provided credentials
                password: 'alarde123'  // Provided password
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Full Login Response:', loginData);
        console.log('Login Response:', {
            status: loginResponse.status,
            success: loginData.success,
            message: loginData.message,
            hasToken: !!(loginData.data && loginData.data.token),
            hasUser: !!(loginData.data && loginData.data.user)
        });
        
        if (!loginData.success || !loginData.data || !loginData.data.token) {
            console.log('❌ Login failed. Cannot test password change without valid token.');
            return;
        }
        
        const token = loginData.data.token;
        const employeeId = loginData.data.user.employee_id;
        console.log(`✅ Login successful. Employee ID: ${employeeId}\n`);
        
        // Step 2: Test password change endpoint
        console.log('Step 2: Testing password change endpoint...');
        const passwordChangeResponse = await fetch(`http://localhost:3000/api/accounts/${employeeId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: 'alarde123',  // Current password
                newPassword: 'newTestPassword123'  // New password
            })
        });
        
        const passwordChangeData = await passwordChangeResponse.json();
        console.log('Password Change Response:', {
            status: passwordChangeResponse.status,
            success: passwordChangeData.success,
            message: passwordChangeData.message
        });
        
        if (passwordChangeData.success) {
            console.log('✅ Password change successful!');
            
            // Step 3: Try to login with new password
            console.log('\nStep 3: Testing login with new password...');
            const newLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'yuanalarde',
                    password: 'newTestPassword123'
                })
            });
            
            const newLoginData = await newLoginResponse.json();
            console.log('New Login Response:', {
                status: newLoginResponse.status,
                success: newLoginData.success,
                message: newLoginData.message
            });
            
            if (newLoginData.success && newLoginData.data && newLoginData.data.token) {
                console.log('✅ Login with new password successful!');
                
                // Step 4: Change password back to original
                console.log('\nStep 4: Changing password back to original...');
                const revertResponse = await fetch(`http://localhost:3000/api/accounts/${employeeId}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newLoginData.data.token}`
                    },
                    body: JSON.stringify({
                        currentPassword: 'newTestPassword123',
                        newPassword: 'alarde123'
                    })
                });
                
                const revertData = await revertResponse.json();
                console.log('Revert Password Response:', {
                    status: revertResponse.status,
                    success: revertData.success,
                    message: revertData.message
                });
                
                if (revertData.success) {
                    console.log('✅ Password reverted successfully!');
                } else {
                    console.log('❌ Failed to revert password!');
                }
            } else {
                console.log('❌ Login with new password failed!');
            }
        } else {
            console.log('❌ Password change failed!');
            
            // Test with wrong current password
            console.log('\nStep 3: Testing with wrong current password...');
            const wrongPasswordResponse = await fetch(`http://localhost:3000/api/accounts/${employeeId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: 'wrongPassword123',
                    newPassword: 'newTestPassword123'
                })
            });
            
            const wrongPasswordData = await wrongPasswordResponse.json();
            console.log('Wrong Password Response:', {
                status: wrongPasswordResponse.status,
                success: wrongPasswordData.success,
                message: wrongPasswordData.message
            });
        }
        
    } catch (error) {
        console.error('❌ Test Error:', error.message);
    }
}

// Run the test
testPasswordChange().then(() => {
    console.log('\n🔧 Password change test completed.');
}).catch(err => {
    console.error('❌ Test failed:', err);
});
