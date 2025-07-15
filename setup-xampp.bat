@echo off
REM BRICKS ATTENDANCE SYSTEM - XAMPP SETUP SCRIPT
REM This script sets up the complete database for XAMPP MySQL

echo.
echo ================================================================
echo  BRICKS ATTENDANCE SYSTEM - XAMPP DATABASE SETUP
echo ================================================================
echo.

REM Check if Node.js is installed
echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is installed

REM Check if we're in the correct directory
echo.
echo [2/4] Checking project files...
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)
if not exist "server.js" (
    echo ERROR: server.js not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)
echo ✓ Project files found

REM Install dependencies
echo.
echo [3/4] Installing Node.js dependencies...
echo This may take a few minutes...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully

REM Run database setup
echo.
echo [4/4] Setting up database...
echo ----------------------------------------------------------------
echo IMPORTANT: Make sure XAMPP is running with MySQL service started
echo ----------------------------------------------------------------
echo.
pause

node setup-database.js
if errorlevel 1 (
    echo.
    echo ERROR: Database setup failed
    echo.
    echo Common issues:
    echo - XAMPP is not running
    echo - MySQL service is not started
    echo - Database connection failed
    echo.
    echo Please:
    echo 1. Start XAMPP Control Panel
    echo 2. Start Apache and MySQL services
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)
echo.
echo ================================================================
echo  SETUP COMPLETED SUCCESSFULLY!
echo ================================================================
echo.
echo Your Bricks Attendance System is now ready to use!
echo.
echo NEXT STEPS:
echo 1. Start the server: npm start
echo 2. Open your browser: http://localhost:3000
echo 3. Login with admin credentials (see above)
echo.
echo For development with auto-reload: npm run dev
echo.
pause
)

echo ✅ Sample data added successfully

echo.
echo 🎉 XAMPP Setup completed successfully!
echo.
echo 📊 Database Information:
echo    Database Name: bricks_attendance
echo    Location: XAMPP MySQL Server (localhost:3306)
echo    Access: http://localhost/phpmyadmin
echo    Username: root (no password)
echo.
echo 📋 Sample Data Added:
echo    - 6 sample employees (admin, employee, jane.doe, etc.)
echo    - Recent attendance records
echo    - Login credentials: admin/admin, employee/employee
echo.
echo 🚀 Starting the server...
echo    Backend API: http://localhost:3000/api
echo    Frontend: http://localhost:3000
echo    phpMyAdmin: http://localhost/phpmyadmin
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
