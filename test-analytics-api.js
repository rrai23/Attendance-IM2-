// Test script to check analytics API responses
const axios = require('axios');

const baseURL = 'http://localhost:3000/api';

async function testAnalyticsAPIs() {
    try {
        console.log('Testing Analytics APIs...\n');
        
        // Test employees endpoint
        console.log('1. Testing employees endpoint:');
        const employeesResponse = await axios.get(`${baseURL}/employees`);
        console.log('Employees response structure:', typeof employeesResponse.data);
        console.log('Employees count:', Array.isArray(employeesResponse.data) ? 
            employeesResponse.data.length : 
            (employeesResponse.data.employees ? employeesResponse.data.employees.length : 'unknown'));
        
        if (employeesResponse.data.employees) {
            console.log('Sample employee:', employeesResponse.data.employees[0]);
            // Get unique departments
            const departments = [...new Set(employeesResponse.data.employees.map(emp => emp.department).filter(dept => dept))];
            console.log('Available departments:', departments);
        } else if (Array.isArray(employeesResponse.data)) {
            console.log('Sample employee:', employeesResponse.data[0]);
            const departments = [...new Set(employeesResponse.data.map(emp => emp.department).filter(dept => dept))];
            console.log('Available departments:', departments);
        }
        console.log('');
        
        // Test attendance endpoint without filters
        console.log('2. Testing attendance endpoint (no filters):');
        const attendanceResponse = await axios.get(`${baseURL}/attendance`);
        console.log('Attendance response structure:', typeof attendanceResponse.data);
        console.log('Attendance records count:', Array.isArray(attendanceResponse.data) ? 
            attendanceResponse.data.length : 
            (attendanceResponse.data.records ? attendanceResponse.data.records.length : 'unknown'));
        
        if (attendanceResponse.data.records) {
            console.log('Sample attendance record:', attendanceResponse.data.records[0]);
        } else if (Array.isArray(attendanceResponse.data)) {
            console.log('Sample attendance record:', attendanceResponse.data[0]);
        }
        console.log('');
        
        // Test attendance endpoint with department filter
        console.log('3. Testing attendance endpoint with department filter:');
        const filteredAttendanceResponse = await axios.get(`${baseURL}/attendance?department=IT`);
        console.log('Filtered attendance response structure:', typeof filteredAttendanceResponse.data);
        console.log('Filtered attendance records count:', Array.isArray(filteredAttendanceResponse.data) ? 
            filteredAttendanceResponse.data.length : 
            (filteredAttendanceResponse.data.records ? filteredAttendanceResponse.data.records.length : 'unknown'));
        console.log('');
        
        // Test attendance stats endpoint
        console.log('4. Testing attendance stats endpoint:');
        const statsResponse = await axios.get(`${baseURL}/attendance/stats`);
        console.log('Stats response:', JSON.stringify(statsResponse.data, null, 2));
        
    } catch (error) {
        console.error('Error testing APIs:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testAnalyticsAPIs();
