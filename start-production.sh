#!/bin/bash
# Production deployment script for Bricks Attendance System

echo "🚀 Starting Bricks Attendance System in Production Mode..."

# Check if .env.production exists
if [ -f .env.production ]; then
    echo "✅ Found .env.production file"
    
    # Method 1: Try with explicit dotenv config
    echo "🌟 Starting server with explicit .env.production loading..."
    node -r dotenv/config server.js dotenv_config_path=.env.production
else
    echo "❌ Warning: .env.production file not found"
    echo "📁 Current directory: $(pwd)"
    echo "📋 Files in directory:"
    ls -la | grep env
    
    # Fallback: Set environment variables manually
    echo "🔄 Falling back to manual environment setup..."
    export NODE_ENV=production
    export DB_HOST=localhost
    export DB_PORT=3306
    export DB_USER=s24100604_bricksdb
    export DB_PASSWORD=bricksdatabase
    export DB_NAME=s24100604_bricksdb
    export PORT=51250
    export FRONTEND_URL=https://bricks.dcism.org
    export JWT_SECRET=Br1cks@Att3nd4nc3_S3cur3_K3y_2025_Production_Deploy_R34dy!
    export JWT_EXPIRES_IN=24h
    export SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!
    
    echo "🌟 Starting server with manual environment variables..."
    node server.js
fi
