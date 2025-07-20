// Simple test to verify environment loading
console.log('🧪 Testing Environment Loading...');

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('🔧 Set NODE_ENV to production');
}

console.log('📊 Environment Variables BEFORE dotenv:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

// Try loading .env.production
try {
    if (process.env.NODE_ENV === 'production') {
        require('dotenv').config({ path: '.env.production' });
        console.log('✅ Loaded .env.production');
    } else {
        require('dotenv').config();
        console.log('✅ Loaded default .env');
    }
} catch (error) {
    console.log('❌ Error loading dotenv:', error.message);
}

console.log('📊 Environment Variables AFTER dotenv:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

// Test database config
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 's24100604_bricksdb',
    password: process.env.DB_PASSWORD || 'bricksdatabase',
    database: process.env.DB_NAME || 's24100604_bricksdb'
};

console.log('🗄️  Final Database Config:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Password:', dbConfig.password ? '*'.repeat(dbConfig.password.length) : 'NOT SET');

// Test if this would connect to root
if (dbConfig.user === 'root' || dbConfig.user.includes('root')) {
    console.log('❌ ERROR: Still trying to connect as root!');
} else {
    console.log('✅ SUCCESS: Will connect as production user');
}
