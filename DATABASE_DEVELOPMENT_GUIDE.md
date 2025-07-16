# Attendance Management System - Database & API Quick Reference

## 🚀 Quick Start Guide

### Database Overview
- **Database**: `bricks_attendance`
- **Tables**: 9 core tables
- **Engine**: MySQL with `mysql2/promise`
- **Connection**: Pool-based connection

### Core Tables & Purpose
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `employees` | Master employee data | `employee_id`, `full_name`, `department`, `role` |
| `user_accounts` | Authentication & login | `username`, `password_hash`, `role`, `is_active` |
| `attendance_records` | Daily attendance tracking | `employee_id`, `date`, `time_in`, `time_out`, `status` |
| `departments` | Department structure | `name`, `manager_id`, `is_active` |
| `user_sessions` | JWT session management | `employee_id`, `token_hash`, `expires_at` |

## 🔑 Key Development Patterns

### 1. Database Query Pattern
```javascript
// MySQL2 Promise - Result is DIRECT array
const records = await db.execute(query, params);
// ✅ Correct: records is the array
// ❌ Wrong: records[0] (that's the first record)
```

### 2. Common JOIN Pattern
```javascript
// Attendance with employee info
const records = await db.execute(`
    SELECT 
        ar.id,
        ar.employee_id,
        ar.date,
        ar.time_in,
        ar.time_out,
        ar.total_hours as hours_worked,
        ar.status,
        ar.notes,
        e.full_name as employee_name,
        e.department,
        e.position
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.employee_id
    WHERE ar.date >= ? AND ar.date <= ?
    ORDER BY ar.date DESC
`, [startDate, endDate]);
```

### 3. Frontend Data Transformation
```javascript
// Transform DB record to frontend format
const transformedRecord = {
    id: record.id,
    employeeId: record.employee_id,
    employeeName: record.employee_name,
    employeeCode: record.employee_code,
    department: record.department,
    date: record.date,
    clockIn: record.time_in,
    clockOut: record.time_out,
    timeIn: record.time_in,
    timeOut: record.time_out,
    hours: record.hours_worked,
    hoursWorked: record.hours_worked,
    overtimeHours: record.overtime_hours,
    status: record.status,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at
};
```

## 📊 Primary Key Relationships

### Data Flow
```
employees (employee_id) 
    ↓
├── user_accounts (employee_id) → Authentication
├── attendance_records (employee_id) → Daily tracking
├── user_sessions (employee_id) → Session management
├── overtime_requests (employee_id) → Overtime requests
└── payroll_records (employee_id) → Payroll processing

departments (id)
    ↓
└── employees (department_id) → Department assignment
```

### Unique Constraints (Important!)
- `attendance_records`: (employee_id, date) - **One record per employee per day**
- `employees`: (employee_id) - **Unique business identifier**
- `user_accounts`: (employee_id, username) - **Unique login credentials**
- `departments`: (name) - **Unique department names**

## 🛡️ Security & Authentication

### Authentication Flow
1. **Login**: Check `user_accounts` table
2. **Session**: Create `user_sessions` record
3. **Authorization**: Check `role` field
4. **Audit**: Log to `audit_log` table

### Role Hierarchy
- `admin` - Full system access
- `manager` - Department management + attendance oversight
- `employee` - Personal attendance only

### Password Security
- Passwords stored as bcrypt hashes
- JWT tokens hashed in sessions table
- Account lockout after failed attempts

## 📋 Common Status Values

### Employee Status
- `active` - Currently employed
- `inactive` - Temporarily inactive
- `terminated` - No longer employed

### Attendance Status
- `present` - Normal attendance
- `absent` - Not present
- `late` - Late arrival
- `sick` - Sick leave
- `vacation` - Planned time off
- `holiday` - Company holiday

### User Roles
- `admin` - System administrator
- `manager` - Department manager
- `employee` - Regular employee

## 🔧 API Endpoints Quick Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/clock` - Clock in/out
- `GET /api/attendance/status` - Get clock status
- `POST /api/attendance/manual` - Manual entry (admin/manager)
- `PUT /api/attendance/:id` - Update record (admin/manager)
- `DELETE /api/attendance/:id` - Delete record (admin/manager)
- `GET /api/attendance/summary` - Get statistics
- `GET /api/attendance/stats` - Dashboard stats

### Employees
- `GET /api/employees` - Get employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

## 🎯 Development Best Practices

### 1. Database Operations
- Always use parameterized queries
- Leverage indexes for performance
- Use transactions for multi-table operations
- Handle MySQL2 promise format correctly

### 2. Error Handling
- Wrap database operations in try-catch
- Log errors with context
- Return consistent error responses
- Handle connection timeouts

### 3. Data Validation
- Validate input data types
- Check required fields
- Enforce business rules
- Sanitize user input

### 4. Performance
- Use pagination for large result sets
- Optimize queries with proper indexing
- Cache frequently accessed data
- Use connection pooling

## 🚨 Common Pitfalls to Avoid

1. **MySQL2 Promise Format**: Result is direct array, not `[rows, fields]`
2. **Date Handling**: Use MySQL DATE format (YYYY-MM-DD)
3. **Time Handling**: Use TIME format (HH:MM:SS)
4. **Employee ID**: Always use `employee_id` as the business key
5. **Unique Constraints**: Don't create duplicate attendance records
6. **Role Permissions**: Always check user role before operations
7. **Session Management**: Clean up expired sessions regularly

## 📁 File Structure
```
backend/
├── routes/
│   ├── attendance.js        # Attendance API endpoints
│   ├── employees.js         # Employee management
│   ├── auth.js             # Authentication
│   └── dashboard.js        # Dashboard data
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── validation.js       # Input validation
├── database/
│   └── connection.js       # MySQL connection pool
└── utils/
    ├── bcrypt.js           # Password hashing
    └── jwt.js              # JWT token handling

frontend/
├── js/
│   ├── directflow.js       # API communication
│   ├── directflow-auth.js  # Authentication handling
│   └── dashboard.js        # Dashboard logic
├── css/
│   └── styles.css          # Main styles
└── *.html                  # HTML pages
```

## 📞 Quick Debug Commands

```bash
# Check database structure
node get-complete-db-structure.js

# Check current schema
node check-database-structure.js

# Test API endpoints
# Open: test-attendance-crud.html

# Check authentication
# Open: auth-test.html
```

---

**For complete details, see: `API_PROMISE_STRUCTURE_REFERENCE.md`**

This guide serves as your quick reference for developing with the Attendance Management System. Keep it handy for common patterns and troubleshooting!
