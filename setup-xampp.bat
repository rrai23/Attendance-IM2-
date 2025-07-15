@echo off
echo 🚀 Setting up Bricks Attendance System with XAMPP
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found

echo.
echo 📋 XAMPP Setup Instructions:
echo.
echo 🔧 Step 1: Start XAMPP Services
echo    1. Open XAMPP Control Panel
echo    2. Click "Start" for Apache
echo    3. Click "Start" for MySQL
echo    4. Both should show green "Running" status
echo.
echo 💡 If XAMPP is not installed:
echo    1. Download from: https://www.apachefriends.org/
echo    2. Install XAMPP
echo    3. Run this script again
echo.

pause

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

REM Create .env file with XAMPP defaults
echo.
echo 📝 Creating .env file with XAMPP defaults...
if exist .env (
    echo    .env file already exists, backing up to .env.backup
    copy .env .env.backup
)

echo # Database Configuration for XAMPP > .env
echo DB_HOST=localhost >> .env
echo DB_PORT=3306 >> .env
echo DB_USER=root >> .env
echo DB_PASSWORD= >> .env
echo DB_NAME=bricks_attendance >> .env
echo. >> .env
echo # Server Configuration >> .env
echo PORT=3000 >> .env
echo NODE_ENV=development >> .env
echo. >> .env
echo # JWT Configuration >> .env
echo JWT_SECRET=bricks_attendance_secret_key_change_in_production_2025 >> .env
echo JWT_EXPIRES_IN=24h >> .env
echo. >> .env
echo # Rate Limiting >> .env
echo RATE_LIMIT_WINDOW_MS=900000 >> .env
echo RATE_LIMIT_MAX_REQUESTS=200 >> .env
echo. >> .env
echo # Security >> .env
echo BCRYPT_ROUNDS=12 >> .env

echo ✅ .env file created with XAMPP defaults

echo.
echo 🔍 Testing XAMPP MySQL connection...
call npm run test-db

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ XAMPP MySQL connection failed
    echo.
    echo 🔧 Please check:
    echo    1. XAMPP Control Panel shows MySQL as "Running" (green)
    echo    2. No other MySQL services are running on port 3306
    echo    3. Windows Firewall isn't blocking XAMPP
    echo.
    echo 💡 Try these solutions:
    echo    1. Restart XAMPP as Administrator
    echo    2. Change MySQL port in XAMPP (if 3306 is busy)
    echo    3. Check XAMPP error logs
    echo.
    pause
    exit /b 1
)

echo ✅ XAMPP MySQL connection successful!

echo.
echo 🗄️  Setting up database structure...
echo    Database name: bricks_attendance
echo    This will create all necessary tables and sample data

call npm run migrate

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Database creation failed
    pause
    exit /b 1
)

echo ✅ Database tables created successfully

echo.
echo 🌱 Adding sample data (employees, attendance records)...
call npm run seed

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Database seeding failed
    pause
    exit /b 1
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
