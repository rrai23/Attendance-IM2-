#!/bin/bash
# Restart Bricks Attendance System Daemon

echo "🔄 Restarting Bricks Attendance System Daemon"
echo "=============================================="

# Stop the server first
echo "🛑 Step 1: Stopping current server..."
./stop-daemon.sh

# Wait a moment
echo "⏳ Waiting 3 seconds..."
sleep 3

# Start the server again
echo "🚀 Step 2: Starting server..."
./start-daemon.sh

echo ""
echo "✅ Restart complete!"
