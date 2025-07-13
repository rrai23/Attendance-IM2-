<?php
/**
 * Bricks Attendance System - Main API Endpoint
 * Complete PHP backend for XAMPP/MySQL integration
 * 
 * This file handles all API requests and routes them to appropriate classes
 */

// Include configuration and classes
require_once '../config/database.php';
require_once '../classes/AuthAPI.php';
require_once '../classes/EmployeeAPI.php';
require_once '../classes/AttendanceAPI.php';
require_once '../classes/PayrollAPI.php';

// Set headers for JSON API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Parse the request URL to determine the endpoint
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$basePath = dirname($scriptName);
$endpoint = str_replace($basePath, '', $requestUri);

// Remove query string from endpoint
if (($pos = strpos($endpoint, '?')) !== false) {
    $endpoint = substr($endpoint, 0, $pos);
}

// Clean up endpoint
$endpoint = trim($endpoint, '/');
if (strpos($endpoint, 'index.php') === 0) {
    $endpoint = substr($endpoint, 9);
}
$endpoint = '/' . trim($endpoint, '/');

// Extract query parameters
$queryParams = $_GET;

// Read request body for POST, PUT methods
$requestBody = file_get_contents('php://input');
$requestData = !empty($requestBody) ? json_decode($requestBody, true) : [];

// Initialize API classes
$authAPI = new AuthAPI();
$employeeAPI = new EmployeeAPI();
$attendanceAPI = new AttendanceAPI();
$payrollAPI = new PayrollAPI();

// Define route handlers
try {
    // Authentication routes (no auth required)
    if (preg_match('#^/auth/login$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $authAPI->login(
                $requestData['username'] ?? '',
                $requestData['password'] ?? '',
                $requestData['rememberMe'] ?? false
            );
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/auth/logout$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $authAPI->logout();
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    // Check authentication for protected routes
    elseif (!getCurrentUser()) {
        sendError('Unauthorized - Please login', 401);
    }
    
    // Employee routes
    elseif (preg_match('#^/employees$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $employees = $employeeAPI->getEmployees($queryParams);
            sendSuccess($employees);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $employee = $employeeAPI->addEmployee($requestData);
            sendSuccess($employee, 'Employee created successfully');
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/employees/([a-zA-Z0-9_]+)$#', $endpoint, $matches)) {
        $employeeId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $employee = $employeeAPI->getEmployee($employeeId);
            sendSuccess($employee);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $employee = $employeeAPI->updateEmployee($employeeId, $requestData);
            sendSuccess($employee, 'Employee updated successfully');
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            $result = $employeeAPI->deleteEmployee($employeeId);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/employees/([a-zA-Z0-9_]+)/wage$#', $endpoint, $matches)) {
        $employeeId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $result = $employeeAPI->updateEmployeeWage($employeeId, $requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/employees/performance$#', $endpoint)) {
        $performance = $employeeAPI->getEmployeePerformance($queryParams);
        sendSuccess($performance);
    }
    
    // Attendance routes
    elseif (preg_match('#^/attendance$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $records = $attendanceAPI->getAttendanceRecords($queryParams);
            sendSuccess($records);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $record = $attendanceAPI->addAttendanceRecord($requestData);
            sendSuccess($record, 'Attendance record created successfully');
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/attendance/([a-zA-Z0-9_]+)$#', $endpoint, $matches)) {
        $recordId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $record = $attendanceAPI->getAttendanceRecord($recordId);
            sendSuccess($record);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $record = $attendanceAPI->updateAttendanceRecord($recordId, $requestData);
            sendSuccess($record, 'Attendance record updated successfully');
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            $result = $attendanceAPI->deleteAttendanceRecord($recordId);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/attendance/stats$#', $endpoint)) {
        $stats = $attendanceAPI->getAttendanceStats($queryParams);
        sendSuccess($stats);
    }
    
    elseif (preg_match('#^/attendance/([a-zA-Z0-9_]+)/clock-in$#', $endpoint, $matches)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $employeeId = $matches[1];
            $result = $attendanceAPI->clockIn($employeeId, $requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/attendance/([a-zA-Z0-9_]+)/clock-out$#', $endpoint, $matches)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $employeeId = $matches[1];
            $result = $attendanceAPI->clockOut($employeeId, $requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    // Department routes
    elseif (preg_match('#^/departments$#', $endpoint)) {
        $departments = $employeeAPI->getDepartments();
        sendSuccess($departments);
    }
    
    elseif (preg_match('#^/departments/([a-zA-Z0-9_\s%]+)/employees$#', $endpoint, $matches)) {
        $departmentId = urldecode($matches[1]);
        $employees = $employeeAPI->getEmployeesByDepartment($departmentId);
        sendSuccess($employees);
    }
    
    // Payroll routes
    elseif (preg_match('#^/payroll$#', $endpoint)) {
        $payrollData = $payrollAPI->getPayrollData($queryParams);
        sendSuccess($payrollData);
    }
    
    elseif (preg_match('#^/payroll/calculate$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $payrollAPI->calculatePayroll($requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/payroll/bulk-calculate$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $payrollAPI->bulkCalculatePayroll($requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/payroll/([a-zA-Z0-9_]+)/approve$#', $endpoint, $matches)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $payrollId = $matches[1];
            $result = $payrollAPI->approvePayroll($payrollId);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/payroll/([a-zA-Z0-9_]+)/pay$#', $endpoint, $matches)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $payrollId = $matches[1];
            $result = $payrollAPI->processPayment($payrollId);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/payroll/history$#', $endpoint)) {
        $history = $payrollAPI->getPayrollHistory($queryParams);
        sendSuccess($history);
    }
    
    elseif (preg_match('#^/payroll/nextpayday$#', $endpoint)) {
        $result = $payrollAPI->getNextPayday();
        sendSuccess($result);
    }
    
    elseif (preg_match('#^/payroll/summary$#', $endpoint)) {
        $summary = $payrollAPI->getPayrollSummary($queryParams);
        sendSuccess($summary);
    }
    
    // User management routes
    elseif (preg_match('#^/auth/me$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $user = $authAPI->getCurrentUser();
            sendSuccess($user);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/auth/change-password$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $authAPI->changePassword(
                $requestData['currentPassword'] ?? '',
                $requestData['newPassword'] ?? ''
            );
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/auth/reset-password$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $authAPI->resetPassword(
                $requestData['employeeId'] ?? '',
                $requestData['newPassword'] ?? ''
            );
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/auth/sessions$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $sessions = $authAPI->getUserSessions($queryParams['employeeId'] ?? null);
            sendSuccess($sessions);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    elseif (preg_match('#^/auth/cleanup-sessions$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $result = $authAPI->cleanupExpiredSessions();
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    // Settings routes
    elseif (preg_match('#^/settings$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $settings = getSystemSettings();
            sendSuccess($settings);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $result = saveSystemSettings($requestData);
            sendSuccess($result);
        } else {
            sendError('Method not allowed', 405);
        }
    }
    
    // System status route
    elseif (preg_match('#^/system/status$#', $endpoint)) {
        $status = getSystemStatus();
        sendSuccess($status);
    }
    
    // Philippines holidays route (for calendar integration)
    elseif (preg_match('#^/holidays/philippines/(\d{4})$#', $endpoint, $matches)) {
        $year = intval($matches[1]);
        $holidays = getPhilippineHolidays($year);
        sendSuccess($holidays);
    }
    
    // 404 Not Found
    else {
        sendError('Endpoint not found: ' . $endpoint, 404);
    }
    
} catch (Exception $e) {
    if (DEBUG_MODE) {
        sendError('Server Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), 500);
    } else {
        sendError('Internal server error', 500);
    }
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
}

/**
 * Helper Functions for Settings and System Status
 */

function getSystemSettings() {
    try {
        $db = getDatabase();
        $stmt = $db->query("SELECT setting_key, setting_value FROM system_settings");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Format settings into expected structure
        return [
            'company' => [
                'name' => $settings['company_name'] ?? 'Bricks Company',
                'workingHours' => intval($settings['working_hours_per_day'] ?? 8),
                'startTime' => $settings['work_start_time'] ?? '09:00',
                'endTime' => $settings['work_end_time'] ?? '17:00'
            ],
            'payroll' => [
                'standardWage' => floatval($settings['standard_wage'] ?? 15.00),
                'overtimeRate' => floatval($settings['overtime_rate_multiplier'] ?? 1.5),
                'minOvertimeHours' => floatval($settings['minimum_overtime_hours'] ?? 1),
                'frequency' => $settings['payroll_frequency'] ?? 'biweekly',
                'currency' => $settings['currency'] ?? 'PHP',
                'currencySymbol' => $settings['currency_symbol'] ?? '₱',
                'taxRate' => floatval($settings['tax_rate'] ?? 0.20)
            ],
            'preferences' => [
                'theme' => $settings['theme'] ?? 'auto',
                'dateFormat' => $settings['date_format'] ?? 'YYYY-MM-DD',
                'timeFormat' => $settings['time_format'] ?? '24',
                'timezone' => $settings['timezone'] ?? 'Asia/Manila'
            ],
            'departments' => getDepartmentsList(),
            'lastUpdated' => date('c')
        ];
    } catch (Exception $e) {
        throw new Exception("Failed to get system settings: " . $e->getMessage());
    }
}

function saveSystemSettings($data) {
    try {
        if (!hasPermission('admin')) {
            throw new Exception("Unauthorized: Admin access required");
        }
        
        $db = getDatabase();
        $db->beginTransaction();
        
        // Save company settings
        if (isset($data['company'])) {
            foreach ($data['company'] as $key => $value) {
                $settingKey = 'company_' . $key;
                if ($key === 'workingHours') $settingKey = 'working_hours_per_day';
                elseif ($key === 'startTime') $settingKey = 'work_start_time';
                elseif ($key === 'endTime') $settingKey = 'work_end_time';
                
                setSystemSetting($settingKey, $value);
            }
        }
        
        // Save payroll settings
        if (isset($data['payroll'])) {
            foreach ($data['payroll'] as $key => $value) {
                $settingKey = $key === 'standardWage' ? 'standard_wage' : 
                             ($key === 'overtimeRate' ? 'overtime_rate_multiplier' :
                             ($key === 'minOvertimeHours' ? 'minimum_overtime_hours' :
                             ($key === 'frequency' ? 'payroll_frequency' :
                             ($key === 'currencySymbol' ? 'currency_symbol' :
                             ($key === 'taxRate' ? 'tax_rate' : $key)))));
                
                setSystemSetting($settingKey, $value);
            }
        }
        
        // Save preference settings
        if (isset($data['preferences'])) {
            foreach ($data['preferences'] as $key => $value) {
                $settingKey = $key === 'dateFormat' ? 'date_format' :
                             ($key === 'timeFormat' ? 'time_format' : $key);
                setSystemSetting($settingKey, $value);
            }
        }
        
        $db->commit();
        
        // Log audit
        logAudit(getCurrentUser()['sub'], 'UPDATE_SETTINGS', 'system_settings', null, null, $data);
        
        return getSystemSettings();
    } catch (Exception $e) {
        $db->rollback();
        throw new Exception("Failed to save settings: " . $e->getMessage());
    }
}

function getDepartmentsList() {
    try {
        $db = getDatabase();
        $stmt = $db->query("SELECT name FROM departments ORDER BY name");
        return array_column($stmt->fetchAll(), 'name');
    } catch (Exception $e) {
        return ['Management', 'Operations', 'Human Resources', 'Finance', 'IT'];
    }
}

function getSystemStatus() {
    try {
        $db = getDatabase();
        
        // Database status
        $dbStatus = 'connected';
        try {
            $db->query("SELECT 1");
        } catch (Exception $e) {
            $dbStatus = 'error';
        }
        
        // Get some basic statistics
        $employeeCount = $db->query("SELECT COUNT(*) FROM employees WHERE status = 'active'")->fetchColumn();
        $attendanceToday = $db->query("SELECT COUNT(*) FROM attendance_records WHERE record_date = CURDATE()")->fetchColumn();
        
        return [
            'server' => [
                'status' => 'online',
                'uptime' => '99.9%',
                'lastRestart' => date('c', strtotime('-1 day')),
                'phpVersion' => PHP_VERSION,
                'timezone' => date_default_timezone_get()
            ],
            'database' => [
                'status' => $dbStatus,
                'size' => '2.5 GB', // Placeholder
                'lastBackup' => date('c', strtotime('-1 hour'))
            ],
            'backup' => [
                'status' => 'active',
                'lastBackup' => date('c', strtotime('-1 hour')),
                'nextBackup' => date('c', strtotime('+1 hour'))
            ],
            'users' => [
                'total' => intval($employeeCount),
                'active' => intval($employeeCount),
                'online' => 1 // Placeholder
            ],
            'statistics' => [
                'totalEmployees' => intval($employeeCount),
                'attendanceToday' => intval($attendanceToday),
                'systemLoad' => sys_getloadavg()[0] ?? 0.1
            ],
            'version' => '2.0.0',
            'lastUpdated' => date('c')
        ];
    } catch (Exception $e) {
        throw new Exception("Failed to get system status: " . $e->getMessage());
    }
}

function getPhilippineHolidays($year) {
    // This is a basic implementation. In production, you might want to use a more comprehensive holiday API
    $holidays = [
        "$year-01-01" => "New Year's Day",
        "$year-04-09" => "Araw ng Kagitingan",
        "$year-05-01" => "Labor Day",
        "$year-06-12" => "Independence Day",
        "$year-08-29" => "National Heroes Day",
        "$year-11-30" => "Bonifacio Day",
        "$year-12-25" => "Christmas Day",
        "$year-12-30" => "Rizal Day"
    ];
    
    // Add some variable holidays (simplified)
    if ($year == 2025) {
        $holidays["$year-04-17"] = "Maundy Thursday";
        $holidays["$year-04-18"] = "Good Friday";
        $holidays["$year-04-19"] = "Black Saturday";
        $holidays["$year-04-20"] = "Easter Sunday";
    }
    
    return $holidays;
}

/**
 * Helper Functions
 */

/**
 * Handle user login
 */
function handleAuthLogin($data) {
    // Validate required fields
    if (!isset($data['username']) || !isset($data['password'])) {
        respondWithError('Username and password are required', 400);
        return;
    }
    
    // In a real implementation, you would:
    // 1. Sanitize inputs
    // 2. Check username/password against database
    // 3. Generate a proper JWT token with expiration
    
    // Mock implementation
    if ($data['username'] === 'admin' && $data['password'] === 'admin123') {
        // Create a simple token (in a real app, this would be a proper JWT)
        $token = base64_encode(json_encode([
            'sub' => 'emp_001', 
            'name' => 'Administrator',
            'role' => 'admin',
            'exp' => time() + 3600 // 1 hour expiration
        ]));
        
        respondWithData([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => 'emp_001',
                'fullName' => 'Administrator',
                'role' => 'admin',
                'email' => 'admin@bricks.com'
            ]
        ]);
    } else {
        respondWithError('Invalid username or password', 401);
    }
}

/**
 * Verify authentication token
 */
function verifyAuthToken($token) {
    // In a real implementation, you would:
    // 1. Decode and verify the JWT token
    // 2. Check if it's expired
    // 3. Validate the signature
    
    // Mock implementation
    if (empty($token)) {
        return false;
    }
    
    try {
        $decoded = json_decode(base64_decode($token), true);
        
        // Check expiration
        if (!isset($decoded['exp']) || $decoded['exp'] < time()) {
            return false;
        }
        
        return true;
    } catch (Exception $e) {
        return false;
    }
}
