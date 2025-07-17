// Test delete with database ID (after backend changes)
const fetch = require('node-fetch');

async function testDeleteWithDatabaseId() {
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

        // Get employees to see current state
        const employeesResponse = await fetch('http://localhost:3000/api/employees', {
            headers: {
                'Authorization': `Bearer ${loginData.data.token}`,
                'Content-Type': 'application/json'
            }
        });

        const employeesData = await employeesResponse.json();
        
        if (employeesData.success && employeesData.data && employeesData.data.employees) {
            console.log('\n📊 Current Employees:');
            employeesData.data.employees.forEach(emp => {
                console.log(`ID: ${emp.id} | Employee ID: ${emp.employee_id} | Name: ${emp.full_name} | Status: ${emp.status}`);
            });

            // Find an active employee to test deletion
            const activeEmployee = employeesData.data.employees.find(emp => emp.status === 'active');
            
            if (activeEmployee) {
                console.log(`\n🧪 Testing DELETE with database ID: ${activeEmployee.id} (${activeEmployee.full_name})`);
                
                const deleteResponse = await fetch(`http://localhost:3000/api/employees/${activeEmployee.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${loginData.data.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const deleteResult = await deleteResponse.json();
                console.log(`Status: ${deleteResponse.status}`);
                console.log(`Result:`, deleteResult);
                
                if (deleteResult.success) {
                    console.log('✅ DELETE with database ID now works!');
                } else {
                    console.log('❌ DELETE still failing:', deleteResult.message);
                }
            } else {
                console.log('❌ No active employees found to test');
            }
        } else {
            console.log('❌ Failed to get employees:', employeesData.message);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testDeleteWithDatabaseId();
