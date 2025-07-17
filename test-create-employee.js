/**
 * Test employee creation directly to understand the backend API
 */

const https = require('https');
const http = require('http');

// Test data that matches the backend API expectations (exclude auto-increment ID and full_name)
const testEmployeeData = {
    employee_id: 'TEST_NO_ID_001',
    first_name: 'Test',
    last_name: 'NoID',
    email: 'test.noid.001@example.com',
    phone: '1234567890',
    department: 'IT',
    position: 'Developer',
    hire_date: '2025-01-15',
    hourly_rate: 25.00,
    salary_type: 'hourly',
    salary: 0,
    status: 'active',
    role: 'employee',
    username: 'test.noid.001',
    password: 'password123'
};

// First, let's get an auth token
async function getAuthToken() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('Login response:', response);
                    if (response.success && response.data && response.data.token) {
                        resolve(response.data.token);
                    } else if (response.success && response.token) {
                        resolve(response.token);
                    } else {
                        reject(new Error('Login failed: ' + (response.message || 'No token received')));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

// Test employee creation
async function testCreateEmployee() {
    try {
        console.log('🔐 Getting auth token...');
        const token = await getAuthToken();
        console.log('✅ Got auth token');

        const employeeData = JSON.stringify(testEmployeeData);
        console.log('📤 Sending employee data:', testEmployeeData);

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/employees',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(employeeData),
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('📥 Backend response:', response);
                    console.log('Status:', res.statusCode);
                } catch (error) {
                    console.error('Failed to parse response:', data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
        });

        req.write(employeeData);
        req.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testCreateEmployee();
