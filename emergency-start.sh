#!/bin/bash
# Emergency Production Startup - Manual Environment Setup

echo "🚨 EMERGENCY PRODUCTION STARTUP"
echo "Setting environment variables manually..."

# Manually export all required environment variables
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

echo "✅ Environment variables set manually"
echo "🔧 Testing database connection variables:"
echo "DB_USER: $DB_USER"
echo "DB_HOST: $DB_HOST"
echo "DB_NAME: $DB_NAME"

echo "🚀 Starting server with manual environment..."
node server.js
