# Bricks Attendance System - Database Setup Guide

This guide will help you set up the complete database for the Bricks Attendance System using XAMPP MySQL.

## Quick Setup (Recommended)

### Option 1: Automated Setup (Windows)
```bash
# Simply run the setup script
setup-xampp.bat
```

### Option 2: Node.js Script (All platforms)
```bash
# Install dependencies first
npm install

# Run the database setup script
node setup-database.js
```

## Prerequisites

### XAMPP Requirements
1. **XAMPP installed** - Download from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. **MySQL service running** - Start MySQL in XAMPP Control Panel
3. **Node.js installed** - Download from [https://nodejs.org/](https://nodejs.org/)

### Before Running Setup
1. Start XAMPP Control Panel
2. Click "Start" for **Apache** service
3. Click "Start" for **MySQL** service
4. Both should show green "Running" status

## What the Setup Script Does

### 1. Database Creation
- Creates `bricks_attendance` database if it doesn't exist
- Sets UTF8MB4 charset for emoji and international character support

### 2. Table Creation
The script creates these tables with proper foreign keys:

- **`user_accounts`** - Primary authentication table
- **`employees`** - Extended employee profile data  
- **`departments`** - Organizational structure
- **`attendance_records`** - Clock in/out and time tracking
- **`user_sessions`** - JWT token management
- **`payroll_records`** - Payroll calculations and history
- **`system_settings`** - Application configuration
- **`audit_log`** - System activity tracking
- **`overtime_requests`** - Overtime approval workflow

### 3. Default Data
- **System settings** for company info, attendance rules, payroll config
- **Default departments** (Admin, HR, IT, Finance, Operations, Sales, Marketing)
- **Admin user** with full access
- **Sample employees** for testing
- **Sample attendance records**

### 4. Configuration
- Creates `.env` file with XAMPP-compatible settings
- Sets up database connection parameters
- Configures JWT and security settings

## Login Credentials

After setup, you can login with:

### Administrator Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator (full access)

### Sample Employee Accounts
All have password: `password123`
- **Username:** `jdoe` (John Doe - IT Developer)
- **Username:** `jsmith` (Jane Smith - HR Specialist)  
- **Username:** `mjohnson` (Mike Johnson - Sales Rep)

## Manual Setup (Advanced)

If you prefer to set up manually:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update database settings:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bricks_attendance
```

### 3. Run Database Setup
```bash
node setup-database.js
```

### 4. Start the Server
```bash
npm start
```

## Troubleshooting

### Common Issues

#### "Connection refused" or "Can't connect to MySQL"
- **Solution:** Make sure XAMPP MySQL service is running
- Check XAMPP Control Panel - MySQL should show green "Running"
- Try restarting XAMPP as Administrator

#### "Database already exists" warning
- **This is normal** - the script safely handles existing databases
- It will create tables only if they don't exist

#### "Port 3306 is busy"
- Another MySQL service might be running
- Stop other MySQL services or change XAMPP MySQL port
- Update `.env` file with the new port number

#### Permission denied errors
- Run XAMPP as Administrator
- Check Windows Firewall settings
- Ensure antivirus isn't blocking XAMPP

#### Node.js not found
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart command prompt after installation
- Verify with: `node --version`

### Verification Steps

After setup, verify everything works:

1. **Check database exists:**
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - Look for `bricks_attendance` database

2. **Check tables created:**
   - Database should contain 9 tables
   - All tables should have data

3. **Test login:**
   - Start server: `npm start`
   - Open: `http://localhost:3000`
   - Login with admin credentials

## Database Schema

### Key Tables Overview

#### user_accounts
Primary authentication table with employee credentials and basic profile.

#### employees  
Extended employee data including payroll info, schedules, and permissions.

#### attendance_records
Time tracking with clock in/out, hours worked, and overtime calculations.

#### payroll_records
Complete payroll processing with Philippine tax deductions (SSS, PhilHealth, Pag-IBIG).

#### system_settings
Configurable application settings organized by category.

### Foreign Key Relationships
- `employees.employee_id` → `user_accounts.employee_id`
- `attendance_records.employee_id` → `user_accounts.employee_id`
- `user_sessions.employee_id` → `user_accounts.employee_id`
- `payroll_records.employee_id` → `user_accounts.employee_id`
- `overtime_requests.employee_id` → `user_accounts.employee_id`

## Development

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
npm run test-db    # Test database connection
node setup-database.js  # Re-run database setup
```

### Adding Sample Data
The setup includes realistic sample data for testing:
- 3 employees across different departments
- Recent attendance records
- Configured system settings
- Default company information

### Resetting Database
To completely reset and recreate:
```bash
# This will drop and recreate everything
node setup-database.js
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify XAMPP MySQL is running
3. Check Node.js and npm are installed
4. Review the error messages carefully

The setup script provides detailed error messages and suggestions for common issues.
