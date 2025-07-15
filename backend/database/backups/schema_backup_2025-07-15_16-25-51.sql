-- Database Schema Backup for bricks_attendance
-- Generated on: 2025-07-15T16:25:51.481Z
-- DirectFlow Migration Backup

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- Table structure for `attendance_records`
DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE `attendance_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `hours_worked` decimal(4,2) DEFAULT 0.00,
  `overtime_hours` decimal(4,2) DEFAULT 0.00,
  `status` varchar(20) DEFAULT 'present',
  `notes` text DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_date` (`date`),
  KEY `idx_employee_date` (`employee_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `attendance_records`
INSERT INTO `attendance_records` VALUES
(2, 'EMP002', '2025-07-14 16:00:00', '09:00:00', '18:00:00', '8.00', '0.00', 'present', 'Regular work day', NULL, '2025-07-15 06:11:03', '2025-07-15 14:55:38'),
(3, 'EMP001', '2025-07-13 16:00:00', '08:00:00', '17:30:00', '8.50', '0.00', 'present', 'Overtime', NULL, '2025-07-15 06:11:03', '2025-07-15 14:55:38'),
(4, 'EMP002', '2025-07-13 16:00:00', '09:00:00', '17:00:00', '7.00', '0.00', 'present', 'Left early', NULL, '2025-07-15 06:11:03', '2025-07-15 14:55:38');

-- Table structure for `audit_log`
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_action` (`action`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `departments`
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `manager_id` (`manager_id`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `departments`
INSERT INTO `departments` VALUES
(1, 'Management', 'Executive and administrative management', NULL, NULL, '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(2, 'Operations', 'Daily business operations', NULL, NULL, '2025-07-13 13:21:43', '2025-07-15 11:05:51'),
(3, 'Human Resources', 'Employee relations and recruitment', NULL, NULL, '2025-07-13 13:21:43', '2025-07-15 11:05:51'),
(4, 'Finance', 'Financial operations and accounting', NULL, NULL, '2025-07-13 13:21:43', '2025-07-15 11:05:51'),
(5, 'IT', 'Information technology and systems', NULL, NULL, '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(6, 'Quality Control', 'Quality assurance and control', NULL, NULL, '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(7, 'Production', 'Manufacturing and production', NULL, NULL, '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(8, 'Logistics', 'Warehouse and logistics operations', NULL, NULL, '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(10, 'HR', 'Human Resources Department', NULL, NULL, '2025-07-15 02:10:12', '2025-07-15 02:10:12'),
(13, 'Marketing', 'Marketing and promotions', NULL, NULL, '2025-07-15 02:10:12', '2025-07-15 11:05:51'),
(39, 'Administration', 'Administrative and management functions', NULL, NULL, '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(41, 'Information Technology', 'Technical support and development', NULL, NULL, '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(44, 'Sales', 'Sales and customer relations', NULL, NULL, '2025-07-15 11:05:51', '2025-07-15 11:05:51');

-- Table structure for `employees`
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` varchar(50) NOT NULL,
  `position` varchar(100) NOT NULL,
  `date_hired` date NOT NULL,
  `hourly_rate` decimal(10,2) NOT NULL DEFAULT 15.00,
  `overtime_rate` decimal(3,2) NOT NULL DEFAULT 1.50,
  `status` enum('active','inactive','terminated') NOT NULL DEFAULT 'active',
  `avatar_url` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `employees`
INSERT INTO `employees` VALUES
(6, 'EMP006', 'Erika Bianca Api', 'Erika Bianca', 'Api', 'beri@gmail.com', '289547821341', 'Drawing & Cuteness', 'wuv', '2025-07-13 16:00:00', '15.00', '1.50', 'active', NULL, NULL, NULL, NULL, '2025-07-15 14:47:00', '2025-07-15 14:47:00');

-- Table structure for `overtime_requests`
DROP TABLE IF EXISTS `overtime_requests`;
CREATE TABLE `overtime_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `request_date` date NOT NULL,
  `hours_requested` decimal(4,2) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `approval_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee_date` (`employee_id`,`request_date`),
  KEY `idx_status` (`status`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `overtime_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `overtime_requests_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `payroll_records`
DROP TABLE IF EXISTS `payroll_records`;
CREATE TABLE `payroll_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `pay_period_start` date NOT NULL,
  `pay_period_end` date NOT NULL,
  `regular_hours` decimal(6,2) NOT NULL DEFAULT 0.00,
  `overtime_hours` decimal(6,2) NOT NULL DEFAULT 0.00,
  `regular_pay` decimal(10,2) NOT NULL DEFAULT 0.00,
  `overtime_pay` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gross_pay` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `sss_contribution` decimal(10,2) NOT NULL DEFAULT 0.00,
  `philhealth_contribution` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pagibig_contribution` decimal(10,2) NOT NULL DEFAULT 0.00,
  `other_deductions` decimal(10,2) NOT NULL DEFAULT 0.00,
  `net_pay` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pay_date` date DEFAULT NULL,
  `status` enum('calculated','approved','paid','cancelled') NOT NULL DEFAULT 'calculated',
  `calculated_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee_period` (`employee_id`,`pay_period_start`,`pay_period_end`),
  KEY `idx_pay_date` (`pay_date`),
  KEY `idx_status` (`status`),
  KEY `calculated_by` (`calculated_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `payroll_records_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_records_ibfk_2` FOREIGN KEY (`calculated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payroll_records_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `system_settings`
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `system_settings`
INSERT INTO `system_settings` VALUES
(1, 'company_name', 'Bricks Attendance System', 'Company name', '2025-07-13 13:21:43', '2025-07-15 12:05:02'),
(2, 'working_hours_per_day', '8', 'Standard working hours per day', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(3, 'work_start_time', '09:00', 'Standard work start time', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(4, 'work_end_time', '17:00', 'Standard work end time', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(5, 'overtime_rate_multiplier', '1.5', 'Overtime rate multiplier', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(6, 'minimum_overtime_hours', '1', 'Minimum hours before overtime applies', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(7, 'payroll_frequency', 'biweekly', 'Payroll frequency (weekly, biweekly, monthly)', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(8, 'currency', 'PHP', 'System currency', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(9, 'currency_symbol', '₱', 'Currency symbol', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(10, 'tax_rate', '0.20', 'Default tax rate (20%)', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(11, 'sss_rate', '0.045', 'SSS contribution rate (4.5%)', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(12, 'philhealth_rate', '0.025', 'PhilHealth contribution rate', '2025-07-13 13:21:43', '2025-07-15 11:05:51'),
(13, 'pagibig_rate', '0.02', 'Pag-IBIG contribution rate', '2025-07-13 13:21:43', '2025-07-15 11:05:51'),
(14, 'late_grace_period', '15', 'Grace period for late arrival (minutes)', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(15, 'timezone', 'Asia/Manila', 'System timezone', '2025-07-13 13:21:43', '2025-07-13 13:21:43'),
(16, 'companyName', 'Bricks Company', 'Company name for system branding', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(18, 'dateFormat', 'MM/DD/YYYY', 'Date format used throughout the system', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(19, 'timeFormat', '12', 'Time format (12 or 24 hour)', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(21, 'payPeriod', 'weekly', 'Default pay period frequency', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(22, 'overtimeRate', '1.5', 'Overtime rate multiplier', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(23, 'overtimeThreshold', '40', 'Hours threshold for overtime', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(24, 'clockInGrace', '5', 'Grace period for clock in (minutes)', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(25, 'clockOutGrace', '5', 'Grace period for clock out (minutes)', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(26, 'lunchBreakDuration', '30', 'Default lunch break duration (minutes)', '2025-07-15 02:14:49', '2025-07-15 02:14:49'),
(28, 'company_timezone', 'Asia/Manila', 'System timezone', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(29, 'standard_work_hours', '8', 'Standard work hours per day', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(30, 'late_threshold_minutes', '15', 'Late threshold in minutes', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(31, 'overtime_threshold_hours', '8.5', 'Overtime threshold in hours', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(32, 'sss_contribution_rate', '0.045', 'SSS contribution rate', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(35, 'auto_logout_minutes', '30', 'Auto logout time in minutes', '2025-07-15 11:05:51', '2025-07-15 11:05:51'),
(36, 'backup_enabled', 'true', 'Enable automatic backups', '2025-07-15 11:05:51', '2025-07-15 11:05:51');

-- Table structure for `user_accounts`
DROP TABLE IF EXISTS `user_accounts`;
CREATE TABLE `user_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','manager','employee') DEFAULT 'employee',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `account_locked_until` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `employee_status` enum('active','inactive','terminated') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `user_accounts`
INSERT INTO `user_accounts` VALUES
(1, 'admin', 'admin', '$2b$10$rgItStk80./yO6it1MHMp.L3q3iPzDrR8epPmb2QLQEiRQDUHp1Rm', 'admin', 1, '2025-07-15 15:17:26', 0, NULL, NULL, NULL, '2025-07-15 15:14:20', '2025-07-15 15:17:26', 'Admin', 'User', 'Admin User', 'admin@example.com', NULL, 'IT', 'Administrator', '2023-12-31 16:00:00', 'active');

-- Table structure for `user_sessions`
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) NOT NULL,
  `token_hash` varchar(500) NOT NULL,
  `device_info` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_token_hash` (`token_hash`(255)),
  KEY `idx_expires_active` (`expires_at`,`is_active`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
