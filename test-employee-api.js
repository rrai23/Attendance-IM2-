const fetch = require('node-fetch');

async function testEmployeeAPI() {
    try {
        console.log('Testing employee API endpoints...');

        // Step 1: Get login token
        console.log('\n1. Getting login token...');
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
        console.log('Login response success:', loginData.success);
        const authToken = loginData.data?.token;
        
        if (!authToken) {
            throw new Error('No token received from login');
        }
        
        console.log('✅ Login successful, token received');

        // Step 2: Get initial employee data
        console.log('\n2. Getting initial employee data...');
        const initialResponse = await fetch('http://localhost:3000/api/unified/data', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!initialResponse.ok) {
            throw new Error(`Failed to get data: ${initialResponse.status}`);
        }

        const initialData = await initialResponse.json();
        const employees = initialData.data?.employees;
        
        if (!employees) {
            console.log('❌ No employees array in response');
            return;
        }
        
        console.log(`✅ Got ${employees.length} employees`);
        
        if (employees.length === 0) {
            console.log('❌ No employees found to test with');
            return;
        }

        const firstEmployee = employees[0];
        console.log('First employee:', {
            id: firstEmployee.id,
            name: firstEmployee.name,
            department: firstEmployee.department,
            position: firstEmployee.position
        });

        // Step 3: Update employee data
        console.log('\n3. Updating employee data...');
        const originalDept = firstEmployee.department;
        const newDept = originalDept === 'Updated HR' ? 'IT Department' : 'Updated HR';
        
        const updateData = {
            employees: [{
                id: firstEmployee.id,
                name: firstEmployee.name,
                fullName: firstEmployee.name,
                firstName: firstEmployee.firstName || firstEmployee.name?.split(' ')[0] || '',
                lastName: firstEmployee.lastName || firstEmployee.name?.split(' ').slice(1).join(' ') || '',
                email: firstEmployee.email,
                department: newDept,
                position: firstEmployee.position || 'Test Position',
                dateHired: firstEmployee.dateHired || '2024-01-01',
                status: 'active'
            }],
            attendanceRecords: [] // Empty attendance records for this test
        };

        console.log('Sending update:', JSON.stringify(updateData, null, 2));

        const updateResponse = await fetch('http://localhost:3000/api/unified/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update: ${updateResponse.status} - ${errorText}`);
        }

        const updateResult = await updateResponse.json();
        console.log('✅ Update successful');

        // Step 4: Verify persistence by getting data again (simulating refresh)
        console.log('\n4. Verifying data persistence (simulating refresh)...');
        const verifyResponse = await fetch('http://localhost:3000/api/unified/data', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!verifyResponse.ok) {
            throw new Error(`Failed to verify data: ${verifyResponse.status}`);
        }

        const verifyData = await verifyResponse.json();
        const updatedEmployee = verifyData.data?.employees?.find(emp => emp.id === firstEmployee.id);

        if (!updatedEmployee) {
            console.log('❌ Employee not found after update');
            return;
        }

        console.log('Updated employee:', {
            id: updatedEmployee.id,
            name: updatedEmployee.name,
            department: updatedEmployee.department,
            position: updatedEmployee.position
        });

        if (updatedEmployee.department === newDept) {
            console.log('✅ SUCCESS: Employee data persisted after refresh!');
        } else {
            console.log(`❌ FAILED: Department was "${newDept}", but after refresh it's "${updatedEmployee.department}"`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEmployeeAPI().catch(console.error);
