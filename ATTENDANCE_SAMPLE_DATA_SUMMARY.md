# Attendance Records Sample Data Injection - Summary

## Table Structure Analysis

The `attendance_records` table contains the following fields:
- `id` (int, auto-increment, primary key)
- `employee_id` (varchar(50), foreign key)
- `date` (date, required)
- `time_in` (time, nullable)
- `time_out` (time, nullable)
- `break_start` (time, nullable)
- `break_end` (time, nullable)
- `total_hours` (decimal(5,2), default 0.00)
- `overtime_hours` (decimal(5,2), default 0.00)
- `status` (enum: 'present','absent','late','half_day','sick','vacation','holiday')
- `notes` (text, nullable)
- `created_at` (timestamp, auto-generated)
- `updated_at` (timestamp, auto-updated)

## Sample Data Injected

### Summary Statistics:
- **Total Records**: 176 attendance records
- **Date Range**: June 17, 2025 to July 16, 2025 (30 days, excluding weekends)
- **Unique Dates**: 22 working days
- **Employees**: 8 employees from various departments

### Status Distribution:
- **Present**: 139 records (79%)
- **Absent**: 18 records (10%)
- **Sick**: 9 records (5%)
- **Half Day**: 6 records (3%)
- **Vacation**: 4 records (2%)

### Employee Coverage:
All 8 employees have consistent attendance records:
- System Administrator (admin_001) - ADMIN: 22 records, avg 7.54 hours
- John Smith (john.smith) - HR: 22 records, avg 7.13 hours
- Jane Doe (jane.doe) - IT: 22 records, avg 6.67 hours
- John Doe (EMP001) - IT: 22 records, avg 7.56 hours
- Jane Smith (EMP002) - HR: 22 records, avg 7.81 hours
- Mike Johnson (EMP003) - Finance: 22 records, avg 7.50 hours
- Sarah Wilson (EMP004) - Marketing: 22 records, avg 7.88 hours
- David Brown (EMP005) - IT: 22 records, avg 7.15 hours

## Data Characteristics

### Realistic Time Patterns:
- **Clock In Times**: Random between 8:00 AM - 9:00 AM
- **Clock Out Times**: Random between 5:00 PM - 6:00 PM
- **Break Times**: 30-60 minute lunch breaks around 12:00 PM - 1:00 PM
- **Working Hours**: Typically 7-9 hours per day
- **Overtime Calculation**: Hours beyond 8 hours marked as overtime

### Status Logic:
- **Present**: Regular attendance with full time tracking
- **Late**: When clock-in time is after 9:00 AM
- **Absent**: No time records, 0 hours worked
- **Sick/Vacation/Half Day**: Special statuses with appropriate time records
- **Random Distribution**: 90% attendance rate with realistic status variations

### Data Integrity:
- **Consistent Records**: All present employees have proper time_in/time_out
- **Absent Records**: Properly marked with NULL times and 0 hours
- **Overtime Calculation**: Automatically calculated based on hours worked
- **Realistic Notes**: Context-appropriate notes for each status type

## Files Created:
1. `analyze-attendance-table.js` - Table structure analysis
2. `inject-sample-attendance.js` - Main data injection script
3. `verify-attendance-data.js` - Data verification and statistics
4. `test-employee-query.js` - Database query testing

## Usage:
The injected data can now be used for:
- Testing attendance tracking features
- Dashboard statistics and analytics
- Report generation
- API endpoint testing
- Employee management functionality

The data follows realistic patterns and business rules, making it suitable for comprehensive system testing and demonstration purposes.
