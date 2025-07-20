#!/bin/bash
# Universal Linux Daemon Starter for Bricks Attendance System
# Works on CentOS, RHEL, Alpine, and other non-Debian systems

echo "🚀 Starting Bricks Attendance System as Daemon (Universal Linux)"
echo "==============================================================="

# Navigate to server directory
cd /data/users/s24100604/bricks.dcism.org

# Set production environment
export NODE_ENV=production

# Function to check if process is running
is_running() {
    if [ -f server.pid ]; then
        PID=$(cat server.pid)
        if ps -p $PID > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f server.pid  # Clean up stale PID file
            return 1  # Not running
        fi
    fi
    return 1  # No PID file
}

# Check if already running
if is_running; then
    echo "⚠️  Server is already running (PID: $(cat server.pid))"
    echo "📊 Use ./check-daemon-universal.sh to check status"
    exit 0
fi

echo "🔧 Starting server in background..."

# Start server in background with nohup (works on all Linux)
nohup node server.js > production.log 2>&1 &

# Save the PID
SERVER_PID=$!
echo $SERVER_PID > server.pid

echo "✅ Server started successfully!"
echo "📁 PID: $SERVER_PID (saved to server.pid)"
echo "📝 Logs: production.log"
echo "🌐 URL: https://bricks.dcism.org"

# Wait a moment and check if it's still running
sleep 3
if is_running; then
    echo "🎉 Server is running successfully!"
    echo "📊 Use ./check-daemon-universal.sh to monitor"
    echo "🛑 Use ./stop-daemon-universal.sh to stop"
else
    echo "❌ Server failed to start. Check production.log for errors:"
    tail -20 production.log
fi
