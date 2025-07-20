#!/bin/bash

# Check the status of the Bricks Attendance System daemon

echo "📊 Checking Bricks Attendance System Status..."
echo "============================================="

# Check if PID file exists
if [ -f server.pid ]; then
    SERVER_PID=$(cat server.pid)
    echo "📁 PID file found: $SERVER_PID"
    
    # Check if process is actually running
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "✅ Server is RUNNING (PID: $SERVER_PID)"
        echo "🕒 Started: $(ps -o lstart= -p $SERVER_PID)"
        echo "💾 Memory: $(ps -o rss= -p $SERVER_PID | awk '{print $1/1024 " MB"}')"
    else
        echo "❌ Server is NOT RUNNING (stale PID file)"
        echo "🧹 Cleaning up stale PID file..."
        rm -f server.pid
    fi
else
    echo "📁 No PID file found"
fi

# Check port 51250
echo ""
echo "🌐 Port 51250 Status:"
if lsof -i:51250 > /dev/null 2>&1; then
    echo "✅ Port 51250 is in use:"
    lsof -i:51250
else
    echo "❌ Port 51250 is not in use"
fi

# Check if log file exists and show last few lines
echo ""
echo "📝 Recent Logs:"
if [ -f production.log ]; then
    echo "Last 10 lines from production.log:"
    echo "-----------------------------------"
    tail -10 production.log
else
    echo "❌ No production.log file found"
fi

# Test the actual website
echo ""
echo "🌐 Website Test:"
if curl -s -o /dev/null -w "%{http_code}" "https://bricks.dcism.org" | grep -q "200\|302\|301"; then
    echo "✅ Website is responding"
else
    echo "❌ Website is not responding"
fi

echo ""
echo "============================================="
