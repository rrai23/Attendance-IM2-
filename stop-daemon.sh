#!/bin/bash

# Stop the Bricks Attendance System daemon

echo "🛑 Stopping Bricks Attendance System daemon..."

# Check if PID file exists
if [ -f server.pid ]; then
    SERVER_PID=$(cat server.pid)
    echo "📊 Found server PID: $SERVER_PID"
    
    # Check if process is actually running
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "🔧 Stopping server process..."
        kill $SERVER_PID
        sleep 2
        
        # Force kill if still running
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo "⚡ Force stopping server..."
            kill -9 $SERVER_PID
        fi
        
        echo "✅ Server stopped successfully!"
    else
        echo "⚠️ Server process not found (may have already stopped)"
    fi
    
    # Clean up PID file
    rm -f server.pid
else
    echo "⚠️ No PID file found, attempting to stop by port..."
    
    # Kill any process on port 51250
    lsof -ti:51250 | xargs -r kill -9 2>/dev/null || true
    echo "✅ Cleaned up any processes on port 51250"
fi

echo "🏁 Daemon stop operation completed!"
