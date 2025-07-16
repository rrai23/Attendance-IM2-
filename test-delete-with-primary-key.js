const https = require('https');
const http = require('http');

// Test DELETE request with primary key (id=4)
const testDeleteEmployee = () => {
    const data = JSON.stringify({});
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/employees/4', // Using primary key id=4
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6ImFkbWluXzAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTI3MDExNDUsImV4cCI6MTc1Mjc4NzU0NX0.3OxSHvz5qcm3HZCaiLqrEhGCjxGeBoBtEWCVuJ2VnH4',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', body);
            try {
                const parsed = JSON.parse(body);
                console.log('Parsed response:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Could not parse response as JSON');
            }
        });
    });

    req.on('error', (error) => {
        console.error('Request error:', error);
    });

    req.write(data);
    req.end();
};

console.log('Testing DELETE /api/employees/4 with primary key...');
testDeleteEmployee();
