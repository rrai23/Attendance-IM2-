/**
 * Test immediate API call without delay
 */

async function testImmediateCall() {
    try {
        const startTime = Date.now();
        
        // Login and immediately make the employee creation call
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
        const loginTime = Date.now();
        console.log(`Login took ${loginTime - startTime}ms`);

        // Immediately create employee
        const employeeData = {
            employee_id: 'TEST_FAST_001',
            username: 'test.fast.001',
            password: 'password123',
            role: 'employee',
            full_name: 'Test Fast',
            first_name: 'Test',
            last_name: 'Fast',
            email: 'test.fast@example.com',
            department: 'IT',
            position: 'Developer',
            hire_date: '2025-01-15',
            status: 'active',
            wage: 15.00,
            salary_type: 'hourly'
        };

        const createResponse = await fetch('http://localhost:3000/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify(employeeData)
        });

        const createTime = Date.now();
        console.log(`Employee creation request took ${createTime - loginTime}ms`);
        console.log(`Total time from start: ${createTime - startTime}ms`);

        console.log('Response status:', createResponse.status);
        const responseText = await createResponse.text();
        console.log('Response:', responseText);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testImmediateCall();
