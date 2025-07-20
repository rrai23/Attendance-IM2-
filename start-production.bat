@echo off
REM Production deployment script for Bricks Attendance System

echo 🚀 Starting Bricks Attendance System in Production Mode...

REM Set production environment
set NODE_ENV=production

REM Start the application (will auto-use port 51250 in production)
echo 🌟 Starting server (auto-configured for port 51250)...
node server.js

pause
