// Test employee creation
async function testEmployeeCreation() {
    const baseURL = 'http://localhost:3000';
    
    try {
        // First, log in to get a valid token
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login successful:', loginData);
        
        if (!loginData.success) {
            throw new Error('Login failed');
        }
        
        const token = loginData.data.token;
        
        // Test creating an employee
        const employeeData = {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '555-1234',
            department: 'Engineering',
            position: 'Developer',
            date_hired: '2025-01-15',
            salary: 75000,
            employment_type: 'full-time',
            shift_schedule: 'day',
            username: 'johndoe',
            password: 'password123',
            role: 'employee'
        };
        
        const createResponse = await fetch(`${baseURL}/api/employees`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });
        
        const createData = await createResponse.json();
        console.log('Employee creation response:', createData);
        
        // Test getting employees
        const getResponse = await fetch(`${baseURL}/api/employees`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const getData = await getResponse.json();
        console.log('Employees retrieved:', getData);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testEmployeeCreation();
