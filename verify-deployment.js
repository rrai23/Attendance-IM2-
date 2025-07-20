const https = require('https');
const http = require('http');

const DOMAIN = 'bricks.dcism.org';
const API_ENDPOINTS = [
    '/api/health',
    '/api',
    '/api/auth/check'
];

function checkEndpoint(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    url,
                    status: res.statusCode,
                    success: res.statusCode < 400,
                    response: data
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                url,
                status: 0,
                success: false,
                error: error.message
            });
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            resolve({
                url,
                status: 0,
                success: false,
                error: 'Timeout'
            });
        });
    });
}

async function verifyDeployment() {
    console.log(`🔍 Verifying deployment for ${DOMAIN}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check main domain
    console.log('\n1. Checking main domain...');
    const mainCheck = await checkEndpoint(`https://${DOMAIN}`);
    console.log(`   ${mainCheck.success ? '✅' : '❌'} https://${DOMAIN} - Status: ${mainCheck.status}`);
    
    // Check API endpoints
    console.log('\n2. Checking API endpoints...');
    for (const endpoint of API_ENDPOINTS) {
        const result = await checkEndpoint(`https://${DOMAIN}${endpoint}`);
        console.log(`   ${result.success ? '✅' : '❌'} ${endpoint} - Status: ${result.status}`);
        
        if (endpoint === '/api/health' && result.success) {
            try {
                const healthData = JSON.parse(result.response);
                console.log(`      Database: ${healthData.database || 'unknown'}`);
                console.log(`      Environment: ${healthData.environment || 'unknown'}`);
            } catch (e) {
                console.log('      Could not parse health response');
            }
        }
    }
    
    // Check HTTPS redirect
    console.log('\n3. Checking HTTPS redirect...');
    const httpCheck = await checkEndpoint(`http://${DOMAIN}`);
    const httpsRedirect = httpCheck.status >= 300 && httpCheck.status < 400;
    console.log(`   ${httpsRedirect ? '✅' : '❌'} HTTP to HTTPS redirect - Status: ${httpCheck.status}`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Deployment verification complete!');
    
    // Summary
    const allEndpoints = [mainCheck, ...await Promise.all(API_ENDPOINTS.map(ep => checkEndpoint(`https://${DOMAIN}${ep}`)))];
    const successCount = allEndpoints.filter(r => r.success).length;
    const totalCount = allEndpoints.length;
    
    console.log(`\n📊 Results: ${successCount}/${totalCount} endpoints working`);
    
    if (successCount === totalCount) {
        console.log('🚀 Deployment appears to be successful!');
        process.exit(0);
    } else {
        console.log('⚠️  Some issues detected. Check the logs above.');
        process.exit(1);
    }
}

if (require.main === module) {
    verifyDeployment();
}

module.exports = { verifyDeployment };
