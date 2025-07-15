@echo off
echo 🚀 Setting up Bricks Attendance System (Local Mode - No Database)
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo.
echo 🎉 Setup completed successfully!
echo.
echo 💡 Running in LOCAL MODE (No Database Backend)
echo    - All data stored in browser localStorage
echo    - Works offline
echo    - Data persists between sessions
echo    - Perfect for testing and development
echo.
echo 🌐 You can now open any of these files in your browser:
echo    - dashboard.html (Main dashboard)
echo    - employees.html (Employee management)
echo    - employee-management.html (Attendance tracking)
echo    - analytics.html (Reports and analytics)
echo    - settings.html (System settings)
echo.
echo 🚀 For a quick start, opening dashboard.html...

REM Try to open dashboard.html in default browser
start dashboard.html

echo.
echo ✅ Browser should have opened with the dashboard
echo If not, manually open dashboard.html in your browser
echo.
pause
