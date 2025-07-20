#!/bin/bash
# Server Debug Script for Environment Issues

echo "🔍 DEBUGGING ENVIRONMENT VARIABLES ON SERVER"
echo "═══════════════════════════════════════════════════"

echo "📁 Current working directory:"
pwd

echo ""
echo "📋 Files in current directory:"
ls -la | grep -E "\.(env|js)$"

echo ""
echo "🔧 Environment variables BEFORE any loading:"
echo "NODE_ENV: '$NODE_ENV'"
echo "DB_HOST: '$DB_HOST'"
echo "DB_USER: '$DB_USER'"
echo "DB_NAME: '$DB_NAME'"
echo "PORT: '$PORT'"

echo ""
echo "📄 Checking .env.production file:"
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    echo "📝 First 10 lines of .env.production:"
    head -10 .env.production
    echo ""
    echo "🔧 File permissions:"
    ls -la .env.production
else
    echo "❌ .env.production file NOT FOUND"
fi

echo ""
echo "🧪 Testing Node.js environment loading:"
node -e "
console.log('Before require dotenv:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);

require('dotenv').config({ path: '.env.production' });

console.log('After require dotenv:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'DEFAULT_FALLBACK_ROOT',
    database: process.env.DB_NAME || 'DEFAULT_FALLBACK_DB'
};

console.log('Final DB Config:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
"

echo ""
echo "═══════════════════════════════════════════════════"
