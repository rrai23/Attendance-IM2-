@echo off
echo 🚀 Setting up Bricks Attendance System with MySQL Backend
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if MySQL is installed and accessible
echo 🔍 Checking system requirements...
echo ✅ Node.js found

echo 🔍 Checking MySQL availability...
where mysql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  MySQL client not found in PATH
    echo    Please ensure MySQL is installed and added to PATH
    echo    Or you can continue if MySQL is running on a different machine
) else (
    echo ✅ MySQL client found
)

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

REM Check if .env file exists
if not exist .env (
    echo.
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Please configure your MySQL settings in the .env file
    echo.
    echo 📋 For XAMPP users (RECOMMENDED):
    echo    - DB_HOST=localhost
    echo    - DB_PORT=3306  
    echo    - DB_USER=root
    echo    - DB_PASSWORD= (leave empty for XAMPP default)
    echo    - DB_NAME=bricks_attendance
    echo.
    echo 📋 Other MySQL configurations:
    echo    - Standard MySQL: DB_HOST=localhost, DB_PORT=3306
    echo    - MySQL Workbench: Check your connection settings
    echo.
    echo 🔧 XAMPP Setup Steps:
    echo    1. Open XAMPP Control Panel
    echo    2. Start Apache and MySQL services
    echo    3. Database will be created automatically
    echo    4. You can view it later at: http://localhost/phpmyadmin
    echo.
    echo 🔧 For other MySQL installations:
    echo    1. Start your MySQL server
    echo    2. Edit .env file with correct credentials
    echo    3. Test connection using MySQL Workbench or command line
    echo.
    pause
)

echo.
echo 🗄️  Setting up database...
echo 🔍 Testing MySQL connection...

REM Test MySQL connection first
call npm run test-db

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ MySQL connection test failed
    echo Please fix the connection issues above before continuing
    pause
    exit /b 1
)

REM Run migrations
echo.
echo Creating database tables...
call npm run migrate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Database migration failed
    echo.
    echo 🔧 Troubleshooting steps:
    echo    1. Ensure MySQL server is running
    echo    2. Check .env file settings:
    echo       - DB_HOST (usually localhost)
    echo       - DB_PORT (usually 3306)
    echo       - DB_USER (your MySQL username)
    echo       - DB_PASSWORD (your MySQL password)
    echo    3. Test connection manually:
    echo       mysql -h localhost -u root -p
    echo    4. Common solutions:
    echo       - Start MySQL service: net start mysql
    echo       - Check firewall settings
    echo       - Verify MySQL is listening on port 3306
    echo.
    echo 💡 You can also run without backend (local mode only):
    echo    Just open index.html or dashboard.html directly in browser
    echo.
    pause
    exit /b 1
)

echo ✅ Database tables created successfully

REM Seed database with sample data
echo.
echo 🌱 Seeding database with sample data...
call npm run seed

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Database seeding failed
    pause
    exit /b 1
)

echo ✅ Database seeded successfully

echo.
echo 🎉 Setup completed successfully!
echo.
echo 🚀 Starting the server...
echo    Backend will run on: http://localhost:3000
echo    Frontend files served from root directory
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
call npm start
