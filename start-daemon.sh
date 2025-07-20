#!/bin/bash

# Production Daemon Startup Script for Bricks Attendance System
# This keeps the server running even after SSH disconnection

echo "🚀 Starting Bricks Attendance System as Background Daemon..."

# Set production environment
export NODE_ENV=production

# Kill any existing processes on port 51250
echo "🔧 Cleaning up any existing processes on port 51250..."
lsof -ti:51250 | xargs -r kill -9 2>/dev/null || true

# Navigate to the project directory
cd "$(dirname "$0")"

# Start the server with nohup (no hang up) - runs in background
echo "🎯 Starting server with nohup (background daemon mode)..."
nohup node server.js > production.log 2>&1 &

# Get the process ID
SERVER_PID=$!
echo "✅ Server started as background daemon!"
echo "📊 Process ID: $SERVER_PID"
echo "📝 Logs are being written to: production.log"
echo "🌐 Server should be accessible at: https://bricks.dcism.org"
echo ""
echo "📋 Useful commands:"
echo "   View logs: tail -f production.log"
echo "   Stop server: ./stop-daemon.sh"
echo "   Check status: ./check-daemon.sh"
echo ""
echo "🔒 You can now safely close your SSH terminal!"

# Save the PID for later management
echo $SERVER_PID > server.pid
