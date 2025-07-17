/**
 * Debug the exact server error by testing API with minimal data
 */

async function debugServerError() {
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
        console.log('Login successful, token received');

        // Test with minimal required fields only
        console.log('Testing employee creation with minimal data...');
        const minimalData = {
            employee_id: 'TEST_MIN_001',
            username: 'test.min.001',
            password: 'password123',
            role: 'employee',
            full_name: 'Test Min',
            first_name: 'Test',
            last_name: 'Min',
            email: 'test.min@example.com',
            department: 'IT',
            position: 'Developer',
            hire_date: '2025-01-15',
            status: 'active',
            wage: 15.00,
            salary_type: 'hourly'
        };

        console.log('Data being sent:', JSON.stringify(minimalData, null, 2));

        const createResponse = await fetch('http://localhost:3000/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify(minimalData)
        });

        console.log('Response status:', createResponse.status);
        console.log('Response headers:', [...createResponse.headers.entries()]);

        const responseText = await createResponse.text();
        console.log('Raw response:', responseText);

        try {
            const responseJson = JSON.parse(responseText);
            console.log('Parsed response:', responseJson);
        } catch (parseError) {
            console.log('Response is not valid JSON');
        }

    } catch (error) {
        console.error('Error during test:', error.message);
    }
}

debugServerError();
