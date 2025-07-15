# 🚨 CRITICAL REMINDER FOR COPILOT

## ⚠️ MANDATORY READING BEFORE EVERY RESPONSE

### 🖥️ **TERMINAL COMMANDS MUST BE POWERSHELL SYNTAX ONLY**

❌ **NEVER** use: `cd /path/to/dir && command`
✅ **ALWAYS** use: `cd "C:\path\to\dir"; command`

❌ **NEVER** use: `ls -la`
✅ **ALWAYS** use: `Get-ChildItem` or `ls` (PowerShell alias)

❌ **NEVER** use: `kill -9 1234`
✅ **ALWAYS** use: `Stop-Process -Id 1234` or `taskkill /F /PID 1234`

❌ **NEVER** use: `curl -X POST http://localhost:3000/api/test`
✅ **ALWAYS** use: `Invoke-RestMethod -Uri "http://localhost:3000/api/test" -Method POST`

### 📋 **QUICK REFERENCE**

```powershell
# Change directory
cd "d:\IM2-BUILDS\BRIX_SONNET4\GIT-working-latest\Attendance-IM2-"

# Run node server
node server.js

# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]

# Test API endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# Install npm packages
npm install express

# Check running processes
Get-Process node
```

### 🎯 **WORKING DIRECTORY**
`d:\IM2-BUILDS\BRIX_SONNET4\GIT-working-latest\Attendance-IM2-`

### 🔑 **AUTHENTICATION**
- Username: `admin`
- Password: `admin`
- Server: `http://localhost:3000`

### 📝 **REMEMBER**
- Read COPILOT_INSTRUCTIONS.md for full details
- Always use PowerShell syntax
- Test commands before suggesting them
- Include proper error handling

---
**THIS FILE ENSURES COPILOT FOLLOWS POWERSHELL SYNTAX REQUIREMENTS**
