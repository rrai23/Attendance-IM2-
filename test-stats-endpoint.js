const fetch = require('node-fetch');

async function testStatsEndpoint() {
    try {
        console.log('Testing /api/attendance/stats endpoint...');
        
        // First, let's test without authentication to see the route structure
        const response = await fetch('http://localhost:3000/api/attendance/stats');
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.text();
        console.log('Response body:', data);
        
        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(data);
            console.log('Parsed JSON:', jsonData);
        } catch (e) {
            console.log('Response is not valid JSON');
        }
        
    } catch (error) {
        console.error('Error testing stats endpoint:', error);
    }
}

testStatsEndpoint();
