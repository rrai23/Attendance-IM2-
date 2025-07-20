// Environment Test Script
console.log('🔍 Environment Variable Check');
console.log('═══════════════════════════════════════');

// Check current working directory
console.log('📁 Current Directory:', process.cwd());

// Check if .env.production exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.production');

console.log('📋 .env.production file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    console.log('📄 .env.production contents:');
    console.log(fs.readFileSync(envPath, 'utf8').split('\n').slice(0, 10).join('\n')); // First 10 lines only
}

console.log('\n🔧 Environment Variables BEFORE dotenv:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PORT:', process.env.PORT);

// Try to load .env.production
try {
    require('dotenv').config({ path: '.env.production' });
    console.log('\n✅ dotenv.config() executed successfully');
} catch (error) {
    console.log('\n❌ Error loading dotenv:', error.message);
}

console.log('\n🔧 Environment Variables AFTER dotenv:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PORT:', process.env.PORT);

// Test database connection config
console.log('\n🗄️  Database Connection Config:');
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test'
};

console.log('Host:', dbConfig.host);
console.log('Port:', dbConfig.port);
console.log('User:', dbConfig.user);
console.log('Password:', dbConfig.password ? '*'.repeat(dbConfig.password.length) : 'NOT SET');
console.log('Database:', dbConfig.database);

console.log('\n═══════════════════════════════════════');
console.log('🎯 Run this before starting your server to debug environment issues');
