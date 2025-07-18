const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testJWTCreation() {
    try {
        console.log('🧪 Testing JWT creation...');
        
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
        
        const tokenPayload = {
            employee_id: 'admin_001',
            username: 'admin',
            role: 'admin'
        };
        
        console.log('🔑 Creating JWT token...');
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        
        console.log('✅ JWT token created successfully');
        console.log('Token preview:', token.substring(0, 50) + '...');
        
        // Test token verification
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ JWT token verified successfully');
        console.log('Decoded payload:', decoded);
        
        // Test response object creation
        const userData = {
            employee_id: 'admin_001',
            username: 'admin',
            role: 'admin',
            full_name: 'System Administrator',
            first_name: 'System',
            last_name: 'Administrator',
            email: 'admin@bricks.com'
        };
        
        const responseData = {
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                token,
                expiresIn: '24h'
            }
        };
        
        console.log('✅ Response object created successfully');
        console.log('Response size:', JSON.stringify(responseData).length, 'bytes');
        
    } catch (error) {
        console.error('❌ JWT creation failed:', {
            message: error.message,
            stack: error.stack
        });
    }
}

testJWTCreation();
