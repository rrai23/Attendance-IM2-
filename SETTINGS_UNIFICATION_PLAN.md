# Settings Structure Unification Plan

## Current Issues
- HTML forms use: `section.snake_case` (e.g., `general.company_name`)
- Database stores: `camelCase` (e.g., `companyName`) 
- Complex mapping system needed to translate between formats

## Solution: Standardize on camelCase
**Change HTML form names to match database keys directly**

## Mapping Analysis
Based on current database keys and HTML forms:

### General Section
- `general.company_name` → `companyName` ✅ (already exists)
- `general.address` → `address` ✅ (already exists)  
- `general.phone` → `phone` ✅ (already exists)
- `general.working_hours_start` → `workingHoursStart` ✅ (already exists)
- `general.working_hours_end` → `workingHoursEnd` ✅ (already exists)
- `general.timezone` → `timezone` ✅ (already exists)
- `general.date_format` → `dateFormat` ✅ (already exists)
- `general.time_format` → `timeFormat` ✅ (already exists)
- `general.currency` → `currency` ✅ (already exists)
- `general.language` → `language` ✅ (already exists)

### Payroll Section  
- `payroll.pay_period` → `payPeriod` ✅ (already exists)
- `payroll.payday` → `payday` ✅ (already exists)
- `payroll.startDate` → `startDate` ✅ (already exists)
- `payroll.overtime_rate` → `overtimeRate` ✅ (already exists)
- `payroll.overtime_threshold` → `overtimeThreshold` ✅ (already exists)
- `payroll.rounding_rules` → `roundingRules` ✅ (already exists)
- `payroll.auto_calculate` → `autoCalculate` ✅ (already exists)
- `payroll.auto_approve_regular` → `autoApproveRegular` ✅ (already exists)
- `payroll.require_overtime_approval` → `requireOvertimeApproval` ✅ (already exists)
- `payroll.cutoff_time` → `cutoffTime` ✅ (already exists)

### Attendance Section
- `attendance.clock_in_grace` → `clockInGrace` ✅ (already exists)
- `attendance.clock_out_grace` → `clockOutGrace` ✅ (already exists)
- `attendance.require_location` → `requireLocation` ✅ (already exists)
- `attendance.lunch_break_duration` → `lunchBreakDuration` ✅ (already exists)
- `attendance.short_break_duration` → `shortBreakDuration` ✅ (already exists)
- `attendance.auto_deduct_lunch` → `autoDeductLunch` ✅ (already exists)
- `attendance.auto_clock_out` → `autoClockOut` ✅ (already exists)
- `attendance.auto_clock_out_time` → `autoClockOutTime` ✅ (already exists)
- `attendance.require_notes` → `requireNotes` ✅ (already exists)
- `attendance.tardy_threshold` → `tardyThreshold` ✅ (already exists)
- `attendance.absence_threshold` → `absenceThreshold` ✅ (already exists)
- `attendance.send_tardy_alerts` → `sendTardyAlerts` ✅ (already exists)

### Notifications Section
- `notifications.email_notifications` → `emailNotifications` ✅ (already exists)
- `notifications.smtp_server` → `smtpServer` ✅ (already exists)
- `notifications.smtp_port` → `smtpPort` ✅ (already exists)
- `notifications.from_email` → `fromEmail` ✅ (already exists)
- `notifications.tardy_alerts` → `tardyAlerts` ✅ (already exists)
- `notifications.overtime_alerts` → `overtimeAlerts` ✅ (already exists)
- `notifications.payroll_reminders` → `payrollReminders` ✅ (already exists)
- `notifications.system_updates` → `systemUpdates` ✅ (already exists)
- `notifications.absence_alerts` → `absenceAlerts` ✅ (already exists)

### Security Section
- `security.session_timeout` → `sessionTimeout` ✅ (already exists)
- `security.allow_remember_me` → `allowRememberMe` ✅ (already exists)
- `security.max_login_attempts` → `maxLoginAttempts` ✅ (already exists)
- `security.password_min_length` → `passwordMinLength` ✅ (already exists)
- `security.require_uppercase` → `requireUppercase` ✅ (already exists)
- `security.require_numbers` → `requireNumbers` ✅ (already exists)
- `security.require_special_chars` → `requireSpecialChars` ✅ (already exists)
- `security.require_password_change` → `requirePasswordChange` ✅ (already exists)
- `security.password_change_interval` → `passwordChangeInterval` ✅ (already exists)
- `security.two_factor_auth` → `twoFactorAuth` ✅ (already exists)
- `security.require_2fa_admin` → `require2FAAdmin` ✅ (already exists)
- `security.two_factor_method` → `twoFactorMethod` ✅ (already exists)
- `security.auto_backup` → `autoBackup` ✅ (already exists)
- `security.backup_frequency` → `backupFrequency` ✅ (already exists)

## Implementation Steps
1. Update HTML form names to use camelCase directly
2. Remove mapping middleman from backend
3. Remove mapping from frontend JavaScript
4. Test all form submissions

## Benefits
- ✅ No mapping translation needed
- ✅ Direct form-to-database alignment
- ✅ Simpler, cleaner code
- ✅ Better performance (no translation overhead)
- ✅ Easier to maintain and debug
