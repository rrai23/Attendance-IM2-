# DirectFlow Setup Guide

## 🚀 Quick Start

### 1. Server Setup
```powershell
# Navigate to project directory
cd "d:\IM2-BUILDS\BRIX_SONNET4\GIT-working-latest\Attendance-IM2-"

# Start the server
node server.js
```

### 2. Database Setup (if needed)
```powershell
# Backup existing database
node backend/database/backup-schema.js

# Setup/verify schema
node backend/database/setup-schema.js setup
```

### 3. Test DirectFlow
Open browser to: `http://localhost:3000/test-directflow.html`

## 🔧 Usage in Your Code

### Basic Implementation:
```javascript
// DirectFlow is automatically initialized
const directFlow = window.directFlow;

// Check if ready
if (directFlow.isReady()) {
    // Your code here
}
```

### Employee Management:
```javascript
// Get all employees
const employees = await directFlow.getEmployees();

// Create new employee
const newEmployee = await directFlow.createEmployee({
    employee_id: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    position: 'Developer',
    department: 'IT'
});

// Update employee
const updatedEmployee = await directFlow.updateEmployee('EMP001', {
    position: 'Senior Developer'
});

// Delete employee
await directFlow.deleteEmployee('EMP001');
```

### Attendance Management:
```javascript
// Get attendance records
const attendance = await directFlow.getAttendanceRecords();

// Get filtered attendance
const filtered = await directFlow.getAttendanceRecords({
    employeeId: 'EMP001',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
});

// Create attendance record
const newRecord = await directFlow.createAttendanceRecord({
    employee_id: 'EMP001',
    date: '2024-01-15',
    time_in: '09:00:00',
    time_out: '17:00:00',
    status: 'present'
});

// Get attendance overview
const overview = await directFlow.getAttendanceOverview();
```

### Payroll Management:
```javascript
// Get payroll records
const payroll = await directFlow.getPayrollRecords();

// Generate payroll
const generated = await directFlow.generatePayroll({
    start_date: '2024-01-01',
    end_date: '2024-01-15',
    employee_ids: ['EMP001', 'EMP002']
});
```

### Settings Management:
```javascript
// Get all settings
const settings = await directFlow.getSettings();

// Update single setting
await directFlow.updateSetting('company_name', 'My Company');

// Update multiple settings
await directFlow.updateSettings({
    company_name: 'My Company',
    working_hours_per_day: '8'
});
```

### Authentication:
```javascript
// Login
const loginResult = await directFlow.login({
    username: 'admin',
    password: 'admin'
});

// Check current user
const currentUser = await directFlow.getCurrentUser();

// Logout
await directFlow.logout();
```

### Event Handling:
```javascript
// Listen for events
directFlow.addEventListener('employee-created', (data) => {
    console.log('New employee:', data.employee);
    // Update UI
});

directFlow.addEventListener('login-success', (data) => {
    console.log('User logged in:', data.user);
    // Redirect to dashboard
});

directFlow.addEventListener('auth-error', (data) => {
    console.error('Auth error:', data.message);
    // Show login form
});
```

## ⚠️ Important Notes

1. **Authentication Required**: All operations require valid authentication
2. **No localStorage**: All data is backend-only
3. **No Offline Mode**: Backend connection required
4. **Error Handling**: Always wrap in try-catch blocks

## 🔄 Migration from Old Services

### Old Code:
```javascript
// OLD - Don't use these anymore
window.dataService.getEmployees();
window.unifiedEmployeeManager.getAttendanceRecords();
window.backendApiService.syncToBackend(data);
```

### New Code:
```javascript
// NEW - Use DirectFlow
window.directFlow.getEmployees();
window.directFlow.getAttendanceRecords();
window.directFlow.syncData(data);
```

## 📋 Error Handling

```javascript
try {
    const employees = await directFlow.getEmployees();
    // Success
} catch (error) {
    if (error.message.includes('Authentication')) {
        // Handle auth error
        console.error('Please log in again');
    } else if (error.message.includes('Network')) {
        // Handle network error
        console.error('Check backend connection');
    } else {
        // Handle other errors
        console.error('Operation failed:', error.message);
    }
}
```

## 🎯 Best Practices

1. **Always Check Ready State**:
```javascript
if (directFlow.isReady()) {
    // Safe to use DirectFlow
}
```

2. **Use Event Listeners**:
```javascript
directFlow.addEventListener('initialized', () => {
    // DirectFlow is ready
});
```

3. **Handle Errors Gracefully**:
```javascript
try {
    const result = await directFlow.someOperation();
} catch (error) {
    // Show user-friendly error message
}
```

4. **Update UI on Events**:
```javascript
directFlow.addEventListener('employee-created', (data) => {
    // Refresh employee list
    loadEmployees();
});
```

## 🧪 Testing

### Test Authentication:
```javascript
// Test login
const loginResult = await directFlow.login({
    username: 'admin',
    password: 'admin'
});

console.log('Login success:', loginResult.success);
```

### Test Health:
```javascript
// Test backend connection
const health = await directFlow.healthCheck();
console.log('Backend status:', health.status);
```

### Test Operations:
```javascript
// Test all operations
const employees = await directFlow.getEmployees();
const attendance = await directFlow.getAttendanceRecords();
const settings = await directFlow.getSettings();

console.log('All operations successful');
```

## 📞 Support

- **Test Console**: `http://localhost:3000/test-directflow.html`
- **API Health**: `http://localhost:3000/api/health`
- **Migration Report**: `DIRECTFLOW_MIGRATION_REPORT.md`
- **Implementation Summary**: `DIRECTFLOW_IMPLEMENTATION_SUMMARY.md`

---

**Happy coding with DirectFlow! 🚀**
