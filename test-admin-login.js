const http = require('http');

const testLogin = () => {
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'admin123',
        rememberMe: true
    });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Login Status: ${res.statusCode}`);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Login Response:', body);
            try {
                const parsed = JSON.parse(body);
                console.log('Parsed login response:', JSON.stringify(parsed, null, 2));
                
                // Check token expiration
                if (parsed.success && parsed.data && parsed.data.token) {
                    const token = parsed.data.token;
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const expiryDate = new Date(payload.exp * 1000);
                    console.log('Token expires at:', expiryDate.toString());
                    console.log('Token expires in:', parsed.data.expiresIn);
                }
            } catch (e) {
                console.log('Could not parse login response as JSON');
            }
        });
    });

    req.on('error', (error) => {
        console.error('Login request error:', error);
    });

    req.write(loginData);
    req.end();
};

console.log('Testing admin login with 1-year token expiration...');
testLogin();
