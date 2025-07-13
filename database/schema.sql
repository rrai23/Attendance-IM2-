-- Bricks Attendance System Database Schema
-- For MySQL/MariaDB (XAMPP Compatible)
-- Created: July 2025

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database
CREATE DATABASE IF NOT EXISTS `bricks_attendance` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bricks_attendance`;

-- --------------------------------------------------------
-- Table structure for table `employees`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','employee','manager') NOT NULL DEFAULT 'employee',
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
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `attendance_records`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE `attendance_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `record_date` date NOT NULL,
  `clock_in` time DEFAULT NULL,
  `clock_out` time DEFAULT NULL,
  `break_start` time DEFAULT NULL,
  `break_end` time DEFAULT NULL,
  `hours_worked` decimal(4,2) DEFAULT 0.00,
  `overtime_hours` decimal(4,2) DEFAULT 0.00,
  `status` enum('present','absent','late','half_day','sick','vacation','holiday') NOT NULL DEFAULT 'present',
  `notes` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_date` (`employee_id`, `record_date`),
  KEY `idx_date` (`record_date`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `payroll_records`
-- --------------------------------------------------------

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
  KEY `idx_employee_period` (`employee_id`, `pay_period_start`, `pay_period_end`),
  KEY `idx_pay_date` (`pay_date`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`calculated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `overtime_requests`
-- --------------------------------------------------------

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
  KEY `idx_employee_date` (`employee_id`, `request_date`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `departments`
-- --------------------------------------------------------

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
  FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `system_settings`
-- --------------------------------------------------------

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `user_sessions`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_employee_token` (`employee_id`, `session_token`),
  KEY `idx_expires` (`expires_at`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `audit_log`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_action` (`action`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Insert default departments
-- --------------------------------------------------------

INSERT INTO `departments` (`name`, `description`) VALUES
('Management', 'Executive and administrative management'),
('Operations', 'Daily operations and production'),
('Human Resources', 'HR and employee relations'),
('Finance', 'Financial management and accounting'),
('IT', 'Information technology and systems'),
('Quality Control', 'Quality assurance and control'),
('Production', 'Manufacturing and production'),
('Logistics', 'Warehouse and logistics operations');

-- --------------------------------------------------------
-- Insert default system settings
-- --------------------------------------------------------

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('company_name', 'Bricks Company', 'Company name'),
('working_hours_per_day', '8', 'Standard working hours per day'),
('work_start_time', '09:00', 'Standard work start time'),
('work_end_time', '17:00', 'Standard work end time'),
('overtime_rate_multiplier', '1.5', 'Overtime rate multiplier'),
('minimum_overtime_hours', '1', 'Minimum hours before overtime applies'),
('payroll_frequency', 'biweekly', 'Payroll frequency (weekly, biweekly, monthly)'),
('currency', 'PHP', 'System currency'),
('currency_symbol', '₱', 'Currency symbol'),
('tax_rate', '0.20', 'Default tax rate (20%)'),
('sss_rate', '0.045', 'SSS contribution rate (4.5%)'),
('philhealth_rate', '0.025', 'PhilHealth contribution rate (2.5%)'),
('pagibig_rate', '0.02', 'Pag-IBIG contribution rate (2%)'),
('late_grace_period', '15', 'Grace period for late arrival (minutes)'),
('timezone', 'Asia/Manila', 'System timezone');

-- --------------------------------------------------------
-- Insert default admin user
-- --------------------------------------------------------

INSERT INTO `employees` (
  `employee_code`, `username`, `password_hash`, `role`, `full_name`, 
  `first_name`, `last_name`, `email`, `department`, `position`, 
  `date_hired`, `hourly_rate`, `status`
) VALUES (
  'emp_001', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'admin', 'System Administrator', 'System', 'Administrator', 
  'admin@bricks.com', 'Management', 'System Administrator', 
  '2024-01-01', 25.00, 'active'
);

-- --------------------------------------------------------
-- Insert sample employees
-- --------------------------------------------------------

INSERT INTO `employees` (
  `employee_code`, `username`, `password_hash`, `role`, `full_name`, 
  `first_name`, `last_name`, `email`, `phone`, `department`, `position`, 
  `date_hired`, `hourly_rate`, `status`
) VALUES 
('emp_002', 'john.smith', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 'John Smith', 'John', 'Smith', 'john.smith@bricks.com', '+63-912-345-6789', 'Operations', 'Senior Operator', '2023-03-01', 18.50, 'active'),
('emp_003', 'jane.doe', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 'Jane Doe', 'Jane', 'Doe', 'jane.doe@bricks.com', '+63-912-345-6790', 'Quality Control', 'QC Specialist', '2023-05-15', 20.00, 'active'),
('emp_004', 'mike.johnson', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 'Mike Johnson', 'Mike', 'Johnson', 'mike.johnson@bricks.com', '+63-912-345-6791', 'Production', 'Production Worker', '2023-07-01', 16.00, 'active'),
('emp_005', 'sarah.wilson', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 'Sarah Wilson', 'Sarah', 'Wilson', 'sarah.wilson@bricks.com', '+63-912-345-6792', 'Logistics', 'Warehouse Coordinator', '2023-08-15', 19.00, 'active'),
('emp_006', 'lisa.crane', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 'Lisa Crane', 'Lisa', 'Crane', 'lisa.crane@bricks.com', '+63-912-345-6793', 'Operations', 'Crane Operator', '2024-05-01', 24.00, 'active');

-- --------------------------------------------------------
-- Insert sample attendance records
-- --------------------------------------------------------

INSERT INTO `attendance_records` (
  `employee_id`, `record_date`, `clock_in`, `clock_out`, 
  `break_start`, `break_end`, `hours_worked`, `overtime_hours`, 
  `status`, `notes`
) VALUES 
(2, '2025-07-10', '08:00:00', '17:00:00', '12:00:00', '13:00:00', 8.00, 0.00, 'present', 'Regular shift'),
(3, '2025-07-10', '08:15:00', '17:15:00', '12:00:00', '13:00:00', 8.00, 0.00, 'late', 'Traffic delay'),
(4, '2025-07-10', '08:00:00', '19:00:00', '12:00:00', '13:00:00', 10.00, 2.00, 'present', 'Overtime approved'),
(5, '2025-07-10', '07:30:00', '16:30:00', '12:00:00', '13:00:00', 8.00, 0.00, 'present', 'Early start'),
(2, '2025-07-09', '08:00:00', '17:00:00', '12:00:00', '13:00:00', 8.00, 0.00, 'present', 'Regular shift'),
(3, '2025-07-09', '08:00:00', '17:00:00', '12:00:00', '13:00:00', 8.00, 0.00, 'present', 'Regular shift'),
(4, '2025-07-09', NULL, NULL, NULL, NULL, 0.00, 0.00, 'absent', 'Sick leave'),
(5, '2025-07-09', '08:00:00', '18:30:00', '12:00:00', '13:00:00', 9.50, 1.50, 'present', 'Project deadline');

-- --------------------------------------------------------
-- Insert sample payroll records
-- --------------------------------------------------------

INSERT INTO `payroll_records` (
  `employee_id`, `pay_period_start`, `pay_period_end`, `regular_hours`, 
  `overtime_hours`, `regular_pay`, `overtime_pay`, `gross_pay`, 
  `tax_amount`, `sss_contribution`, `philhealth_contribution`, 
  `pagibig_contribution`, `net_pay`, `pay_date`, `status`
) VALUES 
(2, '2025-06-16', '2025-06-30', 112.00, 4.00, 2072.00, 111.00, 2183.00, 436.60, 98.24, 54.58, 43.66, 1550.92, '2025-07-05', 'paid'),
(3, '2025-06-16', '2025-06-30', 120.00, 0.00, 2400.00, 0.00, 2400.00, 480.00, 108.00, 60.00, 48.00, 1704.00, '2025-07-05', 'paid'),
(4, '2025-06-16', '2025-06-30', 104.00, 8.00, 1664.00, 192.00, 1856.00, 371.20, 83.52, 46.40, 37.12, 1317.76, '2025-07-05', 'paid'),
(5, '2025-06-16', '2025-06-30', 116.00, 6.00, 2204.00, 171.00, 2375.00, 475.00, 106.88, 59.38, 47.50, 1686.24, '2025-07-05', 'paid');

-- --------------------------------------------------------
-- Insert sample overtime requests
-- --------------------------------------------------------

INSERT INTO `overtime_requests` (
  `employee_id`, `request_date`, `hours_requested`, `reason`, 
  `status`, `approved_by`, `approval_date`
) VALUES 
(2, '2025-07-13', 2.5, 'Project deadline approaching', 'approved', 1, '2025-07-13 10:30:00'),
(3, '2025-07-13', 1.5, 'System maintenance required', 'pending', NULL, NULL),
(4, '2025-07-12', 3.0, 'Equipment repair', 'approved', 1, '2025-07-12 14:15:00');

COMMIT;

-- Note: Default password for all users is "password" (hashed with bcrypt)
-- You should change these in production!
