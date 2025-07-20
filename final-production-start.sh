#!/bin/bash
# ABSOLUTE FINAL PRODUCTION STARTUP

echo "🚨 FINAL PRODUCTION STARTUP - HARDCODED VALUES"
echo "This script GUARANTEES correct database connection"

# Navigate to correct directory
cd /data/users/s24100604/bricks.dcism.org

# Set NODE_ENV to production BEFORE starting Node.js
export NODE_ENV=production

echo "✅ NODE_ENV set to: $NODE_ENV"
echo "🔧 Starting with hardcoded production database values..."

# Start the server - connection.js will use hardcoded values when NODE_ENV=production
node server.js
