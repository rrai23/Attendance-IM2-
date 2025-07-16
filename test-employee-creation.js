const axios = require('axios');

async function testEmployeeCreation() {
    try {
        const response = await axios.post('http://localhost:3000/api/employees', {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '123-456-7890',
            department: 'IT',
            position: 'Software Developer',
            date_hired: '2025-01-15',
            salary: 75000,
            username: 'johndoe',
            password: 'password123',
            role: 'employee'
        }, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llX2lkIjoiQURNSU4wMDEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUyNjAyOTcwLCJleHAiOjE3NTI2ODkzNzB9.2K9ajs-EZy-h-jsfENpQkN01_aIZT1jXfDFXH-EdinU',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Employee created successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Employee creation failed:');
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error:', error.message);
    }
}

testEmployeeCreation();
