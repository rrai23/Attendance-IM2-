/**
 * Test employee creation with correct field mapping
 */

async function testEmployeeCreation() {
    try {
        // Login first
        console.log('Logging in...');
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

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        console.log('Login successful');

        // Create employee with correct field mapping
        console.log('Creating employee...');
        const employeeData = {
            employee_id: 'TEST_FIX_002',
            username: 'test.fix.002',
            password: 'password123',
            role: 'employee',
            full_name: 'Test Fix Employee',
            first_name: 'Test',
            last_name: 'Fix',
            email: 'test.fix@example.com',
            phone: '123-456-7890',
            department: 'IT',
            position: 'Developer',
            hire_date: '2025-01-15',
            status: 'active',
            wage: 25.00,
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

        const responseText = await createResponse.text();
        console.log('Response status:', createResponse.status);
        console.log('Response body:', responseText);

        if (createResponse.ok) {
            const createData = JSON.parse(responseText);
            console.log('✅ Employee created successfully:', createData);
        } else {
            console.log('❌ Failed to create employee');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testEmployeeCreation();
