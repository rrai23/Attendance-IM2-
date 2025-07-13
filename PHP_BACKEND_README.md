# Bricks Attendance System - PHP Backend

Complete PHP backend implementation for the Bricks Attendance System, designed for XAMPP/MySQL deployment.

## Features

- **Complete Database Schema**: MySQL database with proper relationships and indexes
- **Authentication System**: JWT-based authentication with session management
- **Employee Management**: Full CRUD operations for employee data
- **Attendance Tracking**: Clock in/out, attendance records, and statistics
- **Payroll System**: Automated payroll calculation and processing
- **RESTful API**: Clean API endpoints for all frontend interactions
- **Security**: Input validation, SQL injection prevention, and audit logging

## Database Structure

### Tables Created:
- `employees` - Employee master data
- `attendance_records` - Daily attendance tracking
- `payroll_records` - Payroll calculations and payments
- `overtime_requests` - Overtime request management
- `departments` - Department management
- `system_settings` - Application configuration
- `user_sessions` - User session tracking
- `audit_log` - System activity logging

## Installation Instructions

### 1. XAMPP Setup
1. Install XAMPP (Apache + MySQL + PHP)
2. Start Apache and MySQL services
3. Copy the project files to `htdocs/attendance-system/`

### 2. Database Setup
1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Create a new database: `attendance_system`
3. Import the database schema:
   ```sql
   -- Run the contents of database/schema.sql
   ```

### 3. Configuration
1. Update database connection in `config/database.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'attendance_system');
   define('DB_USER', 'root');
   define('DB_PASS', ''); // Default XAMPP password is empty
   ```

### 4. File Permissions
Ensure the following directories are writable:
- `logs/` (if logging to files)
- `uploads/` (if file uploads are implemented)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/{id}` - Get specific employee
- `POST /api/employees` - Create new employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee
- `PUT /api/employees/{id}/wage` - Update employee wage

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/{id}` - Update attendance record
- `DELETE /api/attendance/{id}` - Delete attendance record
- `POST /api/attendance/{employeeId}/clock-in` - Clock in employee
- `POST /api/attendance/{employeeId}/clock-out` - Clock out employee
- `GET /api/attendance/stats` - Get attendance statistics

### Payroll
- `GET /api/payroll` - Get payroll records
- `POST /api/payroll/calculate` - Calculate payroll
- `POST /api/payroll/bulk-calculate` - Bulk calculate payroll
- `POST /api/payroll/{id}/approve` - Approve payroll
- `POST /api/payroll/{id}/pay` - Process payment
- `GET /api/payroll/history` - Get payroll history
- `GET /api/payroll/nextpayday` - Get next payday info
- `GET /api/payroll/summary` - Get payroll summary

### System
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings
- `GET /api/system/status` - Get system status
- `GET /api/departments` - Get departments
- `GET /api/holidays/philippines/{year}` - Get Philippine holidays

## Default Users

The system comes with sample user accounts:

**Admin User:**
- Username: `admin`
- Password: `admin123`
- Role: Administrator

**Employee User:**
- Username: `employee`
- Password: `employee123`
- Role: Employee

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: PHP password_hash() with bcrypt
3. **SQL Injection Prevention**: PDO prepared statements
4. **Input Validation**: Server-side validation for all inputs
5. **Session Management**: Secure session handling with expiration
6. **Audit Logging**: Complete activity logging for security

## API Usage Examples

### Login Request
```javascript
fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
    })
})
```

### Get Employees (with authentication)
```javascript
fetch('/api/employees', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
})
```

### Clock In Employee
```javascript
fetch('/api/attendance/emp_001/clock-in', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
        location: 'Office',
        notes: 'On time'
    })
})
```

## Error Handling

The API returns standardized error responses:

```json
{
    "success": false,
    "message": "Error description",
    "error": "ERROR_CODE",
    "code": 400
}
```

## Configuration Options

### System Settings (via API or database)
- Company information (name, working hours)
- Payroll settings (rates, frequency, currency)
- User preferences (theme, date format, timezone)
- Department management

### Environment Configuration
- Debug mode (`DEBUG_MODE`)
- JWT secret key (`JWT_SECRET`)
- Database connection settings
- Timezone settings

## File Structure

```
/attendance-system/
├── api/
│   └── index.php          # Main API router
├── classes/
│   ├── AuthAPI.php        # Authentication handling
│   ├── EmployeeAPI.php    # Employee management
│   ├── AttendanceAPI.php  # Attendance tracking
│   └── PayrollAPI.php     # Payroll processing
├── config/
│   └── database.php       # Database configuration
├── database/
│   └── schema.sql         # Database schema
└── README.md              # This file
```

## Frontend Integration

The JavaScript frontend files are already configured to work with this API:
- Authentication tokens are automatically handled
- All API calls use the correct endpoints
- Error handling is implemented
- Real-time updates are supported

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check XAMPP MySQL is running
   - Verify database credentials in config/database.php
   - Ensure database exists

2. **API Returns 404**
   - Check .htaccess file for URL rewriting
   - Ensure mod_rewrite is enabled in Apache
   - Verify file paths are correct

3. **Authentication Errors**
   - Check JWT_SECRET is properly set
   - Verify token is being sent in Authorization header
   - Check user credentials in database

4. **Permission Denied**
   - Ensure proper file permissions
   - Check user roles in database
   - Verify API endpoint permissions

## Development

### Adding New Endpoints:
1. Add route handler in `api/index.php`
2. Implement method in appropriate API class
3. Update this documentation

### Database Changes:
1. Update `database/schema.sql`
2. Create migration script if needed
3. Update API classes if schema changes affect them

## Production Deployment

For production deployment:
1. Change database credentials
2. Set `DEBUG_MODE = false`
3. Use strong JWT secret key
4. Enable HTTPS
5. Implement proper error logging
6. Set up database backups
7. Configure proper file permissions

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Verify database structure
4. Test API endpoints individually

## Version Information

- PHP Version: 7.4+
- MySQL Version: 5.7+
- Framework: Vanilla PHP with PDO
- Authentication: JWT
- API Style: RESTful
