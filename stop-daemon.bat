@echo off
REM Stop the Bricks Attendance System daemon (Windows)

echo 🛑 Stopping Bricks Attendance System...

REM Kill any processes on port 51250
echo 🔧 Stopping processes on port 51250...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :51250') do (
    echo Stopping process ID: %%a
    taskkill /f /pid %%a 2>nul
)

REM Also kill by process name if needed
taskkill /f /im node.exe /fi "WINDOWTITLE eq Bricks*" 2>nul

echo ✅ Stop operation completed!
echo 🏁 All server processes should now be stopped.

pause
