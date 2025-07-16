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

### 2. Employee API (`/api/employees`)

#### Database Query Response
```javascript
// Raw result from db.execute() - Array of employee records
[
  {
    id: 1,
    employee_id: 'admin_001',
    username: 'admin',
    full_name: 'System Administrator',
    email: 'admin@brickscompany.com',
    department: 'ADMIN',
    position: 'System Administrator',
    employee_status: 'active',
    hire_date: '2025-07-17T00:00:00.000Z',
    // ... other fields
  }
  // ... more employee records
]
```

## Database Schema Key Points

### Field Name Mapping
- **Database Field**: `total_hours` (in attendance_records table)
- **API Alias**: `hours_worked` (used in SELECT query)
- **Frontend Fields**: Both `hours` and `hoursWorked` for compatibility

### Critical Database Fields
```sql
-- attendance_records table
ar.total_hours as hours_worked  -- NOT hours_worked in database!
ar.overtime_hours
ar.time_in
ar.time_out
ar.break_start
ar.break_end
ar.status
ar.notes

-- employees table (via JOIN)
e.full_name as employee_name
e.employee_id as employee_code
e.department
e.position
```

## Authentication Flow

### JWT Token Structure
```javascript
{
  employee_id: 'admin_001',
  username: 'admin',
  role: 'admin',
  iat: 1752694419,
  exp: 1752780819
}
```

### Session Validation
- **Current Status**: Temporarily skipped (using JWT only)
- **Session Check**: Returns undefined but auth continues with JWT validation
- **Token Storage**: localStorage with DirectFlow authentication system

## Common Debugging Patterns

### 1. Database Result Inspection
```javascript
console.log('🔍 Raw result:', result);
console.log('🔍 Result type:', typeof result);
console.log('🔍 Result is array:', Array.isArray(result));
console.log('🔍 Result length:', result.length);
```

### 2. Record Validation
```javascript
if (records && records.length > 0) {
    console.log('🔍 First record:', records[0]);
    console.log('🔍 Last record:', records[records.length - 1]);
}
```

### 3. API Response Validation
```javascript
// Frontend response checking
console.log('Response type:', typeof response);
console.log('Response structure:', response);
console.log('Data array:', response.data);
console.log('Data length:', response.data?.length);
```

## Historical Issues Fixed

### Issue 1: Data Extraction Error
- **Problem**: Used `result[0]` expecting `[rows, fields]` format
- **Solution**: Use `result` directly as it's already the records array
- **Impact**: Frontend received empty arrays instead of attendance data

### Issue 2: Field Name Mismatch
- **Problem**: Code referenced `hours_worked` but database has `total_hours`
- **Solution**: Use `total_hours as hours_worked` in SQL query
- **Impact**: Undefined values in hours fields

### Issue 3: Frontend Data Processing
- **Problem**: Frontend couldn't process attendance records
- **Solution**: Proper data transformation in backend before sending to frontend
- **Impact**: UI showed no attendance data despite successful API calls

## Current System Status
- ✅ Database: 176 attendance records
- ✅ Authentication: JWT working correctly
- ✅ Employee API: Returns employee data successfully
- ✅ Attendance API: Returns 50 records with proper field mapping
- ✅ Frontend: Both employee and attendance data loading
- ✅ Data Sync: Frontend-backend handshaking working

## Development Notes
- Always verify database field names before coding
- MySQL2 promise format varies by connection type
- Use extensive logging during development to understand data flow
- Frontend expects consistent field naming conventions
- Browser caching (304 responses) indicates successful API calls
