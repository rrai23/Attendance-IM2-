/**
 * Test Username Uniqueness for Employee Creation
 * 
 * This script tests what happens when we try to create another employee
 * with the same name pattern to ensure username uniqueness
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// Test data - same name pattern as before to test uniqueness
const testEmployee = {
    first_name: 'Erika Bianca',
    last_name: 'Api',
    email: 'erika.api.duplicate@company.com', // Different email
    phone: '+1-555-0124',
    department: 'Backend Development',
    position: 'Backend Developer',
    hire_date: '2025-01-17',
    wage: 30.00,
    employment_type: 'full-time',
    shift_schedule: 'day',
    role: 'employee'
};

async function testUsernameUniqueness() {
    console.log('🧪 Testing Username Uniqueness for Duplicate Names');
    console.log('=' .repeat(60));
    
    try {
        // Authenticate as admin
        console.log('🔐 Authenticating as admin...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin authenticated successfully');
        
        // Create another employee with same name pattern
        console.log('\n📋 Creating another employee with same name pattern...');
        console.log('Employee Data:');
        console.log(`   Name: ${testEmployee.first_name} ${testEmployee.last_name}`);
        console.log(`   Email: ${testEmployee.email}`);
        console.log('   Expected: Username should be auto-incremented (e.g., erikabiancaapi2)');
        
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
        
        console.log('\nGenerated Credentials:');
        console.log(`   Username: ${credentials.username}`);
        console.log(`   Password: ${credentials.password}`);
        
        // Verify username was made unique
        console.log('\n🔍 Uniqueness Verification:');
        if (credentials.username === 'erikabiancaapi') {
            console.log('❌ Username was not made unique!');
        } else if (credentials.username.startsWith('erikabiancaapi')) {
            console.log(`✅ Username was made unique: ${credentials.username}`);
        } else {
            console.log(`⚠️ Unexpected username pattern: ${credentials.username}`);
        }
        
        // Test login
        console.log('\n🔑 Testing generated credentials...');
        const testLoginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: credentials.username,
            password: credentials.password
        });
        
        if (testLoginResponse.data.success) {
            console.log('✅ Login with generated credentials successful!');
            console.log(`   Logged in as: ${testLoginResponse.data.data.user.full_name}`);
        } else {
            console.log('❌ Login failed:', testLoginResponse.data.message);
        }
        
        console.log('\n🎉 Username uniqueness test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
    }
}

// Run the test
testUsernameUniqueness();
