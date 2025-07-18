const fs = require('fs');
const path = require('path');

console.log('🚀 Configuring Bricks Attendance System for deployment...\n');

// Create production environment
const productionEnv = `# Production Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=s24100604_bricksdb
DB_PASSWORD=bricksdatabase
DB_NAME=s24100604_bricksdb

# Server Configuration
PORT=51250
NODE_ENV=production

# JWT Configuration
JWT_SECRET=Br1cks@Att3nd4nc3_S3cur3_K3y_2025_Production_Deploy_R34dy!
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12

# Frontend URL (update with your domain)
FRONTEND_URL=https://bricks.dcism.org

# Session Configuration
SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!`;

// Write production environment file
fs.writeFileSync('.env.production', productionEnv);
console.log('✅ Created .env.production');

// Copy to main .env for deployment
fs.writeFileSync('.env', productionEnv);
console.log('✅ Updated .env for production');

// Create logs directory
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
    console.log('✅ Created logs directory');
}

// Create .htaccess file
const htaccess = `# Force HTTPS (Security)
RewriteEngine on
RewriteCond %{REQUEST_SCHEME} !https
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Node.js Application Proxy
RewriteRule (.*) http://127.0.0.1:51250%{REQUEST_URI} [P,L]`;

fs.writeFileSync('.htaccess', htaccess);
console.log('✅ Created .htaccess file');

console.log('\n🎯 Deployment Configuration Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Upload all files to your subdomain folder');
console.log('2. Update FRONTEND_URL in .env.production with your domain');
console.log('3. Run: npm install --production');
console.log('4. Run: npm run deploy:production');
console.log('5. Access your site via: https://yoursubdomain.yourdomain.com');
console.log('\n🔍 Port Configuration:');
console.log('- Application runs on: 51250');
console.log('- .htaccess proxies from web to: 127.0.0.1:51250');
console.log('- HTTPS is enforced');
console.log('\n💾 Database:');
console.log('- Host: localhost');
console.log('- User: s24100604_bricksdb');
console.log('- Database: s24100604_bricksdb');
console.log('\n🔒 Security Features:');
console.log('- HTTPS enforcement');
console.log('- Production JWT secrets');
console.log('- Rate limiting enabled');
console.log('- CORS protection');

module.exports = {
    port: 51250,
    database: {
        host: 'localhost',
        user: 's24100604_bricksdb',
        password: 'bricksdatabase',
        database: 's24100604_bricksdb'
    }
};
