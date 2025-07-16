# Production Setup Guide

## Bricks Attendance System - Production Deployment

This guide provides step-by-step instructions for setting up the Bricks Attendance System in a production environment.

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MySQL** (v8.0 or higher)
3. **NPM packages** installed (`npm install`)

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=attendance_user
DB_PASSWORD=secure_password_here
DB_NAME=bricks_attendance

# Server Configuration
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=https://your-domain.com
```

## Database Setup

### 1. Create Database User (MySQL)

```sql
CREATE USER 'attendance_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON bricks_attendance.* TO 'attendance_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Run Production Setup

```bash
# Install dependencies
npm install

# Run the production setup script
node production-setup.js
```

## Security Checklist

### Before Going Live:

- [ ] Change all default passwords
- [ ] Update JWT_SECRET with a strong, unique key
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Review database user permissions
- [ ] Enable audit logging
- [ ] Configure backup procedures
- [ ] Set up monitoring and alerting

### Default Credentials (CHANGE IMMEDIATELY):

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| john.smith | manager123 | manager |
| jane.doe | employee123 | employee |

## Features Included

### Database Tables Created:
- `departments` - Company departments
- `employees` - Employee master data
- `user_accounts` - Authentication and user management
- `user_sessions` - Session management
- `attendance_records` - Daily attendance tracking
- `payroll_records` - Payroll calculations
- `system_settings` - System configuration
- `audit_log` - Security and change tracking
- `overtime_requests` - Overtime management

### Security Features:
- Bcrypt password hashing (12 rounds)
- JWT token authentication
- Session management
- Failed login attempt tracking
- Account lockout protection
- Password reset functionality
- Audit logging

### Bug Fixes Included:
- ✅ Fixed JOIN condition in authentication query
- ✅ Proper password hashing verification
- ✅ User sessions table creation
- ✅ Data integrity validation
- ✅ Consistent column naming

## API Endpoints

### Authentication:
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh

### Employees:
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance:
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Record attendance
- `PUT /api/attendance/:id` - Update attendance

### Payroll:
- `GET /api/payroll` - Get payroll records
- `POST /api/payroll/calculate` - Calculate payroll

## Maintenance

### Regular Tasks:
- Monitor server logs
- Review audit logs
- Update system settings
- Backup database regularly
- Monitor disk space
- Review user accounts

### Monthly Tasks:
- Review and rotate logs
- Update dependencies
- Security audit
- Performance review

## Troubleshooting

### Common Issues:

1. **Login 500 Error**
   - Check database connection
   - Verify user_accounts and employees tables exist
   - Ensure JOIN query works correctly

2. **Database Connection Failed**
   - Verify MySQL service is running
   - Check .env configuration
   - Confirm database user permissions

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check password hashing
   - Review session table

### Log Locations:
- Setup log: `./setup-log.txt`
- Server logs: Console output
- Database logs: MySQL error log

## Support

For technical support or bug reports, please check:
1. Setup log file
2. Server console output
3. Database error logs
4. Browser console (for frontend issues)

## Version Information

- Production Setup Script: v1.0
- Database Schema: v1.0
- Security Fixes: Applied
- Authentication Fix: Applied (JOIN condition corrected)
