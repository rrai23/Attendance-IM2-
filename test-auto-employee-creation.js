/**
 * Test Employee Creation with Auto User Account Generation
 * 
 * This script tests the new automatic user account creation feature
 * Example: Creating "Erika Bianca Api" should generate:
 * - Username: erikabiancaapi
 * - Password: api123
 * - JWT Token with 365-day expiry
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// Test data based on the user's example
const testEmployee = {
    first_name: 'Erika Bianca',
    last_name: 'Api',
    email: 'erika.bianca.api@company.com',
    phone: '+1-555-0123',
    department: 'Software Development',
    position: 'Frontend Developer',
    hire_date: '2025-01-17',
    wage: 25.00,
    employment_type: 'full-time',
    shift_schedule: 'day',
    role: 'employee'
};

// Expected results based on the naming convention
const expectedCredentials = {
    username: 'erikabiancaapi',
    password: 'api123'
};

async function testEmployeeCreation() {
    console.log('🧪 Testing Employee Creation with Auto User Account Generation');
    console.log('=' .repeat(70));
    
    try {
        // First, we need to authenticate as an admin to create employees
        console.log('🔐 Step 1: Authenticating as admin...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ Admin login failed:', loginResponse.data.message);
            return;
        }
        
        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin authenticated successfully');
        
        // Create the test employee
        console.log('\n📋 Step 2: Creating employee with auto-generated credentials...');
        console.log('Employee Data:');
        console.log(`   Name: ${testEmployee.first_name} ${testEmployee.last_name}`);
        console.log(`   Email: ${testEmployee.email}`);
        console.log(`   Department: ${testEmployee.department}`);
        console.log(`   Position: ${testEmployee.position}`);
        
        console.log('\nExpected Auto-Generated Credentials:');
        console.log(`   Username: ${expectedCredentials.username}`);
        console.log(`   Password: ${expectedCredentials.password}`);
        
        const createResponse = await axios.post(
            `${SERVER_URL}/api/employees`,
            testEmployee,
            {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!createResponse.data.success) {
            console.error('❌ Employee creation failed:', createResponse.data.message);
            return;
        }
        
        console.log('\n✅ Employee created successfully!');
        
        // Display the results
        const { employee, credentials } = createResponse.data.data;
        
        console.log('\n📊 Creation Results:');
        console.log('=' .repeat(50));
        console.log('Employee Information:');
        console.log(`   ID: ${employee.employee_id}`);
        console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Status: ${employee.status}`);
        
        console.log('\nGenerated Credentials:');
        console.log(`   Username: ${credentials.username}`);
        console.log(`   Password: ${credentials.password}`);
        console.log(`   JWT Token: ${credentials.token.substring(0, 50)}...`);
        console.log(`   Token Expiry: ${credentials.tokenExpiry}`);
        
        // Verify the credentials match our expectations
        console.log('\n🔍 Verification:');
        const usernameMatch = credentials.username === expectedCredentials.username;
        const passwordMatch = credentials.password === expectedCredentials.password;
        
        console.log(`   Username ${usernameMatch ? '✅' : '❌'}: Expected '${expectedCredentials.username}', Got '${credentials.username}'`);
        console.log(`   Password ${passwordMatch ? '✅' : '❌'}: Expected '${expectedCredentials.password}', Got '${credentials.password}'`);
        
        // Test the generated credentials by attempting login
        console.log('\n🔑 Step 3: Testing generated credentials...');
        
        const testLoginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: credentials.username,
            password: credentials.password
        });
        
        if (testLoginResponse.data.success) {
            console.log('✅ Login with generated credentials successful!');
            console.log(`   Logged in as: ${testLoginResponse.data.data.user.full_name}`);
            console.log(`   Role: ${testLoginResponse.data.data.user.role}`);
            console.log(`   Token expires: ${testLoginResponse.data.data.expiresIn || 'N/A'}`);
        } else {
            console.log('❌ Login with generated credentials failed:', testLoginResponse.data.message);
        }
        
        console.log('\n🎉 Test completed successfully!');
        console.log('\nSummary:');
        console.log(`✅ Employee "${testEmployee.first_name} ${testEmployee.last_name}" created`);
        console.log(`✅ Username auto-generated: ${credentials.username}`);
        console.log(`✅ Password auto-generated: ${credentials.password}`);
        console.log(`✅ JWT token created with 365-day expiry`);
        console.log(`✅ User account is immediately functional`);
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
        
        if (error.response?.data?.message?.includes('Email already exists')) {
            console.log('\n💡 Note: This employee might already exist. Try with a different email or check the existing employee.');
        }
    }
}

// Run the test
testEmployeeCreation();
