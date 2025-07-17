const axios = require('axios');

async function testRealDelete() {
    try {
        // Login
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login successful');

        // Get employees list
        console.log('\n📋 Getting employees list...');
        const employeeResponse = await axios.get('http://localhost:3000/api/employees', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const employees = employeeResponse.data.data.employees;
        console.log('👥 Found employees:', employees.length);
        
        // Find a test employee (not admin)
        const testEmployee = employees.find(emp => 
            emp.first_name === 'Jane' && emp.last_name === 'Smith'
        );
        
        if (!testEmployee) {
            console.log('❌ No test employee found to delete');
            return;
        }
        
        console.log('🎯 Target employee:', `${testEmployee.full_name} (ID: ${testEmployee.employee_id})`);

        // Test delete the employee
        console.log('\n🗑️ Testing delete...');
        const deleteResponse = await axios.delete(`http://localhost:3000/api/employees/${testEmployee.employee_id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Delete successful!');
        console.log('📊 Response:', deleteResponse.data);

    } catch (error) {
        console.error('❌ Test failed:');
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

testRealDelete();
