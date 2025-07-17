// Test what employee data looks like from the API
const fetch = require('node-fetch');

async function testEmployeeData() {
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
        console.log('Login result:', loginData);

        if (!loginData.success) {
            console.error('❌ Login failed');
            return;
        }

        const token = loginData.token;

        // Get employees data
        const employeesResponse = await fetch('http://localhost:3000/api/employees', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const employeesData = await employeesResponse.json();
        console.log('\n📊 Employees API Response Structure:');
        console.log(JSON.stringify(employeesData, null, 2));

        if (employeesData.success && employeesData.data && employeesData.data.length > 0) {
            const firstEmployee = employeesData.data[0];
            console.log('\n🔍 First Employee Data Structure:');
            console.log('ID:', firstEmployee.id);
            console.log('Employee ID:', firstEmployee.employee_id);
            console.log('Full Name:', firstEmployee.full_name);
            
            // Test what would be passed for deletion
            const employeeIdForDeletion = firstEmployee.employee_id || firstEmployee.id;
            console.log('\n🎯 ID that would be passed to delete:', employeeIdForDeletion);
            
            // Test if this employee can be found by the delete route's query
            const checkResponse = await fetch(`http://localhost:3000/api/employees`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('\n✅ Delete route would look for employee_id =', employeeIdForDeletion);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testEmployeeData();
