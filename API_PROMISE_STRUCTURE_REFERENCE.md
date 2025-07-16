# API Promise Structure Reference

This document outlines the actual promise structure and API response formats discovered during development and debugging.

## Database Connection Promise Format

### MySQL2 Promise Connection
- **Library**: `mysql2/promise`
- **Connection**: Pool-based connection from `backend/database/connection.js`

### Query Execution Format
```javascript
const result = await db.execute(query, params);
```

**IMPORTANT**: The `db.execute()` method returns the data **directly as an array**, NOT in the typical `[rows, fields]` format that some documentation suggests.

#### Correct Usage
```javascript
const result = await db.execute(query, params);
const records = result; // Direct array of records
```

#### Incorrect Usage (What we initially tried)
```javascript
const result = await db.execute(query, params);
const records = result[0]; // This gets the first record object, not the array
```

## API Response Structures

### 1. Attendance API (`/api/attendance`)

#### Database Query Response
```javascript
// Raw result from db.execute() - Array of 50 records
[
  {
    id: 2,
    employee_id: 'admin_001',
    date: 2025-07-16T00:00:00.000Z,
    time_in: '08:53:00',
    time_out: '17:12:00',
    break_start: '12:27:00',
    break_end: '13:24:00',
    hours_worked: '7.37',        // Field name: total_hours (aliased as hours_worked)
    overtime_hours: '0.00',
    status: 'present',
    notes: 'Regular attendance',
    created_at: 2025-07-17T03:09:32.000Z,
    updated_at: 2025-07-17T03:09:32.000Z,
    employee_name: 'System Administrator',  // From employees table JOIN
    employee_code: 'admin_001',             // From employees table JOIN
    department: 'ADMIN',                    // From employees table JOIN
    position: 'System Administrator'        // From employees table JOIN
  },
  // ... 49 more records
]
```

#### Final API Response Format
```javascript
{
  success: true,
  data: [
    {
      id: 2,
      employeeId: 'admin_001',
      employeeName: 'System Administrator',
      employeeCode: 'admin_001',
      department: 'ADMIN',
      date: '2025-07-16T00:00:00.000Z',
      clockIn: '08:53:00',
      clockOut: '17:12:00',
      timeIn: '08:53:00',
      timeOut: '17:12:00',
      hours: '7.37',
      hoursWorked: '7.37',
      overtimeHours: '0.00',
      status: 'present',
      notes: 'Regular attendance',
      createdAt: '2025-07-17T03:09:32.000Z',
      updatedAt: '2025-07-17T03:09:32.000Z'
    }
    // ... more transformed records
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 50
  }
}
```

### 2. Employees API (`/api/employees`)

#### Database Query Response
```javascript
// Raw result from db.execute() - Array of employees
[
  {
    id: 1,
    employee_id: 'admin_001',
    full_name: 'System Administrator',
    first_name: 'System',
    last_name: 'Administrator',
    email: 'admin@brickscompany.com',
    phone: null,
    department: 'ADMIN',
    position: 'System Administrator',
    manager_id: null,
    hire_date: 2025-07-17T00:00:00.000Z,
    status: 'active',                    // Field name: e.status (not e.employee_status)
    hourly_rate: null,
    overtime_rate: null,
    wage: null,
    avatar: null,
    address: null,
    emergency_contact: null,
    emergency_phone: null,
    work_schedule: null,
    created_at: 2025-07-17T02:34:54.000Z,
    updated_at: 2025-07-17T03:59:38.000Z,
    username: 'admin',
    role: 'admin',
    is_active: 1,
    last_login: 2025-07-17T04:08:19.000Z
  }
]
```

#### API Response Structure
```javascript
{
  "success": true,
  "data": {
    "employees": [/* Array of employee objects */],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### DirectFlow Integration
```javascript
// DirectFlow.getEmployees() method
async getEmployees() {
  const response = await this.makeRequest('/employees');
  const data = await response.json();
  
  // Returns the employees array directly
  if (data.success && data.data && data.data.employees) {
    return data.data.employees;
  }
  return [];
}
```

### 3. Attendance Stats API (`/api/attendance/stats`)

#### Database Query Response
```javascript
// Today's stats query result
const todayStatsResult = await db.execute(query, params);
const todayStats = todayStatsResult[0]; // Get the first (and only) record

// Total employees query result  
const totalEmployeesResult = await db.execute(query, params);
const totalEmployees = totalEmployeesResult[0]; // Get the first (and only) record
```

#### API Response Structure
```javascript
{
  "success": true,
  "data": {
    "todayStats": {
      "date": "2025-07-16",
      "totalPresent": 3,
      "totalAbsent": 2,
      "totalLate": 1,
      "totalEarly": 0,
      "totalOvertime": 0,
      "averageHours": 7.5
    },
    "totalEmployees": {
      "count": 5
    }
  }
}
```

## Attendance Stats Endpoint Fix

### Issue Identified
The `/api/attendance/stats` endpoint was showing incorrect data:
- Dashboard showed 4 present employees
- Attendance page showed 37+ employees
- Total employee count was wrong (3 instead of 8)

### Root Cause
1. **Employee Count Query**: The stats endpoint was only counting employees with user accounts (3) instead of all active employees (8)
2. **Status Mapping**: The query was looking for `status = 'on_leave'` but actual statuses were `'sick'` and `'vacation'`

### Fix Applied
1. **Updated Employee Count Query**:
   ```sql
   -- OLD (incorrect)
   SELECT COUNT(*) as count
   FROM employees e
   JOIN user_accounts ua ON e.employee_id = ua.employee_id
   WHERE ua.is_active = 1 AND e.status = 'active'
   
   -- NEW (correct)
   SELECT COUNT(*) as count
   FROM employees e
   WHERE e.status = 'active'
   ```

2. **Updated Status Mapping**:
   ```sql
   -- OLD (incorrect)
   SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as onLeave
   
   -- NEW (correct)
   SUM(CASE WHEN status IN ('sick', 'vacation', 'on_leave') THEN 1 ELSE 0 END) as onLeave
   ```

### Result
- Dashboard now shows correct statistics
- Attendance rate calculation is accurate
- All status types are properly counted

### API Response Structure
```json
{
  "success": true,
  "data": {
    "present": 4,
    "absent": 2,
    "late": 0,
    "onLeave": 2,
    "total": 8,
    "attendanceRate": "50.0"
  }
}
```

## Complete Database Structure Reference

### Database Overview
- **Database Name**: `bricks_attendance`
- **Total Tables**: 9
- **Total Relationships**: 6
- **Generated**: July 16, 2025

### Database Tables Summary

| Table Name | Rows | Columns | Indexes | Foreign Keys | Purpose |
|------------|------|---------|---------|--------------|---------|
| attendance_records | 176 | 13 | 6 | 1 | Core attendance tracking |
| audit_log | 0 | 10 | 5 | 0 | System audit trail |
| departments | 7 | 8 | 5 | 0 | Department management |
| employees | 8 | 29 | 12 | 1 | Employee master data |
| overtime_requests | 0 | 10 | 4 | 1 | Overtime request management |
| payroll_records | 0 | 15 | 5 | 1 | Payroll processing |
| system_settings | 10 | 8 | 3 | 0 | System configuration |
| user_accounts | 3 | 22 | 8 | 1 | User authentication |
| user_sessions | 23 | 8 | 5 | 1 | Session management |

### Table Relationships (Foreign Keys)
```
attendance_records.employee_id -> employees.employee_id
employees.department_id -> departments.id
overtime_requests.employee_id -> employees.employee_id
payroll_records.employee_id -> employees.employee_id
user_accounts.employee_id -> employees.employee_id
user_sessions.employee_id -> employees.employee_id
```

## Detailed Table Structures

### 1. ATTENDANCE_RECORDS (Primary Table)
**Purpose**: Core attendance tracking with daily records
**Row Count**: 176 records

#### Columns:
```sql
id                  INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id         VARCHAR(50) NOT NULL                           -- FK to employees
date                DATE NOT NULL                                  -- Attendance date
time_in             TIME                                          -- Clock in time
time_out            TIME                                          -- Clock out time
break_start         TIME                                          -- Break start time
break_end           TIME                                          -- Break end time
total_hours         DECIMAL(5,2) DEFAULT 0.00                    -- Total hours worked
overtime_hours      DECIMAL(5,2) DEFAULT 0.00                    -- Overtime hours
status              ENUM('present','absent','late','half_day','sick','vacation','holiday') DEFAULT 'present'
notes               TEXT                                          -- Additional notes
created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### Indexes:
- `PRIMARY`: (id) - UNIQUE
- `unique_employee_date`: (employee_id, date) - UNIQUE - **Prevents duplicate entries**
- `idx_attendance_employee`: (employee_id) - For employee lookups
- `idx_attendance_date`: (date) - For date range queries
- `idx_attendance_status`: (status) - For status filtering

#### Foreign Keys:
- `employee_id` → `employees.employee_id`

### 2. EMPLOYEES (Master Table)
**Purpose**: Employee master data and information
**Row Count**: 8 records

#### Columns:
```sql
id                  INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id         VARCHAR(50) NOT NULL UNIQUE                   -- Business key
username            VARCHAR(100) UNIQUE                           -- Login username
password            VARCHAR(255)                                  -- Hashed password
role                ENUM('admin','manager','employee') DEFAULT 'employee'
full_name           VARCHAR(255) NOT NULL                        -- Display name
first_name          VARCHAR(100)                                 -- First name
last_name           VARCHAR(100)                                 -- Last name
email               VARCHAR(255)                                 -- Email address
phone               VARCHAR(20)                                  -- Phone number
department_id       INT(11)                                      -- FK to departments
department          VARCHAR(100)                                 -- Department name (denormalized)
position            VARCHAR(100)                                 -- Job position
manager_id          VARCHAR(50)                                  -- Manager employee_id
hire_date           DATE                                         -- Hire date
status              ENUM('active','inactive','terminated') DEFAULT 'active'
wage                DECIMAL(10,2) DEFAULT 15.00                  -- Hourly wage
overtime_rate       DECIMAL(4,2) DEFAULT 1.50                   -- Overtime multiplier
salary_type         ENUM('hourly','salary') DEFAULT 'hourly'    -- Pay type
avatar              VARCHAR(500)                                 -- Profile image
address             TEXT                                         -- Home address
emergency_contact   VARCHAR(255)                                 -- Emergency contact
emergency_phone     VARCHAR(20)                                  -- Emergency phone
work_schedule       LONGTEXT                                     -- Work schedule JSON
permissions         LONGTEXT                                     -- Permissions JSON
is_active           TINYINT(1) DEFAULT 1                        -- Active flag
last_login          TIMESTAMP                                    -- Last login time
created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### Key Indexes:
- `PRIMARY`: (id) - UNIQUE
- `employee_id`: (employee_id) - UNIQUE - **Business key**
- `username`: (username) - UNIQUE - **Login key**
- `idx_employee_department`: (department) - For department filtering
- `idx_employee_role`: (role) - For role-based queries
- `idx_employee_status`: (status) - For status filtering

#### Foreign Keys:
- `department_id` → `departments.id`

### 3. USER_ACCOUNTS (Authentication Table)
**Purpose**: User authentication and session management
**Row Count**: 3 records

#### Columns:
```sql
id                      INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id             VARCHAR(50) NOT NULL UNIQUE               -- FK to employees
username                VARCHAR(100) NOT NULL UNIQUE             -- Login username
password_hash           VARCHAR(255) NOT NULL                    -- Bcrypt hash
role                    ENUM('admin','manager','employee') DEFAULT 'employee'
is_active               TINYINT(1) DEFAULT 1                     -- Account active flag
last_login              TIMESTAMP                                -- Last login time
failed_login_attempts   INT(11) DEFAULT 0                        -- Failed login counter
account_locked_until    TIMESTAMP                                -- Account lock expiry
password_reset_token    VARCHAR(255)                             -- Reset token
password_reset_expires  TIMESTAMP                                -- Reset expiry
created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
first_name              VARCHAR(100)                             -- Duplicated from employees
last_name               VARCHAR(100)                             -- Duplicated from employees
full_name               VARCHAR(255)                             -- Duplicated from employees
email                   VARCHAR(255)                             -- Duplicated from employees
phone                   VARCHAR(20)                              -- Duplicated from employees
department              VARCHAR(100)                             -- Duplicated from employees
position                VARCHAR(100)                             -- Duplicated from employees
hire_date               DATE                                     -- Duplicated from employees
employee_status         ENUM('active','inactive','terminated') DEFAULT 'active'
```

#### Key Indexes:
- `PRIMARY`: (id) - UNIQUE
- `employee_id`: (employee_id) - UNIQUE - **Links to employees**
- `username`: (username) - UNIQUE - **Login key**
- `idx_user_role`: (role) - For role filtering
- `idx_user_active`: (is_active) - For active user queries

#### Foreign Keys:
- `employee_id` → `employees.employee_id`

### 4. DEPARTMENTS
**Purpose**: Department structure and management
**Row Count**: 7 records

#### Columns:
```sql
id          INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
name        VARCHAR(100) NOT NULL UNIQUE                     -- Department name
description TEXT                                             -- Department description
manager_id  VARCHAR(50)                                      -- Manager employee_id
budget      DECIMAL(15,2) DEFAULT 0.00                       -- Department budget
is_active   TINYINT(1) DEFAULT 1                            -- Active flag
created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### Sample Data:
- ADMIN (System Administration)
- HR (Human Resources)
- IT (Information Technology)
- FINANCE
- OPERATIONS
- SALES
- MARKETING

### 5. USER_SESSIONS
**Purpose**: JWT token session management
**Row Count**: 23 records

#### Columns:
```sql
id          INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id VARCHAR(50) NOT NULL                            -- FK to employees
token_hash  VARCHAR(500) NOT NULL                           -- JWT token hash
expires_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
is_active   TINYINT(1) DEFAULT 1                           -- Session active flag
created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
user_agent  VARCHAR(500)                                   -- Browser info
ip_address  VARCHAR(45)                                    -- Client IP
```

#### Foreign Keys:
- `employee_id` → `employees.employee_id`

### 6. SYSTEM_SETTINGS
**Purpose**: Application configuration settings
**Row Count**: 10 records

#### Columns:
```sql
id            INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
setting_key   VARCHAR(100) NOT NULL UNIQUE                 -- Setting identifier
setting_value TEXT                                         -- Setting value
setting_type  ENUM('string','number','boolean','json') DEFAULT 'string'
description   TEXT                                         -- Setting description
is_editable   TINYINT(1) DEFAULT 1                        -- Can be edited
created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### 7. OVERTIME_REQUESTS
**Purpose**: Overtime request management
**Row Count**: 0 records (empty table)

#### Columns:
```sql
id               INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id      VARCHAR(50) NOT NULL                      -- FK to employees
request_date     DATE NOT NULL                             -- Overtime date
hours_requested  DECIMAL(5,2) NOT NULL                     -- Hours requested
reason           TEXT                                      -- Reason for overtime
status           ENUM('pending','approved','rejected') DEFAULT 'pending'
approved_by      VARCHAR(50)                               -- Approver employee_id
approved_at      TIMESTAMP                                 -- Approval time
created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### 8. PAYROLL_RECORDS
**Purpose**: Payroll processing and pay period management
**Row Count**: 0 records (empty table)

#### Columns:
```sql
id                INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
employee_id       VARCHAR(50) NOT NULL                     -- FK to employees
pay_period_start  DATE NOT NULL                            -- Pay period start
pay_period_end    DATE NOT NULL                            -- Pay period end
regular_hours     DECIMAL(5,2) DEFAULT 0.00                -- Regular hours
overtime_hours    DECIMAL(5,2) DEFAULT 0.00                -- Overtime hours
regular_pay       DECIMAL(10,2) DEFAULT 0.00               -- Regular pay amount
overtime_pay      DECIMAL(10,2) DEFAULT 0.00               -- Overtime pay amount
gross_pay         DECIMAL(10,2) DEFAULT 0.00               -- Gross pay
deductions        DECIMAL(10,2) DEFAULT 0.00               -- Deductions
net_pay           DECIMAL(10,2) DEFAULT 0.00               -- Net pay
status            ENUM('draft','approved','paid') DEFAULT 'draft'
processed_at      TIMESTAMP                                -- Processing time
created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### 9. AUDIT_LOG
**Purpose**: System audit trail and change tracking
**Row Count**: 0 records (empty table)

#### Columns:
```sql
id          INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
user_id     VARCHAR(50)                                   -- User performing action
action      VARCHAR(100) NOT NULL                         -- Action performed
table_name  VARCHAR(100)                                  -- Table affected
record_id   VARCHAR(100)                                  -- Record ID affected
old_values  LONGTEXT                                      -- Previous values JSON
new_values  LONGTEXT                                      -- New values JSON
ip_address  VARCHAR(45)                                   -- Client IP
user_agent  VARCHAR(500)                                  -- Browser info
created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## Development Guidelines

### 1. Database Query Patterns

#### Attendance Records with Employee Info
```javascript
// Correct JOIN query for attendance with employee details
const records = await db.execute(`
    SELECT 
        ar.id,
        ar.employee_id,
        ar.date,
        ar.time_in,
        ar.time_out,
        ar.break_start,
        ar.break_end,
        ar.total_hours as hours_worked,
        ar.overtime_hours,
        ar.status,
        ar.notes,
        ar.created_at,
        ar.updated_at,
        e.full_name as employee_name,
        e.employee_id as employee_code,
        e.department,
        e.position
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.employee_id
    WHERE ar.date >= ? AND ar.date <= ?
    ORDER BY ar.date DESC, ar.created_at DESC
`, [startDate, endDate]);
```

#### Employee Authentication Query
```javascript
// Get user with authentication data
const user = await db.execute(`
    SELECT 
        ua.id,
        ua.employee_id,
        ua.username,
        ua.password_hash,
        ua.role,
        ua.is_active,
        ua.failed_login_attempts,
        ua.account_locked_until,
        e.full_name,
        e.department,
        e.position
    FROM user_accounts ua
    JOIN employees e ON ua.employee_id = e.employee_id
    WHERE ua.username = ? AND ua.is_active = 1
`, [username]);
```

### 2. Data Transformation Patterns

#### Attendance Record Transformation
```javascript
// Transform database record to frontend format
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

### 3. Key Constraints and Rules

#### Unique Constraints
- `attendance_records`: (employee_id, date) - **One record per employee per day**
- `employees`: (employee_id) - **Unique business identifier**
- `user_accounts`: (employee_id, username) - **Unique login credentials**
- `departments`: (name) - **Unique department names**

#### Data Integrity Rules
1. **Employee ID Consistency**: All tables use `employee_id` as VARCHAR(50) for relationships
2. **Date Handling**: All dates stored in MySQL DATE format (YYYY-MM-DD)
3. **Time Handling**: Time fields stored as TIME format (HH:MM:SS)
4. **Decimal Precision**: Hours and wages use DECIMAL for precise calculations
5. **Status Enums**: Consistent status values across related tables
6. **Soft Deletes**: Use `is_active` flags instead of hard deletes

### 4. Performance Considerations

#### Index Usage
- Always filter by `employee_id` for user-specific queries
- Use date ranges with `idx_attendance_date` for performance
- Department filtering uses `idx_employee_department`
- Role-based queries use `idx_employee_role`

#### Query Optimization
- Use JOINs instead of separate queries for related data
- Limit result sets with pagination
- Use appropriate WHERE clauses to leverage indexes
- Avoid SELECT * in production queries

### 5. Security Guidelines

#### Authentication Flow
1. **Login**: Check `user_accounts` table for credentials
2. **Session**: Create entry in `user_sessions` table
3. **Authorization**: Check role from `user_accounts.role`
4. **Audit**: Log actions in `audit_log` table

#### Data Protection
- Passwords stored as bcrypt hashes in `user_accounts.password_hash`
- JWT tokens hashed in `user_sessions.token_hash`
- Sensitive data encrypted where applicable
- Role-based access control throughout application

## Sample Data Structures

### Employee Record
```javascript
{
    "id": 1,
    "employee_id": "admin_001",
    "username": "admin",
    "role": "admin",
    "full_name": "System Administrator",
    "first_name": "System",
    "last_name": "Administrator",
    "email": "admin@brickscompany.com",
    "department": "ADMIN",
    "position": "System Administrator",
    "hire_date": "2025-07-17",
    "status": "active",
    "wage": "15.00",
    "overtime_rate": "1.50",
    "salary_type": "hourly",
    "is_active": 1,
    "created_at": "2025-07-16T18:34:54.000Z",
    "updated_at": "2025-07-16T18:34:54.000Z"
}
```

### Attendance Record
```javascript
{
    "id": 2,
    "employee_id": "admin_001",
    "date": "2025-07-16",
    "time_in": "08:53:00",
    "time_out": "17:12:00",
    "break_start": "12:27:00",
    "break_end": "13:24:00",
    "total_hours": "7.37",
    "overtime_hours": "0.00",
    "status": "present",
    "notes": "Regular attendance",
    "created_at": "2025-07-16T19:09:32.000Z",
    "updated_at": "2025-07-16T19:09:32.000Z"
}
```

### User Account Record
```javascript
{
    "id": 1,
    "employee_id": "admin_001",
    "username": "admin",
    "password_hash": "$2a$12$csl2YiJvnyBVSRrK0BF1A.35oemRSk58GVlnkXPoX1SvDZ2Tt8Aga",
    "role": "admin",
    "is_active": 1,
    "last_login": "2025-07-16T20:44:35.000Z",
    "failed_login_attempts": 0,
    "full_name": "System Administrator",
    "email": "admin@brickscompany.com",
    "department": "ADMIN",
    "position": "System Administrator",
    "employee_status": "active"
}
```

---

## Quick Reference Summary

### Core Tables for Development
1. **employees** - Master employee data
2. **user_accounts** - Authentication and login
3. **attendance_records** - Daily attendance tracking
4. **departments** - Department structure
5. **user_sessions** - Session management

### Key Relationships
- All user data flows through `employees.employee_id`
- Authentication handled by `user_accounts`
- Daily tracking in `attendance_records`
- Sessions managed in `user_sessions`

### MySQL2 Promise Pattern
```javascript
const result = await db.execute(query, params);
// result is directly the array of records
const records = result; // NOT result[0]
```

### Common Status Values
- **Employee Status**: 'active', 'inactive', 'terminated'
- **Attendance Status**: 'present', 'absent', 'late', 'sick', 'vacation', 'holiday'
- **User Roles**: 'admin', 'manager', 'employee'
- **Request Status**: 'pending', 'approved', 'rejected'

This reference should serve as the definitive guide for database operations and API development in the Attendance Management System.
