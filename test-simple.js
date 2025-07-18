console.log('Testing simple HTTP request...');

const http = require('http');

// Test if server is responding
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 3000
};

const req = http.request(options, (res) => {
    console.log('✅ Server is responding!');
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        testLogin();
    });
});

req.on('error', (err) => {
    console.log('❌ Connection error:', err.message);
    console.log('Make sure the server is running on port 3000');
});

req.on('timeout', () => {
    console.log('❌ Request timeout');
    req.destroy();
});

req.end();

function testLogin() {
    console.log('\n🧪 Testing login endpoint...');
    
    const postData = JSON.stringify({
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
            'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
    };
    
    const req = http.request(options, (res) => {
        console.log('Login Status Code:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Login Response:', data);
            if (res.statusCode === 200) {
                console.log('✅ Login successful!');
            } else {
                console.log('❌ Login failed');
                try {
                    const response = JSON.parse(data);
                    console.log('Error message:', response.message);
                } catch (e) {
                    console.log('Could not parse error response');
                }
            }
        });
    });
    
    req.on('error', (err) => {
        console.log('❌ Login request error:', err.message);
    });
    
    req.write(postData);
    req.end();
}
