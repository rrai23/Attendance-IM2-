@echo off
REM Production Daemon Startup Script for Bricks Attendance System (Windows)
REM This keeps the server running even after closing the command prompt

echo 🚀 Starting Bricks Attendance System as Background Service...

REM Set production environment
set NODE_ENV=production

REM Navigate to the project directory
cd /d "%~dp0"

REM Kill any existing processes on port 51250
echo 🔧 Cleaning up any existing processes on port 51250...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :51250') do taskkill /f /pid %%a 2>nul

REM Start the server in background mode (Windows equivalent of nohup)
echo 🎯 Starting server in background mode...
start /b node server.js > production.log 2>&1

echo ✅ Server started as background service!
echo 📝 Logs are being written to: production.log
echo 🌐 Server should be accessible at: https://bricks.dcism.org
echo.
echo 📋 Useful commands:
echo    View logs: type production.log
echo    Stop server: stop-daemon.bat
echo.
echo 🔒 You can now safely close this window!

pause
