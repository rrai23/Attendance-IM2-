<?php
/**
 * PHP Data Service API Endpoints
 * This file provides the API endpoints for the Bricks Attendance System
 * that match the JavaScript API service implementation.
 * 
 * Note: This is a starter template showing the API structure. In a real 
 * implementation, you would need to add proper authentication, validation,
 * database connections, and error handling.
 */

// Set headers for JSON API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Parse the request URL to determine the endpoint
$requestUri = $_SERVER['REQUEST_URI'];
$basePathLength = strlen('/api');
$endpoint = substr($requestUri, $basePathLength);

// Extract query parameters
$queryString = $_SERVER['QUERY_STRING'] ?? '';
parse_str($queryString, $queryParams);

// Read request body for POST, PUT methods
$requestBody = file_get_contents('php://input');
$requestData = !empty($requestBody) ? json_decode($requestBody, true) : [];

// Check for auth token
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
$token = '';

if (!empty($authHeader) && strpos($authHeader, 'Bearer ') === 0) {
    $token = substr($authHeader, 7);
}

// Define route handlers
try {
    // Authentication routes
    if (preg_match('#^/auth/login$#', $endpoint)) {
        handleAuthLogin($requestData);
        exit;
    }
    
    // Verify auth token for protected routes
    if (!verifyAuthToken($token)) {
        respondWithError('Unauthorized', 401);
        exit;
    }
    
    // Employee routes
    if (preg_match('#^/employees$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            getEmployees();
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            addEmployee($requestData);
        } else {
            respondWithError('Method not allowed', 405);
        }
    } 
    elseif (preg_match('#^/employees/([a-zA-Z0-9_]+)$#', $endpoint, $matches)) {
        $employeeId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            getEmployee($employeeId);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            updateEmployee($employeeId, $requestData);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            deleteEmployee($employeeId);
        } else {
            respondWithError('Method not allowed', 405);
        }
    }
    elseif (preg_match('#^/employees/([a-zA-Z0-9_]+)/wage$#', $endpoint, $matches)) {
        $employeeId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            updateEmployeeWage($employeeId, $requestData);
        } else {
            respondWithError('Method not allowed', 405);
        }
    }
    elseif (preg_match('#^/employees/performance$#', $endpoint)) {
        getEmployeePerformance($queryParams);
    }
    
    // Attendance routes
    elseif (preg_match('#^/attendance$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            getAttendanceRecords($queryParams);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            addAttendanceRecord($requestData);
        } else {
            respondWithError('Method not allowed', 405);
        }
    }
    elseif (preg_match('#^/attendance/([a-zA-Z0-9_]+)$#', $endpoint, $matches)) {
        $recordId = $matches[1];
        
        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            updateAttendanceRecord($recordId, $requestData);
        } else {
            respondWithError('Method not allowed', 405);
        }
    }
    elseif (preg_match('#^/attendance/stats$#', $endpoint)) {
        getAttendanceStats($queryParams);
    }
    
    // Department routes
    elseif (preg_match('#^/departments$#', $endpoint)) {
        getDepartments();
    }
    elseif (preg_match('#^/departments/([a-zA-Z0-9_]+)/employees$#', $endpoint, $matches)) {
        $departmentId = $matches[1];
        getEmployeesByDepartment($departmentId);
    }
    
    // Payroll routes
    elseif (preg_match('#^/payroll$#', $endpoint)) {
        getPayrollData($queryParams);
    }
    elseif (preg_match('#^/payroll/calculate$#', $endpoint)) {
        calculatePayroll($requestData);
    }
    elseif (preg_match('#^/payroll/history$#', $endpoint)) {
        getPayrollHistory($queryParams);
    }
    elseif (preg_match('#^/payroll/nextpayday$#', $endpoint)) {
        $settings = getMockSettings();
        $frequency = $settings['payroll']['frequency'] ?? 'biweekly';
        
        $today = new DateTime();
        $nextPayday = clone $today;
        $lastPayday = clone $today;
        
        // Calculate next payday based on frequency
        switch($frequency) {
            case 'weekly':
                // Weekly on Friday
                $dayToFriday = (5 - $nextPayday->format('N') + 7) % 7; // 5 is Friday in ISO-8601
                $nextPayday->modify("+{$dayToFriday} day");
                $lastPayday->modify('-7 days');
                break;
                
            case 'biweekly':
                // Biweekly on the 15th and last day of month
                $currentDay = (int)$nextPayday->format('j');
                $lastDayOfMonth = (int)$nextPayday->format('t');
                
                if ($currentDay < 15) {
                    $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), 15);
                } else if ($currentDay < $lastDayOfMonth) {
                    $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), $lastDayOfMonth);
                } else {
                    // Move to the 15th of next month
                    $nextPayday->modify('first day of next month');
                    $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), 15);
                }
                
                // Last payday
                if ($currentDay < 15) {
                    $lastPayday->modify('last day of last month');
                } else {
                    $lastPayday->setDate($lastPayday->format('Y'), $lastPayday->format('n'), 15);
                }
                break;
                
            case 'monthly':
                // Monthly on the last day of month
                $nextPayday->modify('last day of next month');
                $lastPayday->modify('last day of this month');
                break;
                
            default:
                // Default to biweekly
                $nextPayday->modify('+14 days');
                $lastPayday->modify('-14 days');
        }
        
        // Calculate remaining days and hours
        $interval = $today->diff($nextPayday);
        $daysRemaining = $interval->days;
        $hoursRemaining = $daysRemaining * 24;
        
        $response = [
            'success' => true,
            'message' => 'Next payday information retrieved',
            'data' => [
                'nextPayday' => $nextPayday->format('Y-m-d'),
                'frequency' => $frequency,
                'daysRemaining' => $daysRemaining,
                'hoursRemaining' => $hoursRemaining,
                'lastPayday' => $lastPayday->format('Y-m-d')
            ]
        ];
        
        echo json_encode($response);
        exit();
    }
    
    // Settings routes
    elseif (preg_match('#^/settings$#', $endpoint)) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            getSettings();
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            saveSettings($requestData);
        } else {
            respondWithError('Method not allowed', 405);
        }
    }
    
    // Overtime routes
    elseif (preg_match('#^/overtime$#', $endpoint)) {
        getOvertimeRequests($queryParams);
    }
    
    // System routes
    elseif (preg_match('#^/system/status$#', $endpoint)) {
        getSystemStatus();
    }
    
    // 404 Not Found
    else {
        respondWithError('Endpoint not found', 404);
    }
} catch (Exception $e) {
    respondWithError($e->getMessage(), 500);
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

/**
 * Get all employees
 */
function getEmployees() {
    // In a real implementation, fetch from database
    
    // Mock data
    $employees = [
        [
            'id' => 'emp_001',
            'username' => 'admin',
            'role' => 'admin',
            'fullName' => 'Administrator',
            'email' => 'admin@bricks.com',
            'department' => 'Management',
            'position' => 'System Administrator',
            'startDate' => '2024-01-01',
            'status' => 'active',
            'hourlyRate' => 25.00
        ],
        [
            'id' => 'emp_002',
            'username' => 'employee',
            'role' => 'employee',
            'fullName' => 'Employee User',
            'email' => 'employee@bricks.com',
            'department' => 'Operations',
            'position' => 'Staff',
            'startDate' => '2024-01-15',
            'status' => 'active',
            'hourlyRate' => 15.00
        ]
    ];
    
    respondWithData($employees);
}

/**
 * Get a specific employee
 */
function getEmployee($id) {
    // In a real implementation, fetch from database by ID
    
    // Mock data
    if ($id === 'emp_001') {
        respondWithData([
            'id' => 'emp_001',
            'username' => 'admin',
            'role' => 'admin',
            'fullName' => 'Administrator',
            'email' => 'admin@bricks.com',
            'department' => 'Management',
            'position' => 'System Administrator',
            'startDate' => '2024-01-01',
            'status' => 'active',
            'hourlyRate' => 25.00
        ]);
    } elseif ($id === 'emp_002') {
        respondWithData([
            'id' => 'emp_002',
            'username' => 'employee',
            'role' => 'employee',
            'fullName' => 'Employee User',
            'email' => 'employee@bricks.com',
            'department' => 'Operations',
            'position' => 'Staff',
            'startDate' => '2024-01-15',
            'status' => 'active',
            'hourlyRate' => 15.00
        ]);
    } else {
        respondWithError('Employee not found', 404);
    }
}

/**
 * Add a new employee
 */
function addEmployee($data) {
    // In a real implementation, validate and insert into database
    
    // Mock data
    $newEmployee = array_merge([
        'id' => 'emp_' . uniqid(),
        'createdAt' => date('c'),
        'status' => 'active'
    ], $data);
    
    respondWithData($newEmployee);
}

/**
 * Update an existing employee
 */
function updateEmployee($id, $data) {
    // In a real implementation, validate and update in database
    
    // Mock data
    $existingEmployee = ($id === 'emp_001') ? [
        'id' => 'emp_001',
        'username' => 'admin',
        'role' => 'admin',
        'fullName' => 'Administrator',
        'email' => 'admin@bricks.com',
        'department' => 'Management',
        'position' => 'System Administrator',
        'startDate' => '2024-01-01',
        'status' => 'active',
        'hourlyRate' => 25.00
    ] : [
        'id' => 'emp_002',
        'username' => 'employee',
        'role' => 'employee',
        'fullName' => 'Employee User',
        'email' => 'employee@bricks.com',
        'department' => 'Operations',
        'position' => 'Staff',
        'startDate' => '2024-01-15',
        'status' => 'active',
        'hourlyRate' => 15.00
    ];
    
    $updatedEmployee = array_merge($existingEmployee, $data, [
        'lastModified' => date('c')
    ]);
    
    respondWithData($updatedEmployee);
}

/**
 * Update employee wage
 */
function updateEmployeeWage($id, $data) {
    // In a real implementation, validate and update in database
    
    // Check required fields
    if (!isset($data['hourlyRate'])) {
        respondWithError('Hourly rate is required', 400);
        return;
    }
    
    // Mock data
    respondWithData([
        'success' => true,
        'employee' => [
            'id' => $id,
            'hourlyRate' => $data['hourlyRate'],
            'lastWageUpdate' => [
                'date' => date('c'),
                'oldRate' => 15.00,
                'newRate' => $data['hourlyRate'],
                'reason' => $data['reason'] ?? '',
                'by' => 'admin'
            ]
        ],
        'oldRate' => 15.00,
        'newRate' => $data['hourlyRate']
    ]);
}

/**
 * Delete an employee
 */
function deleteEmployee($id) {
    // In a real implementation, delete from database
    
    respondWithData([
        'success' => true,
        'message' => "Employee {$id} successfully deleted"
    ]);
}

/**
 * Get attendance records
 */
function getAttendanceRecords($filters) {
    // In a real implementation, fetch from database with filters
    
    // Mock data
    $records = [
        [
            'id' => 'att_001',
            'employeeId' => 'emp_001',
            'employeeName' => 'Administrator',
            'date' => date('Y-m-d'),
            'clockIn' => '09:00',
            'clockOut' => '17:00',
            'status' => 'present',
            'hours' => 8,
            'notes' => '',
            'createdAt' => date('c')
        ],
        [
            'id' => 'att_002',
            'employeeId' => 'emp_002',
            'employeeName' => 'Employee User',
            'date' => date('Y-m-d'),
            'clockIn' => '09:15',
            'clockOut' => '17:30',
            'status' => 'tardy',
            'hours' => 8.25,
            'notes' => 'Traffic delay',
            'createdAt' => date('c')
        ]
    ];
    
    // Apply filters
    if (isset($filters['employeeId'])) {
        $records = array_filter($records, function($record) use ($filters) {
            return $record['employeeId'] === $filters['employeeId'];
        });
    }
    
    if (isset($filters['startDate'])) {
        $records = array_filter($records, function($record) use ($filters) {
            return $record['date'] >= $filters['startDate'];
        });
    }
    
    if (isset($filters['endDate'])) {
        $records = array_filter($records, function($record) use ($filters) {
            return $record['date'] <= $filters['endDate'];
        });
    }
    
    respondWithData(array_values($records));
}

/**
 * Add attendance record
 */
function addAttendanceRecord($data) {
    // In a real implementation, validate and insert into database
    
    // Mock data
    $newRecord = array_merge([
        'id' => 'att_' . uniqid(),
        'createdAt' => date('c'),
    ], $data);
    
    // Calculate hours
    if (isset($newRecord['clockIn']) && isset($newRecord['clockOut'])) {
        $newRecord['hours'] = calculateHours($newRecord['clockIn'], $newRecord['clockOut']);
    }
    
    respondWithData($newRecord);
}

/**
 * Update attendance record
 */
function updateAttendanceRecord($id, $data) {
    // In a real implementation, validate and update database
    
    // Mock data
    $existingRecord = [
        'id' => $id,
        'employeeId' => 'emp_001',
        'employeeName' => 'Administrator',
        'date' => date('Y-m-d'),
        'clockIn' => '09:00',
        'clockOut' => '17:00',
        'status' => 'present',
        'hours' => 8,
        'notes' => '',
        'createdAt' => date('c', strtotime('-1 hour'))
    ];
    
    $updatedRecord = array_merge($existingRecord, $data, [
        'lastModified' => date('c')
    ]);
    
    // Recalculate hours if clock times were updated
    if (isset($data['clockIn']) || isset($data['clockOut'])) {
        $clockIn = $data['clockIn'] ?? $existingRecord['clockIn'];
        $clockOut = $data['clockOut'] ?? $existingRecord['clockOut'];
        $updatedRecord['hours'] = calculateHours($clockIn, $clockOut);
    }
    
    respondWithData($updatedRecord);
}

/**
 * Calculate hours between clock in/out times
 */
function calculateHours($clockIn, $clockOut) {
    if (!$clockIn || !$clockOut) return 0;
    
    list($inHour, $inMinute) = explode(':', $clockIn);
    list($outHour, $outMinute) = explode(':', $clockOut);
    
    $inMinutes = ($inHour * 60) + $inMinute;
    $outMinutes = ($outHour * 60) + $outMinute;
    
    // Handle overnight shifts
    $totalMinutes = $outMinutes >= $inMinutes 
        ? $outMinutes - $inMinutes 
        : (24 * 60 - $inMinutes) + $outMinutes;
    
    return round($totalMinutes / 60, 2);
}

/**
 * Get attendance statistics
 */
function getAttendanceStats($params) {
    // In a real implementation, calculate from database
    
    $date = $params['date'] ?? date('Y-m-d');
    
    // Mock data
    respondWithData([
        'date' => $date,
        'totalEmployees' => 2,
        'presentToday' => 2,
        'absentToday' => 0,
        'tardyToday' => 1,
        'attendanceRate' => 100,
        'tardyRate' => 50,
        'weeklyTrend' => [100, 100, 100, 100, 100, 0, 0], // Mon-Sun
        'lastUpdated' => date('c'),
        'departments' => [
            'total' => 2,
            'with100Percent' => 2,
            'withIssues' => 0
        ],
        'overtime' => [
            'requestsToday' => 1,
            'pendingApproval' => 1,
            'thisWeekTotal' => 5.5
        ],
        'today' => [
            'total' => 2,
            'present' => 1,
            'late' => 1,
            'absent' => 0,
            'attendanceRate' => 100
        ]
    ]);
}

/**
 * Get departments
 */
function getDepartments() {
    // In a real implementation, fetch from database
    
    // Mock data
    respondWithData([
        'Management',
        'Operations',
        'Human Resources',
        'Finance',
        'IT'
    ]);
}

/**
 * Get employees by department
 */
function getEmployeesByDepartment($departmentId) {
    // In a real implementation, fetch from database
    
    // Mock data
    if ($departmentId === 'Management') {
        respondWithData([
            [
                'id' => 'emp_001',
                'fullName' => 'Administrator',
                'position' => 'System Administrator',
                'department' => 'Management',
                'status' => 'active'
            ]
        ]);
    } elseif ($departmentId === 'Operations') {
        respondWithData([
            [
                'id' => 'emp_002',
                'fullName' => 'Employee User',
                'position' => 'Staff',
                'department' => 'Operations',
                'status' => 'active'
            ]
        ]);
    } else {
        respondWithData([]);
    }
}

/**
 * Get employee performance
 */
function getEmployeePerformance($params) {
    // In a real implementation, calculate from database
    
    $employeeId = $params['employeeId'] ?? null;
    
    // Mock data
    $performance = [
        [
            'employeeId' => 'emp_001',
            'name' => 'Administrator',
            'department' => 'Management',
            'attendanceRate' => 98.5,
            'punctualityRate' => 95.2,
            'productivity' => 92,
            'recentProjects' => 3,
            'lastUpdated' => date('c')
        ],
        [
            'employeeId' => 'emp_002',
            'name' => 'Employee User',
            'department' => 'Operations',
            'attendanceRate' => 100.0,
            'punctualityRate' => 85.7,
            'productivity' => 88,
            'recentProjects' => 2,
            'lastUpdated' => date('c')
        ]
    ];
    
    if ($employeeId) {
        $filtered = array_filter($performance, function($item) use ($employeeId) {
            return $item['employeeId'] === $employeeId;
        });
        
        respondWithData(array_values($filtered));
    } else {
        respondWithData($performance);
    }
}

/**
 * Get payroll data
 */
function getPayrollData($filters) {
    // In a real implementation, fetch from database with filters
    
    // Mock data
    respondWithData([
        [
            'id' => 'pay_001',
            'employeeId' => 'emp_001',
            'employeeName' => 'Administrator',
            'periodStart' => '2025-07-01',
            'periodEnd' => '2025-07-15',
            'hourlyRate' => 25.00,
            'regularHours' => 80,
            'overtimeHours' => 5,
            'regularPay' => 2000.00,
            'overtimePay' => 187.50,
            'grossPay' => 2187.50,
            'taxAmount' => 437.50,
            'netPay' => 1750.00,
            'status' => 'paid',
            'paidOn' => '2025-07-16',
            'currency' => 'PHP',
            'currencySymbol' => '₱'
        ],
        [
            'id' => 'pay_002',
            'employeeId' => 'emp_002',
            'employeeName' => 'Employee User',
            'periodStart' => '2025-07-01',
            'periodEnd' => '2025-07-15',
            'hourlyRate' => 15.00,
            'regularHours' => 80,
            'overtimeHours' => 0,
            'regularPay' => 1200.00,
            'overtimePay' => 0.00,
            'grossPay' => 1200.00,
            'taxAmount' => 240.00,
            'netPay' => 960.00,
            'status' => 'paid',
            'paidOn' => '2025-07-16',
            'currency' => 'PHP',
            'currencySymbol' => '₱'
        ]
    ]);
}

/**
 * Calculate payroll
 */
function calculatePayroll($data) {
    // In a real implementation, calculate from attendance records
    
    // Check required fields
    if (!isset($data['employeeId']) || !isset($data['startDate']) || !isset($data['endDate'])) {
        respondWithError('Missing required fields', 400);
        return;
    }
    
    // Mock calculation
    respondWithData([
        'employeeId' => $data['employeeId'],
        'employeeName' => ($data['employeeId'] === 'emp_001') ? 'Administrator' : 'Employee User',
        'periodStart' => $data['startDate'],
        'periodEnd' => $data['endDate'],
        'hourlyRate' => ($data['employeeId'] === 'emp_001') ? 25.00 : 15.00,
        'regularHours' => 80,
        'overtimeHours' => ($data['employeeId'] === 'emp_001') ? 5 : 0,
        'regularPay' => ($data['employeeId'] === 'emp_001') ? 2000.00 : 1200.00,
        'overtimePay' => ($data['employeeId'] === 'emp_001') ? 187.50 : 0.00,
        'grossPay' => ($data['employeeId'] === 'emp_001') ? 2187.50 : 1200.00,
        'taxAmount' => ($data['employeeId'] === 'emp_001') ? 437.50 : 240.00,
        'netPay' => ($data['employeeId'] === 'emp_001') ? 1750.00 : 960.00,
        'daysWorked' => 10,
        'daysLate' => ($data['employeeId'] === 'emp_001') ? 1 : 3,
        'currency' => 'PHP',
        'currencySymbol' => '₱',
        'calculatedAt' => date('c')
    ]);
}

/**
 * Get payroll history
 */
function getPayrollHistory($filters) {
    // This can use the same implementation as getPayrollData for now
    getPayrollData($filters);
}

/**
 * Get settings
 */
function getSettings() {
    // In a real implementation, fetch from database
    
    // Mock data
    respondWithData([
        'company' => [
            'name' => 'Bricks Company',
            'workingHours' => 8,
            'startTime' => '09:00',
            'endTime' => '17:00'
        ],
        'payroll' => [
            'standardWage' => 15.00,
            'overtimeRate' => 1.5,
            'minOvertimeHours' => 8,
            'frequency' => 'biweekly',
            'currency' => 'PHP',
            'currencySymbol' => '₱',
            'taxRate' => 0.20
        ],
        'preferences' => [
            'theme' => 'auto',
            'dateFormat' => 'YYYY-MM-DD',
            'timeFormat' => '24'
        ],
        'departments' => [
            'Management',
            'Operations',
            'Human Resources',
            'Finance',
            'IT'
        ],
        'lastUpdated' => date('c')
    ]);
}

/**
 * Save settings
 */
function saveSettings($data) {
    // In a real implementation, validate and save to database
    
    // Mock data
    $updatedSettings = array_merge([
        'company' => [
            'name' => 'Bricks Company',
            'workingHours' => 8,
            'startTime' => '09:00',
            'endTime' => '17:00'
        ],
        'payroll' => [
            'standardWage' => 15.00,
            'overtimeRate' => 1.5,
            'minOvertimeHours' => 8,
            'frequency' => 'biweekly',
            'currency' => 'PHP',
            'currencySymbol' => '₱',
            'taxRate' => 0.20
        ],
        'preferences' => [
            'theme' => 'auto',
            'dateFormat' => 'YYYY-MM-DD',
            'timeFormat' => '24'
        ],
        'departments' => [
            'Management',
            'Operations',
            'Human Resources',
            'Finance',
            'IT'
        ]
    ], $data, [
        'lastUpdated' => date('c')
    ]);
    
    respondWithData($updatedSettings);
}

/**
 * Get overtime requests
 */
function getOvertimeRequests($filters) {
    // In a real implementation, fetch from database with filters
    
    // Mock data
    respondWithData([
        [
            'id' => 'ot_001',
            'employeeId' => 'emp_001',
            'employeeName' => 'Administrator',
            'date' => date('Y-m-d'),
            'hours' => 2.5,
            'reason' => 'Project deadline',
            'status' => 'approved',
            'approvedBy' => 'admin',
            'requestedAt' => date('c', strtotime('-1 day'))
        ],
        [
            'id' => 'ot_002',
            'employeeId' => 'emp_002',
            'employeeName' => 'Employee User',
            'date' => date('Y-m-d'),
            'hours' => 1.5,
            'reason' => 'System maintenance',
            'status' => 'pending',
            'requestedAt' => date('c')
        ]
    ]);
}

/**
 * Get system status
 */
function getSystemStatus() {
    // In a real implementation, fetch actual system metrics
    
    // Mock data
    respondWithData([
        'server' => [
            'status' => 'online',
            'uptime' => '99.9%',
            'lastRestart' => date('c', strtotime('-1 day'))
        ],
        'database' => [
            'status' => 'connected',
            'size' => '2.5 GB',
            'lastBackup' => date('c', strtotime('-1 hour'))
        ],
        'backup' => [
            'status' => 'active',
            'lastBackup' => date('c', strtotime('-1 hour')),
            'nextBackup' => date('c', strtotime('+1 hour'))
        ],
        'users' => [
            'total' => 2,
            'active' => 2,
            'online' => 1
        ],
        'version' => '2.0.0',
        'lastUpdated' => date('c')
    ]);
}

/**
 * Response helpers
 */

/**
 * Send JSON response with data
 */
function respondWithData($data) {
    echo json_encode($data);
    exit;
}

/**
 * Send JSON response with error
 */
function respondWithError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode([
        'error' => true,
        'message' => $message,
        'code' => $statusCode
    ]);
    exit;
}

/**
 * Get mock settings (for testing)
 */
function getMockSettings() {
    return [
        'company' => [
            'name' => 'Bricks Company',
            'workingHours' => 8,
            'startTime' => '09:00',
            'endTime' => '17:00'
        ],
        'payroll' => [
            'standardWage' => 15.00,
            'overtimeRate' => 1.5,
            'minOvertimeHours' => 8,
            'frequency' => 'biweekly',
            'currency' => 'PHP',
            'currencySymbol' => '₱',
            'taxRate' => 0.20
        ],
        'preferences' => [
            'theme' => 'auto',
            'dateFormat' => 'YYYY-MM-DD',
            'timeFormat' => '24'
        ],
        'departments' => [
            'Management',
            'Operations',
            'Human Resources',
            'Finance',
            'IT'
        ],
        'lastUpdated' => date('c')
    ];
}
