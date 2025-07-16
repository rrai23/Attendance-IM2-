# 🤖 COPILOT INSTRUCTIONS - MANDATORY READING

## ⚠️ CRITICAL REQUIREMENTS - READ EVERY TIME

### 🖥️ **TERMINAL COMMAND SYNTAX**
**ABSOLUTELY MANDATORY**: All terminal commands MUST be in **PowerShell syntax** ONLY.
- ❌ **NEVER** use bash syntax
- ❌ **NEVER** use Linux/Unix syntax  
- ❌ **NEVER** use cmd syntax
- ✅ **ALWAYS** use PowerShell syntax

### 📋 **PowerShell Command Examples**

#### File Operations
```powershell
# List files
Get-ChildItem
ls  # PowerShell alias

# Change directory
Set-Location "C:\path\to\directory"
cd "C:\path\to\directory"

# Create directory
New-Item -ItemType Directory -Path "C:\path\to\new\folder"
mkdir "C:\path\to\new\folder"

# Copy files
Copy-Item "source.txt" "destination.txt"
cp "source.txt" "destination.txt"

# Remove files
Remove-Item "file.txt"
rm "file.txt"
```

#### Process Management
```powershell
# Kill process by PID
Stop-Process -Id 1234
taskkill /F /PID 1234

# Kill process by name
Stop-Process -Name "node"
taskkill /F /IM "node.exe"

# Find process using port
Get-NetTCPConnection -LocalPort 3000
netstat -ano | findstr :3000
```

#### Network Operations
```powershell
# HTTP requests
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
Invoke-WebRequest -Uri "http://localhost:3000" -Method POST -Body '{"key":"value"}' -ContentType "application/json"

# Test network connectivity
Test-NetConnection -ComputerName "localhost" -Port 3000
```

#### Node.js Operations
```powershell
# Install packages
npm install express
npm install -g nodemon

# Run node applications
node server.js
npm start
npm run dev

# Package management
npm list
npm outdated
npm update
```

#### Database Operations
```powershell
# MySQL operations via PowerShell
mysql -u root -p
mysqldump -u root -p database_name > backup.sql
```

### 🎯 **PROJECT CONTEXT**

#### Current System Architecture
```
Frontend (HTML/JS) → API Client (js/api-client.js) → Data Manager (js/data-manager.js) → Backend Server (server.js) → MySQL Database
```

#### Key Files Structure
```
Attendance-IM2-/
├── server.js                 # Express server
├── package.json              # Dependencies
├── js/
│   ├── api-client.js         # Streamlined API client
│   ├── data-manager.js       # Frontend data layer
│   └── employees-page.js     # Employee management
├── backend/
│   ├── routes/               # API endpoints
│   ├── database/            # DB connection
│   └── middleware/          # Auth middleware
├── employees.html           # Employee management UI
└── test-streamlined.html    # System testing
```

#### Database Schema
- **user_accounts**: Authentication and user profiles
- **employees**: Employee records (if exists)
- **attendance_records**: Time tracking
- **departments**: Organizational structure

### 🔧 **DEVELOPMENT STANDARDS**

#### Code Style
- Use ES6+ syntax
- Implement proper error handling
- Follow async/await patterns
- Use meaningful variable names
- Add comprehensive comments

#### API Standards
- All endpoints use `/api/` prefix
- JWT authentication required
- RESTful design principles
- Consistent response format:
```json
{
  "success": boolean,
  "message": string,
  "data": object
}
```

#### Database Operations
- Use parameterized queries
- Implement transaction support
- Add proper indexing
- Handle connection pooling

### 🚨 **COMMON ISSUES & SOLUTIONS**

#### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process
taskkill /F /PID [PID_NUMBER]
```

#### Node Module Issues
```powershell
# Clean install
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

#### Database Connection
```powershell
# Test MySQL connection
mysql -u root -p -h localhost
# Check if service is running
Get-Service MySQL*
```

### 📝 **RESPONSE FORMAT REQUIREMENTS**

#### When Providing Terminal Commands
```powershell
# Always use PowerShell syntax
# Include explanatory comments
# Use proper error handling
```

#### When Editing Files
- Use `insert_edit_into_file` for adding new code
- Use `replace_string_in_file` for modifications
- Include 3-5 lines of context before/after changes
- Use `...existing code...` comments for unchanged sections

#### When Debugging
- Check server logs first
- Verify database connections
- Test API endpoints individually
- Use proper error messages

### 🎯 **CURRENT SYSTEM STATUS**

#### Active Components
- ✅ Express server running on port 3000
- ✅ MySQL database: `bricks_attendance`
- ✅ JWT authentication system
- ✅ Streamlined API client
- ✅ Data manager integration

#### Authentication
- Username: `admin`
- Password: `admin123`
- Role: `admin`
- JWT tokens required for all API calls

#### Known Working Endpoints
- `POST /api/auth/login` - Authentication
- `GET /api/unified/data` - Get all data
- `GET /api/unified/employees` - Get employees
- `POST /api/unified/employees` - Create employee
- `PUT /api/unified/employees/:id` - Update employee
- `DELETE /api/unified/employees/:id` - Delete employee

### 🔄 **BEFORE EVERY RESPONSE**

1. **READ** this instruction file
2. **VERIFY** PowerShell syntax for any terminal commands
3. **CHECK** current system status if needed
4. **ENSURE** proper authentication context
5. **VALIDATE** file paths and structure
6. **CONFIRM** database connectivity if relevant

### 📞 **EMERGENCY PROCEDURES**

#### Server Won't Start
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000
# Kill any conflicting processes
taskkill /F /PID [PID]
# Restart server
cd "d:\IM2-BUILDS\BRIX_SONNET4\GIT-working-latest\Attendance-IM2-"
node server.js
```

#### Database Issues
```powershell
# Check MySQL service
Get-Service MySQL*
# Restart MySQL if needed
Restart-Service MySQL80  # or appropriate service name
# Test connection
mysql -u root -p
```

#### Frontend Issues
```powershell
# Clear browser cache
# Check browser console for errors
# Verify API client initialization
# Test authentication flow
```

---

## 🎯 **FINAL REMINDER**

**ALWAYS USE POWERSHELL SYNTAX FOR TERMINAL COMMANDS**
**NEVER USE BASH, CMD, OR OTHER SHELL SYNTAX**
**READ THESE INSTRUCTIONS BEFORE EVERY RESPONSE**

This ensures consistency and prevents errors in the Windows PowerShell environment.
