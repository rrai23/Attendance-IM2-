@echo off
echo 🚀 Starting Bricks Attendance System deployment...

REM Set production environment
set NODE_ENV=production

REM Use production environment file
copy .env.production .env

REM Install dependencies
echo 📦 Installing dependencies...
npm install --production

REM Create logs directory
if not exist "logs" mkdir logs

REM Start the application
echo 🔄 Starting application...
start /B node server.js > logs\app.log 2> logs\error.log

echo ✅ Deployment complete!
echo 📊 Application running on port 51250
echo 🌐 Access via your domain/subdomain
echo 📋 Health check: /api/health

pause
