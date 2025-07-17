/**
 * Test Different Name Patterns
 * 
 * Test the naming convention with various name patterns
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// Test cases with different name patterns
const testCases = [
    {
        employee: {
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@company.com',
            phone: '+1-555-1001',
            department: 'HR',
            position: 'HR Manager',
            hire_date: '2025-01-17',
            wage: 35.00,
            role: 'employee'
        },
        expected: { username: 'johnsmith', password: 'smith123' }
    },
    {
        employee: {
            first_name: 'Maria Elena',
            last_name: 'Rodriguez Garcia',
            email: 'maria.rodriguez@company.com',
            phone: '+1-555-1002',
            department: 'Marketing',
            position: 'Marketing Specialist',
            hire_date: '2025-01-17',
            wage: 28.00,
            role: 'employee'
        },
        expected: { username: 'mariaelena rodriguezgarcia', password: 'rodriguezgarcia123' }
    },
    {
        employee: {
            first_name: 'Bob',
            last_name: 'Johnson Jr',
            email: 'bob.johnson@company.com',
            phone: '+1-555-1003',
            department: 'Finance',
            position: 'Accountant',
            hire_date: '2025-01-17',
            wage: 32.00,
            role: 'employee'
        },
        expected: { username: 'bobjohnsonjr', password: 'johnsonjr123' }
    }
];

async function testMultipleNamePatterns() {
    console.log('🧪 Testing Multiple Name Patterns');
    console.log('=' .repeat(60));
    
    try {
        // Authenticate as admin
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin authenticated successfully\n');
        
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const { employee, expected } = testCase;
            
            console.log(`📋 Test Case ${i + 1}: ${employee.first_name} ${employee.last_name}`);
            console.log(`   Expected Username: ${expected.username.replace(/\s+/g, '')}`);
            console.log(`   Expected Password: ${expected.password.replace(/\s+/g, '')}`);
            
            try {
                const createResponse = await axios.post(
                    `${SERVER_URL}/api/employees`,
                    employee,
                    {
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (createResponse.data.success) {
                    const { credentials } = createResponse.data.data;
                    const expectedUsername = expected.username.replace(/\s+/g, '').toLowerCase();
                    const expectedPassword = expected.password.replace(/\s+/g, '').toLowerCase();
                    
                    console.log(`   ✅ Created - Username: ${credentials.username}, Password: ${credentials.password}`);
                    
                    const usernameMatch = credentials.username === expectedUsername;
                    const passwordMatch = credentials.password === expectedPassword;
                    
                    console.log(`   Username ${usernameMatch ? '✅' : '❌'}: Expected '${expectedUsername}', Got '${credentials.username}'`);
                    console.log(`   Password ${passwordMatch ? '✅' : '❌'}: Expected '${expectedPassword}', Got '${credentials.password}'`);
                } else {
                    console.log(`   ❌ Failed: ${createResponse.data.message}`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
            }
            
            console.log(''); // Add spacing
        }
        
        console.log('🎉 Multiple name pattern test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
    }
}

// Run the test
testMultipleNamePatterns();
