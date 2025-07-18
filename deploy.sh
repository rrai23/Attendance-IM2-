#!/bin/bash

# Production deployment script for Bricks Attendance System
echo "🚀 Starting Bricks Attendance System deployment..."

# Set production environment
export NODE_ENV=production

# Use production environment file
cp .env.production .env

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Start the application with PM2 (if available) or node
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting with PM2..."
    pm2 stop bricks-attendance || true
    pm2 delete bricks-attendance || true
    pm2 start server.js --name bricks-attendance --log logs/app.log --error logs/error.log
    pm2 save
else
    echo "🔄 Starting with Node.js..."
    nohup node server.js > logs/app.log 2> logs/error.log &
    echo $! > logs/app.pid
    echo "Application started with PID: $(cat logs/app.pid)"
fi

echo "✅ Deployment complete!"
echo "📊 Application running on port 51250"
echo "🌐 Access via your domain/subdomain"
echo "📋 Health check: /api/health"
