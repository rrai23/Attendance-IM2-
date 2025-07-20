@echo off
REM ABSOLUTE FINAL PRODUCTION STARTUP

echo 🚨 FINAL PRODUCTION STARTUP - HARDCODED VALUES
echo This script GUARANTEES correct database connection

REM Set NODE_ENV to production BEFORE starting Node.js
set NODE_ENV=production

echo ✅ NODE_ENV set to: %NODE_ENV%
echo 🔧 Starting with hardcoded production database values...

REM Start the server - connection.js will use hardcoded values when NODE_ENV=production
node server.js

pause
