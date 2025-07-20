#!/bin/bash
# GUARANTEED Production Startup Script

echo "🚨 GUARANTEED PRODUCTION STARTUP"
echo "Setting up environment for production deployment..."

# Set the working directory (adjust if needed)
cd /data/users/s24100604/bricks.dcism.org

# Debug current state
echo "📁 Current directory: $(pwd)"
echo "📋 Files present:"
ls -la | grep -E "\.(env|js)$" | head -5

# Force set NODE_ENV first
export NODE_ENV=production
echo "✅ NODE_ENV set to: $NODE_ENV"

# Method 1: Try with .env.production file if it exists
if [ -f ".env.production" ]; then
    echo "📄 Found .env.production file, trying dotenv method..."
    node -r dotenv/config server.js dotenv_config_path=.env.production
else
    echo "❌ .env.production file not found!"
    echo "📝 Creating .env.production file..."
    
    # Create the .env.production file
    cat > .env.production << 'EOF'
# Production Database Configuration
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

# Frontend URL
FRONTEND_URL=https://bricks.dcism.org

# Session Configuration
SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!
EOF

    echo "✅ Created .env.production file"
    echo "🔄 Trying again with dotenv method..."
    node -r dotenv/config server.js dotenv_config_path=.env.production
fi
