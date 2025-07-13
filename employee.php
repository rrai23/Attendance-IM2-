<?php
// Start session and include required files
session_start();
require_once 'db.php';
require_once 'auth.php';

// Check authentication and get current user
if (!isLoggedIn()) {
    header('Location: /IM2/login.php');
    exit();
}


$user_role = getCurrentUserRole();
$user_id = getCurrentUserId();

// Get employee ID from URL parameter or use current user's ID
$employee_id = isset($_GET['id']) ? (int)$_GET['id'] : $user_id;

// Check access permissions
if ($user_role === 'employee' && $employee_id !== $user_id) {
    // Employees can only view their own data
    header('Location: employee.php?id=' . $user_id);
    exit();
}

// Handle POST requests for clock in/out and overtime
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'clock_in':
            $result = handleClockIn($employee_id);
            if ($result['success']) {
                $message = 'Clocked in successfully';
            } else {
                $error = $result['message'];
            }
            break;
            
        case 'clock_out':
            $result = handleClockOut($employee_id);
            if ($result['success']) {
                $message = 'Clocked out successfully';
            } else {
                $error = $result['message'];
            }
            break;
            
        case 'lunch_start':
            $result = handleLunchStart($employee_id);
            if ($result['success']) {
                $message = 'Lunch break started';
            } else {
                $error = $result['message'];
            }
            break;
            
        case 'lunch_end':
            $result = handleLunchEnd($employee_id);
            if ($result['success']) {
                $message = 'Lunch break ended';
            } else {
                $error = $result['message'];
            }
            break;
            
        case 'overtime_request':
            $result = handleOvertimeRequest($employee_id);
            if ($result['success']) {
                $message = 'Overtime request submitted successfully';
            } else {
                $error = $result['message'];
            }
            break;
    }
}

// Fetch employee details
$employee = getEmployeeDetails($employee_id);
if (!$employee) {
    header('Location: dashboard.php');
    exit();
}

// Get date range filter
$date_range = $_GET['range'] ?? 'current-month';
$date_filter = getDateRange($date_range);

// Fetch attendance data
$attendance_records = getAttendanceRecords($employee_id, $date_filter['start'], $date_filter['end']);
$recent_entries = getRecentAttendanceEntries($employee_id, 10);
$personal_stats = calculatePersonalStats($employee_id, $date_filter['start'], $date_filter['end']);
$overtime_requests = getOvertimeRequests($employee_id);
$today_record = getTodayAttendanceRecord($employee_id);

// Clock in/out functions
function handleClockIn($employee_id) {
    global $conn;
    
    $today = date('Y-m-d');
    $current_time = date('H:i:s');
    
    // Check if already clocked in today
    $stmt = mysqli_prepare($conn, "SELECT id, clock_in FROM attendance WHERE employee_id = ? AND date = ?");
    mysqli_stmt_bind_param($stmt, "is", $employee_id, $today);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $record = mysqli_fetch_assoc($result);
    
    if ($record && $record['clock_in']) {
        return ['success' => false, 'message' => 'Already clocked in today'];
    }
    
    if ($record) {
        // Update existing record
        $stmt = mysqli_prepare($conn, "UPDATE attendance SET clock_in = ?, status = 'present' WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "si", $current_time, $record['id']);
    } else {
        // Create new record
        $stmt = mysqli_prepare($conn, "INSERT INTO attendance (employee_id, date, clock_in, status) VALUES (?, ?, ?, 'present')");
        mysqli_stmt_bind_param($stmt, "iss", $employee_id, $today, $current_time);
    }
    
    if (mysqli_stmt_execute($stmt)) {
        return ['success' => true];
    } else {
        return ['success' => false, 'message' => 'Failed to clock in'];
    }
}

function handleClockOut($employee_id) {
    global $conn;
    
    $today = date('Y-m-d');
    $current_time = date('H:i:s');
    
    // Check if clocked in today
    $stmt = mysqli_prepare($conn, "SELECT id, clock_in, clock_out FROM attendance WHERE employee_id = ? AND date = ?");
    mysqli_stmt_bind_param($stmt, "is", $employee_id, $today);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $record = mysqli_fetch_assoc($result);
    
    if (!$record || !$record['clock_in']) {
        return ['success' => false, 'message' => 'Must clock in first'];
    }
    
    if ($record['clock_out']) {
        return ['success' => false, 'message' => 'Already clocked out today'];
    }
    
    // Calculate hours worked
    $clock_in_time = strtotime($record['clock_in']);
    $clock_out_time = strtotime($current_time);
    $hours_worked = ($clock_out_time - $clock_in_time) / 3600;
    
    // Update record
    $stmt = mysqli_prepare($conn, "UPDATE attendance SET clock_out = ?, hours_worked = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "sdi", $current_time, $hours_worked, $record['id']);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['success' => true];
    } else {
        return ['success' => false, 'message' => 'Failed to clock out'];
    }
}

function handleLunchStart($employee_id) {
    global $conn;
    
    $today = date('Y-m-d');
    $current_time = date('H:i:s');
    
    $stmt = mysqli_prepare($conn, "UPDATE attendance SET lunch_start = ? WHERE employee_id = ? AND date = ? AND clock_in IS NOT NULL");
    mysqli_stmt_bind_param($stmt, "sis", $current_time, $employee_id, $today);
    
    if (mysqli_stmt_execute($stmt) && mysqli_stmt_affected_rows($stmt) > 0) {
        return ['success' => true];
    } else {
        return ['success' => false, 'message' => 'Must clock in first'];
    }
}

function handleLunchEnd($employee_id) {
    global $conn;
    
    $today = date('Y-m-d');
    $current_time = date('H:i:s');
    
    $stmt = mysqli_prepare($conn, "UPDATE attendance SET lunch_end = ? WHERE employee_id = ? AND date = ? AND lunch_start IS NOT NULL");
    mysqli_stmt_bind_param($stmt, "sis", $current_time, $employee_id, $today);
    
    if (mysqli_stmt_execute($stmt) && mysqli_stmt_affected_rows($stmt) > 0) {
        return ['success' => true];
    } else {
        return ['success' => false, 'message' => 'Must start lunch first'];
    }
}

function handleOvertimeRequest($employee_id) {
    global $conn;
    
    $date = $_POST['overtime-date'] ?? '';
    $hours = (float)($_POST['overtime-hours'] ?? 0);
    $reason = $_POST['overtime-reason'] ?? '';
    $description = $_POST['overtime-description'] ?? '';
    
    if (empty($date) || $hours <= 0 || empty($reason)) {
        return ['success' => false, 'message' => 'Please fill in all required fields'];
    }
    
    if ($hours > 12) {
        return ['success' => false, 'message' => 'Maximum 12 hours per day'];
    }
    
    $stmt = mysqli_prepare($conn, "INSERT INTO overtime_requests (employee_id, date, hours, reason, description, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())");
    mysqli_stmt_bind_param($stmt, "isdss", $employee_id, $date, $hours, $reason, $description);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['success' => true];
    } else {
        return ['success' => false, 'message' => 'Failed to submit request'];
    }
}

// Data fetching functions
function getEmployeeDetails($employee_id) {
    global $conn;
    
    $stmt = mysqli_prepare($conn, "SELECT * FROM employees WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "i", $employee_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    return mysqli_fetch_assoc($result);
}

function getAttendanceRecords($employee_id, $start_date, $end_date) {
    global $conn;
    
    $stmt = mysqli_prepare($conn, "SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC");
    mysqli_stmt_bind_param($stmt, "iss", $employee_id, $start_date, $end_date);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $records = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $records[] = $row;
    }
    
    return $records;
}

function getRecentAttendanceEntries($employee_id, $limit = 10) {
    global $conn;
    
    $stmt = mysqli_prepare($conn, "SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT ?");
    mysqli_stmt_bind_param($stmt, "ii", $employee_id, $limit);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $entries = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $entries[] = $row;
    }
    
    return $entries;
}

function getTodayAttendanceRecord($employee_id) {
    global $conn;
    
    $today = date('Y-m-d');
    $stmt = mysqli_prepare($conn, "SELECT * FROM attendance WHERE employee_id = ? AND date = ?");
    mysqli_stmt_bind_param($stmt, "is", $employee_id, $today);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    return mysqli_fetch_assoc($result);
}

function getOvertimeRequests($employee_id) {
    global $conn;
    
    $stmt = mysqli_prepare($conn, "SELECT * FROM overtime_requests WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20");
    mysqli_stmt_bind_param($stmt, "i", $employee_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $requests = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $requests[] = $row;
    }
    
    return $requests;
}

function calculatePersonalStats($employee_id, $start_date, $end_date) {
    global $conn;
    
    // Get attendance records for the period
    $stmt = mysqli_prepare($conn, "SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?");
    mysqli_stmt_bind_param($stmt, "iss", $employee_id, $start_date, $end_date);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $total_days = 0;
    $present_days = 0;
    $late_days = 0;
    $absent_days = 0;
    $total_hours = 0;
    $total_overtime = 0;
    
    while ($row = mysqli_fetch_assoc($result)) {
        $total_days++;
        
        if ($row['status'] === 'present' || $row['status'] === 'late') {
            $present_days++;
        }
        
        if ($row['status'] === 'late') {
            $late_days++;
        }
        
        if ($row['status'] === 'absent') {
            $absent_days++;
        }
        
        $total_hours += (float)$row['hours_worked'];
        $total_overtime += (float)$row['overtime_hours'];
    }
    
    $attendance_rate = $total_days > 0 ? round(($present_days / $total_days) * 100, 1) : 0;
    $punctuality_rate = $present_days > 0 ? round((($present_days - $late_days) / $present_days) * 100, 1) : 0;
    $avg_daily_hours = $total_days > 0 ? round($total_hours / $total_days, 1) : 0;
    
    return [
        'total_days' => $total_days,
        'present_days' => $present_days,
        'late_days' => $late_days,
        'absent_days' => $absent_days,
        'attendance_rate' => $attendance_rate,
        'punctuality_rate' => $punctuality_rate,
        'total_hours' => round($total_hours, 1),
        'total_overtime' => round($total_overtime, 1),
        'avg_daily_hours' => $avg_daily_hours
    ];
}

function getDateRange($range) {
    $today = new DateTime();
    
    switch ($range) {
        case 'last-week':
            $start = clone $today;
            $start->modify('-7 days');
            return ['start' => $start->format('Y-m-d'), 'end' => $today->format('Y-m-d')];
            
        case 'last-month':
            $start = new DateTime('first day of last month');
            $end = new DateTime('last day of last month');
            return ['start' => $start->format('Y-m-d'), 'end' => $end->format('Y-m-d')];
            
        case 'last-3-months':
            $start = clone $today;
            $start->modify('-3 months');
            return ['start' => $start->format('Y-m-d'), 'end' => $today->format('Y-m-d')];
            
        case 'current-month':
        default:
            $start = new DateTime('first day of this month');
            return ['start' => $start->format('Y-m-d'), 'end' => $today->format('Y-m-d')];
    }
}

function formatTime($time) {
    return $time ? date('H:i', strtotime($time)) : '--:--';
}

function getStatusIcon($status) {
    switch ($status) {
        case 'present': return '✅';
        case 'late': return '⏰';
        case 'absent': return '❌';
        case 'on-leave': return '🏖️';
        default: return '❓';
    }
}

function getStatusClass($status) {
    switch ($status) {
        case 'present': return 'status-present';
        case 'late': return 'status-late';
        case 'absent': return 'status-absent';
        case 'on-leave': return 'status-leave';
        default: return 'status-unknown';
    }
}

function getOvertimeStatusIcon($status) {
    switch ($status) {
        case 'pending': return '⏳';
        case 'approved': return '✅';
        case 'denied': return '❌';
        case 'cancelled': return '🚫';
        default: return '❓';
    }
}

function getOvertimeStatusClass($status) {
    switch ($status) {
        case 'pending': return 'overtime-pending';
        case 'approved': return 'overtime-approved';
        case 'denied': return 'overtime-denied';
        case 'cancelled': return 'overtime-cancelled';
        default: return 'overtime-unknown';
    }
}
?>

<!DOCTYPE html>
<html lang="en" data-theme="light" class="page-employee">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $user_role === 'admin' ? htmlspecialchars($employee['firstName']) . ' - ' : 'My '; ?>Attendance - Brix Attendance System</title>
    <meta name="description" content="Employee self-service portal for viewing personal attendance data, time entries, and overtime requests">
    <meta name="robots" content="noindex, nofollow">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Mobile Hamburger Menu Button -->
    <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    </button>

    <!-- Theme Toggle -->
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
        <svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    </button>

    <!-- App Container -->
    <div class="app-container">
        <!-- Sidebar Navigation -->
        <?php include 'header.php'; ?>

        <!-- Main Content -->
        <main class="main-content" id="main-content">
            <!-- Success/Error Messages -->
            <?php if ($message): ?>
                <div class="notification notification-success show" style="margin-bottom: 1rem;">
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif; ?>
            
            <?php if ($error): ?>
                <div class="notification notification-error show" style="margin-bottom: 1rem;">
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <!-- Page Header -->
            <header class="page-header">
                <div class="header-content">
                    <div class="header-title">
                        <h1><?php echo $user_role === 'admin' ? htmlspecialchars($employee['firstName']) . "'s" : 'My'; ?> Attendance</h1>
                        <p><?php echo $user_role === 'admin' ? 'Employee attendance dashboard and time tracking' : 'Personal attendance dashboard and time tracking'; ?></p>
                    </div>
                    <div class="header-actions">
                        <div class="employee-info">
                            <div class="employee-avatar">
                                <span><?php echo strtoupper(substr($employee['firstName'], 0, 1)); ?></span>
                            </div>
                            <div class="employee-details">
                                <div class="employee-name"><?php echo htmlspecialchars($employee['firstName']); ?></div>
                                <div class="employee-meta">
                                    <span class="employee-id">ID: <?php echo htmlspecialchars($employee['employeeCode']); ?></span>
                                    <span class="employee-department"><?php echo htmlspecialchars($employee['department'] ?? 'General'); ?></span>
                                </div>
                            </div>
                        </div>
                        <div class="header-controls">
                            <form method="GET" style="display: inline;">
                                <?php if (isset($_GET['id'])): ?>
                                    <input type="hidden" name="id" value="<?php echo $employee_id; ?>">
                                <?php endif; ?>
                                <select class="form-select" name="range" onchange="this.form.submit()">
                                    <option value="current-month" <?php echo $date_range === 'current-month' ? 'selected' : ''; ?>>Current Month</option>
                                    <option value="last-week" <?php echo $date_range === 'last-week' ? 'selected' : ''; ?>>Last Week</option>
                                    <option value="last-month" <?php echo $date_range === 'last-month' ? 'selected' : ''; ?>>Last Month</option>
                                    <option value="last-3-months" <?php echo $date_range === 'last-3-months' ? 'selected' : ''; ?>>Last 3 Months</option>
                                </select>
                            </form>
                            <button class="btn btn-secondary" onclick="location.reload()" title="Refresh data">
                                <span class="btn-icon">🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Quick Actions Bar (only for current user) -->
            <?php if ($employee_id === $user_id): ?>
            <section class="quick-actions">
                <div class="actions-grid">
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="clock_in">
                        <button type="submit" class="action-btn action-clock-in <?php echo ($today_record && $today_record['clock_in']) ? 'completed' : ''; ?>" 
                                <?php echo ($today_record && $today_record['clock_in']) ? 'disabled' : ''; ?>>
                            <span class="action-icon">⏰</span>
                            <span class="action-text"><?php echo ($today_record && $today_record['clock_in']) ? 'Clocked In' : 'Clock In'; ?></span>
                            <span class="action-time" id="current-time">--:--</span>
                        </button>
                    </form>
                    
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="clock_out">
                        <button type="submit" class="action-btn action-clock-out <?php echo ($today_record && $today_record['clock_out']) ? 'completed' : ''; ?>" 
                                <?php echo (!$today_record || !$today_record['clock_in'] || $today_record['clock_out']) ? 'disabled' : ''; ?>>
                            <span class="action-icon">🏁</span>
                            <span class="action-text"><?php echo ($today_record && $today_record['clock_out']) ? 'Clocked Out' : 'Clock Out'; ?></span>
                            <span class="action-time" id="current-time-out">--:--</span>
                        </button>
                    </form>
                    
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="lunch_start">
                        <button type="submit" class="action-btn action-lunch-start <?php echo ($today_record && $today_record['lunch_start']) ? 'completed' : ''; ?>" 
                                <?php echo (!$today_record || !$today_record['clock_in'] || $today_record['lunch_start']) ? 'disabled' : ''; ?>>
                            <span class="action-icon">🍽️</span>
                            <span class="action-text"><?php echo ($today_record && $today_record['lunch_start']) ? 'Lunch Started' : 'Start Lunch'; ?></span>
                        </button>
                    </form>
                    
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="lunch_end">
                        <button type="submit" class="action-btn action-lunch-end <?php echo ($today_record && $today_record['lunch_end']) ? 'completed' : ''; ?>" 
                                <?php echo (!$today_record || !$today_record['lunch_start'] || $today_record['lunch_end']) ? 'disabled' : ''; ?>>
                            <span class="action-icon">✅</span>
                            <span class="action-text"><?php echo ($today_record && $today_record['lunch_end']) ? 'Lunch Ended' : 'End Lunch'; ?></span>
                        </button>
                    </form>
                </div>
                <div class="current-status">
                    <div class="status-indicator">
                        <span class="status-dot"></span>
                        <span class="status-text">
                            <?php 
                            if (!$today_record || !$today_record['clock_in']) {
                                echo 'Ready to Clock In';
                            } elseif ($today_record['clock_out']) {
                                echo 'Clocked Out';
                            } elseif ($today_record['lunch_start'] && !$today_record['lunch_end']) {
                                echo 'On Lunch Break';
                            } else {
                                echo 'Clocked In';
                            }
                            ?>
                        </span>
                    </div>
                </div>
            </section>
            <?php endif; ?>

            <!-- Main Dashboard Grid -->
            <div class="tiles-grid grid-2">
                <!-- Attendance Summary Tile -->
                <div class="tile tile-accent">
                    <div class="tile-header">
                        <h3 class="tile-title">Attendance Summary</h3>
                        <span class="tile-icon">📊</span>
                    </div>
                    <div class="tile-content">
                        <div class="summary-grid">
                            <div class="summary-card">
                                <div class="summary-icon">📅</div>
                                <div class="summary-value"><?php echo $personal_stats['total_days']; ?></div>
                                <div class="summary-label">Total Days</div>
                            </div>
                            
                            <div class="summary-card">
                                <div class="summary-icon">✅</div>
                                <div class="summary-value"><?php echo $personal_stats['present_days']; ?></div>
                                <div class="summary-label">Present</div>
                            </div>
                            
                            <div class="summary-card">
                                <div class="summary-icon">⏰</div>
                                <div class="summary-value"><?php echo $personal_stats['late_days']; ?></div>
                                <div class="summary-label">Late</div>
                            </div>
                            
                            <div class="summary-card">
                                <div class="summary-icon">❌</div>
                                <div class="summary-value"><?php echo $personal_stats['absent_days']; ?></div>
                                <div class="summary-label">Absent</div>
                            </div>
                            
                            <div class="summary-card highlight">
                                <div class="summary-icon">📊</div>
                                <div class="summary-value"><?php echo $personal_stats['attendance_rate']; ?>%</div>
                                <div class="summary-label">Attendance Rate</div>
                            </div>
                            
                            <div class="summary-card highlight">
                                <div class="summary-icon">🎯</div>
                                <div class="summary-value"><?php echo $personal_stats['punctuality_rate']; ?>%</div>
                                <div class="summary-label">Punctuality</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Personal Statistics Tile -->
                <div class="tile">
                    <div class="tile-header">
                        <h3 class="tile-title">Personal Statistics</h3>
                        <span class="tile-icon">📈</span>
                    </div>
                    <div class="tile-content">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <h3>Hours Summary</h3>
                                <div class="stat-items">
                                    <div class="stat-item">
                                        <span class="stat-label">Total Hours:</span>
                                        <span class="stat-value"><?php echo $personal_stats['total_hours']; ?>h</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Overtime Hours:</span>
                                        <span class="stat-value"><?php echo $personal_stats['total_overtime']; ?>h</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Avg Daily:</span>
                                        <span class="stat-value highlight"><?php echo $personal_stats['avg_daily_hours']; ?>h</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Time Entries Tile -->
                <div class="tile tile-large">
                    <div class="tile-header">
                        <h3 class="tile-title">Recent Time Entries</h3>
                        <span class="tile-icon">🕐</span>
                    </div>
                    <div class="tile-content">
                        <?php if (empty($recent_entries)): ?>
                            <div class="empty-state">
                                <div class="empty-icon">📋</div>
                                <div class="empty-message">No recent entries found</div>
                            </div>
                        <?php else: ?>
                            <?php foreach ($recent_entries as $entry): ?>
                                <div class="entry-card <?php echo getStatusClass($entry['status']); ?>">
                                    <div class="entry-date">
                                        <div class="date-day"><?php echo date('d', strtotime($entry['date'])); ?></div>
                                        <div class="date-month"><?php echo date('M', strtotime($entry['date'])); ?></div>
                                    </div>
                                    
                                    <div class="entry-details">
                                        <div class="entry-status">
                                            <span class="status-icon"><?php echo getStatusIcon($entry['status']); ?></span>
                                            <span class="status-text"><?php echo ucfirst($entry['status']); ?></span>
                                        </div>
                                        
                                        <div class="entry-times">
                                            <div class="time-item">
                                                <span class="time-label">In:</span>
                                                <span class="time-value"><?php echo formatTime($entry['clock_in']); ?></span>
                                            </div>
                                            <div class="time-item">
                                                <span class="time-label">Out:</span>
                                                <span class="time-value"><?php echo formatTime($entry['clock_out']); ?></span>
                                            </div>
                                        </div>
                                        
                                        <div class="entry-hours">
                                            <div class="hours-item">
                                                <span class="hours-label">Hours:</span>
                                                <span class="hours-value"><?php echo round($entry['hours_worked'] ?? 0, 1); ?>h</span>
                                            </div>
                                            <?php if ($entry['overtime_hours'] > 0): ?>
                                                <div class="hours-item overtime">
                                                    <span class="hours-label">Overtime:</span>
                                                    <span class="hours-value"><?php echo round($entry['overtime_hours'], 1); ?>h</span>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Overtime Requests Tile -->
                <div class="tile">
                    <div class="tile-header">
                        <h3 class="tile-title">Overtime Requests</h3>
                        <span class="tile-icon">⏱️</span>
                    </div>
                    <div class="tile-content">
                        <div class="overtime-section">
                            <?php if ($employee_id === $user_id): ?>
                                <div class="section-header">
                                    <h3>Overtime Requests</h3>
                                    <button class="btn btn-secondary" onclick="showOvertimeModal()">
                                        New Request
                                    </button>
                                </div>
                            <?php endif; ?>
                            
                            <?php if (empty($overtime_requests)): ?>
                                <div class="empty-state">
                                    <div class="empty-icon">⏱️</div>
                                    <div class="empty-message">No overtime requests found</div>
                                </div>
                            <?php else: ?>
                                <?php foreach (array_slice($overtime_requests, 0, 5) as $request): ?>
                                    <div class="overtime-request <?php echo getOvertimeStatusClass($request['status']); ?>">
                                        <div class="request-header">
                                            <div class="request-date"><?php echo date('M d, Y', strtotime($request['date'])); ?></div>
                                            <div class="request-status">
                                                <span class="status-icon"><?php echo getOvertimeStatusIcon($request['status']); ?></span>
                                                <span class="status-text"><?php echo ucfirst($request['status']); ?></span>
                                            </div>
                                        </div>
                                        
                                        <div class="request-details">
                                            <div class="detail-item">
                                                <span class="detail-label">Hours:</span>
                                                <span class="detail-value"><?php echo $request['hours']; ?>h</span>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">Reason:</span>
                                                <span class="detail-value"><?php echo htmlspecialchars($request['reason']); ?></span>
                                            </div>
                                            <?php if ($request['description']): ?>
                                                <div class="detail-item">
                                                    <span class="detail-label">Notes:</span>
                                                    <span class="detail-value"><?php echo htmlspecialchars($request['description']); ?></span>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Overtime Request Modal -->
    <?php if ($employee_id === $user_id): ?>
    <div class="modal-overlay" id="overtime-form-modal" style="display: none;">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Request Overtime</h3>
                <button class="modal-close" onclick="hideOvertimeModal()" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
                <form method="POST" class="overtime-form">
                    <input type="hidden" name="action" value="overtime_request">
                    
                    <div class="form-group">
                        <label for="overtime-date" class="form-label">Date</label>
                        <input type="date" id="overtime-date" name="overtime-date" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="overtime-hours" class="form-label">Hours Requested</label>
                        <input type="number" id="overtime-hours" name="overtime-hours" class="form-input" 
                               min="0.5" max="12" step="0.5" required>
                        <div class="form-help">Maximum 12 hours per day</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="overtime-reason" class="form-label">Reason</label>
                        <select id="overtime-reason" name="overtime-reason" class="form-select" required>
                            <option value="">Select a reason</option>
                            <option value="project-deadline">Project Deadline</option>
                            <option value="urgent-task">Urgent Task</option>
                            <option value="staff-shortage">Staff Shortage</option>
                            <option value="client-request">Client Request</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="overtime-description" class="form-label">Description (Optional)</label>
                        <textarea id="overtime-description" name="overtime-description" class="form-textarea" 
                                  rows="3" placeholder="Provide additional details about the overtime request..."></textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="hideOvertimeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Notification Container -->
    <div id="notification-container" class="notification-container"></div>

    <!-- Scripts -->
    <script>
        // Update current time display
        function updateCurrentTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const timeElements = document.querySelectorAll('#current-time, #current-time-out');
            timeElements.forEach(el => {
                if (el) el.textContent = timeString;
            });
        }

        // Update time immediately and then every second
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);

        // Modal functions
        function showOvertimeModal() {
            document.getElementById('overtime-form-modal').style.display = 'flex';
        }

        function hideOvertimeModal() {
            document.getElementById('overtime-form-modal').style.display = 'none';
        }

        // Close modal when clicking outside
        document.getElementById('overtime-form-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                hideOvertimeModal();
            }
        });

        // Auto-hide notifications
        document.addEventListener('DOMContentLoaded', function() {
            const notifications = document.querySelectorAll('.notification');
            notifications.forEach(notification => {
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, 3000);
            });
        });

        // Theme toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        html.setAttribute('data-theme', savedTheme);

        themeToggle?.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        mobileMenuToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('mobile-open');
        });
    </script>

    <!-- Employee Page Specific Styles -->
    <style>
        /* ===== CSS CUSTOM PROPERTIES ===== */
        .page-employee {
            --accent-primary: #5ac8fa;
            --accent-light: rgba(90, 200, 250, 0.1);
            --accent-hover: rgba(90, 200, 250, 0.8);
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
            --radius-sm: 0.375rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
            --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        /* ===== MAIN DASHBOARD GRID FIXES ===== */
        .tiles-grid {
            display: grid;
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-lg);
            align-items: start;
        }

        .tiles-grid.grid-2 {
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            grid-auto-rows: min-content;
        }

        .tile {
            background-color: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-fast);
            overflow: hidden;
            height: fit-content;
            min-height: 200px;
            display: flex;
            flex-direction: column;
        }

        .tile:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }

        .tile-large {
            grid-column: 1 / -1;
        }

        .tile-accent {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 1px var(--accent-light);
        }

        .tile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-lg);
            border-bottom: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
            flex-shrink: 0;
        }

        .tile-content {
            padding: var(--spacing-lg);
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        /* ===== PAGE HEADER IMPROVEMENTS ===== */
        .page-header {
            background: linear-gradient(135deg, var(--accent-light) 0%, var(--bg-primary) 100%);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: var(--spacing-xl);
            flex-wrap: wrap;
        }

        .header-title {
            flex: 1;
            min-width: 300px;
        }

        .header-title h1 {
            color: var(--accent-primary);
            margin-bottom: var(--spacing-sm);
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.2;
        }

        .header-title p {
            color: var(--text-secondary);
            margin-bottom: 0;
            font-size: 1rem;
            line-height: 1.5;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: var(--spacing-xl);
            flex-wrap: wrap;
        }

        .employee-info {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            min-width: 250px;
        }

        .employee-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 18px;
            flex-shrink: 0;
        }

        .employee-details {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            min-width: 0;
        }

        .employee-name {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .employee-meta {
            display: flex;
            gap: var(--spacing-md);
            font-size: 0.875rem;
            color: var(--text-secondary);
            flex-wrap: wrap;
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            flex-wrap: wrap;
        }

        /* ===== QUICK ACTIONS IMPROVEMENTS ===== */
        .quick-actions {
            background-color: var(--bg-primary);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xl);
        }

        .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-lg);
            background-color: var(--bg-secondary);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-xl);
            cursor: pointer;
            transition: all var(--transition-fast);
            text-align: center;
            min-height: 120px;
            gap: var(--spacing-sm);
            text-decoration: none;
            color: inherit;
            position: relative;
            overflow: hidden;
        }

        .action-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left var(--transition-normal);
        }

        .action-btn:hover:not(:disabled)::before {
            left: 100%;
        }

        .action-btn:hover:not(:disabled) {
            border-color: var(--accent-primary);
            background-color: var(--accent-light);
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .action-btn:focus {
            outline: 3px solid var(--accent-light);
            outline-offset: 2px;
        }

        .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .action-btn.completed {
            border-color: var(--accent-primary);
            background-color: var(--accent-light);
            color: var(--accent-primary);
        }

        .action-icon {
            font-size: 28px;
            margin-bottom: var(--spacing-sm);
            transition: transform var(--transition-fast);
        }

        .action-btn:hover:not(:disabled) .action-icon {
            transform: scale(1.1);
        }

        .action-text {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
            line-height: 1.2;
        }

        .action-time {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            margin-top: var(--spacing-xs);
        }

        .current-status {
            display: flex;
            justify-content: center;
            align-items: center;
            padding-top: var(--spacing-xl);
            border-top: 1px solid var(--border-color);
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding: var(--spacing-md) var(--spacing-lg);
            background-color: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: var(--accent-primary);
            animation: pulse 2s infinite;
            flex-shrink: 0;
            margin: 0px;
        }

        @keyframes pulse {
            0%, 100% { 
                opacity: 1; 
                transform: scale(1);
            }
            50% { 
                opacity: 0.7; 
                transform: scale(1.1);
            }
        }

        /* ===== SUMMARY GRID IMPROVEMENTS ===== */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: var(--spacing-md);
        }

        .summary-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: var(--spacing-lg);
            background-color: var(--bg-secondary);
            border-radius: var(--radius-lg);
            text-align: center;
            transition: all var(--transition-fast);
            border: 1px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-hover));
            transform: scaleX(0);
            transition: transform var(--transition-fast);
        }

        .summary-card:hover {
            background-color: var(--bg-tertiary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .summary-card:hover::before {
            transform: scaleX(1);
        }

        .summary-card.highlight {
            background: linear-gradient(135deg, var(--accent-light), var(--bg-secondary));
            border-color: var(--accent-primary);
            box-shadow: var(--shadow-sm);
        }

        .summary-icon {
            font-size: 24px;
            margin-bottom: var(--spacing-sm);
            transition: transform var(--transition-fast);
        }

        .summary-card:hover .summary-icon {
            transform: scale(1.1);
        }

        .summary-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--spacing-xs);
            line-height: 1;
        }

        .summary-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 500;
        }

        /* ===== ENTRY CARDS IMPROVEMENTS ===== */
        .entry-card {
            display: flex;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border-left: 4px solid var(--border-color);
            margin-bottom: var(--spacing-md);
            transition: all var(--transition-fast);
            position: relative;
            overflow: hidden;
        }

        .entry-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: inherit;
            transition: width var(--transition-fast);
        }

        .entry-card:hover {
            background-color: var(--bg-tertiary);
            transform: translateX(8px);
            box-shadow: var(--shadow-md);
        }

        .entry-card:hover::before {
            width: 8px;
        }

        .entry-card.status-present {
            border-left-color: #34c759;
        }

        .entry-card.status-late {
            border-left-color: #ff9500;
        }

        .entry-card.status-absent {
            border-left-color: #ff3b30;
        }

        .entry-date {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 60px;
            padding: var(--spacing-sm);
            background-color: var(--bg-primary);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            flex-shrink: 0;
        }

        .date-day {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1;
        }

        .date-month {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            font-weight: 500;
        }

        .entry-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
            min-width: 0;
        }

        .entry-status {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .status-icon {
            font-size: 1rem;
            flex-shrink: 0;
        }

        .status-text {
            font-weight: 600;
            color: var(--text-primary);
            text-transform: capitalize;
            font-size: 0.875rem;
            display: inline; /* or inline-block */
            white-space: nowrap; /* prevent breaking into multiple lines */
            margin: 30px;
        }

        .entry-times, .entry-hours {
            display: flex;
            gap: var(--spacing-xl);
            flex-wrap: wrap;
        }

        .time-item, .hours-item {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            min-width: 60px;
        }

        .time-label, .hours-label {
            font-size: 0.75rem;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 500;
        }

        .time-value, .hours-value {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }

        .hours-item.overtime .hours-value {
            color: var(--accent-primary);
            font-weight: 700;
        }

        /* ===== STATS GRID IMPROVEMENTS ===== */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--spacing-xl);
        }

        .stat-card {
            padding: var(--spacing-xl);
            background-color: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            transition: all var(--transition-fast);
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-hover));
            transform: scaleX(0);
            transition: transform var(--transition-fast);
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .stat-card:hover::before {
            transform: scaleX(1);
        }

        .stat-card h3 {
            font-size: 1.125rem;
            color: var(--text-primary);
            margin-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: var(--spacing-sm);
            font-weight: 600;
        }

        .stat-items {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-sm) 0;
            border-bottom: 1px solid transparent;
            transition: all var(--transition-fast);
        }

        .stat-item:hover {
            border-bottom-color: var(--border-color);
            padding-left: var(--spacing-sm);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .stat-value {
            font-weight: 600;
            color: var(--text-primary);
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 0.875rem;
        }

        .stat-value.highlight {
            color: var(--accent-primary);
            font-weight: 700;
            font-size: 1rem;
        }

        .stat-value.success {
            color: #34c759;
        }

        .stat-value.warning {
            color: #ff9500;
        }

        /* ===== OVERTIME SECTION IMPROVEMENTS ===== */
        .overtime-section {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-lg);
            height: 100%;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
        }

        .section-header h3 {
            margin-bottom: 0;
            font-size: 1.125rem;
            font-weight: 600;
        }

        .overtime-request {
            padding: var(--spacing-md);
            background-color: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border-left: 4px solid var(--border-color);
            margin-bottom: var(--spacing-md);
            transition: all var(--transition-fast);
            position: relative;
            overflow: hidden;
        }

        .overtime-request::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: inherit;
            transition: width var(--transition-fast);
        }

        .overtime-request:hover {
            transform: translateX(4px);
            box-shadow: var(--shadow-md);
        }

        .overtime-request:hover::before {
            width: 8px;
        }

        .overtime-request.overtime-pending {
            border-left-color: #ff9500;
        }

        .overtime-request.overtime-approved {
            border-left-color: #34c759;
        }

        .overtime-request.overtime-denied {
            border-left-color: #ff3b30;
        }

        .request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-sm);
            flex-wrap: wrap;
            gap: var(--spacing-sm);
        }

        .request-date {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .request-status {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-size: 0.875rem;
            padding: var(--spacing-xs) var(--spacing-sm);
            background-color: var(--bg-primary);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }

        .request-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--spacing-sm);
        }

        .detail-item {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }

        .detail-label {
            font-size: 0.75rem;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 500;
        }

        .detail-value {
            font-size: 0.875rem;
            color: var(--text-primary);
            font-weight: 500;
            word-break: break-word;
        }

        /* ===== EMPTY STATE IMPROVEMENTS ===== */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-2xl);
            text-align: center;
            color: var(--text-secondary);
            min-height: 200px;
        }

        .empty-icon {
            font-size: 3rem;
            margin-bottom: var(--spacing-md);
            opacity: 0.6;
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        .empty-message {
            font-size: 1.125rem;
            margin-bottom: 0;
            font-weight: 500;
        }

        /* ===== MODAL IMPROVEMENTS ===== */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
            opacity: 0;
            visibility: hidden;
            transition: all var(--transition-normal);
        }

        .modal-overlay[style*="flex"] {
            opacity: 1;
            visibility: visible;
        }

        .modal {
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            transform: scale(0.9) translateY(20px);
            transition: transform var(--transition-normal);
        }

        .modal-overlay[style*="flex"] .modal {
            transform: scale(1) translateY(0);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-xl);
            border-bottom: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
        }

        .modal-title {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.25rem;
            font-weight: 600;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            padding: var(--spacing-sm);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-md);
            transition: all var(--transition-fast);
        }

        .modal-close:hover {
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            transform: scale(1.1);
        }

        .modal-body {
            padding: var(--spacing-xl);
            overflow-y: auto;
        }

        .modal-footer {
            display: flex;
            gap: var(--spacing-md);
            justify-content: flex-end;
            padding: var(--spacing-xl);
            border-top: 1px solid var(--border-color);
            background-color: var(--bg-secondary);
        }

        /* ===== FORM IMPROVEMENTS ===== */
        .form-group {
            margin-bottom: var(--spacing-lg);
        }

        .form-label {
            display: block;
            margin-bottom: var(--spacing-sm);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: var(--spacing-md);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 0.875rem;
            font-family: inherit;
            transition: all var(--transition-fast);
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 4px var(--accent-light);
            background-color: var(--bg-primary);
        }

        .form-help {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-top: var(--spacing-xs);
            font-style: italic;
        }

        /* ===== BUTTON IMPROVEMENTS ===== */
        .btn {
            padding: var(--spacing-md) var(--spacing-lg);
            border: 2px solid transparent;
            border-radius: var(--radius-lg);
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-fast);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-sm);
            font-size: 0.875rem;
            position: relative;
            overflow: hidden;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left var(--transition-normal);
        }

        .btn:hover::before {
            left: 100%;
        }

        .btn:focus {
            outline: 3px solid var(--accent-light);
            outline-offset: 2px;
        }

        .btn-primary {
            background-color: var(--accent-primary);
            color: white;
            border-color: var(--accent-primary);
        }

        .btn-primary:hover {
            background-color: var(--accent-hover);
            border-color: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            border-color: var(--border-color);
        }

        .btn-secondary:hover {
            background-color: var(--bg-tertiary);
            border-color: var(--accent-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        /* ===== NOTIFICATION IMPROVEMENTS ===== */
        .notification {
            padding: var(--spacing-md) var(--spacing-lg);
            border-radius: var(--radius-lg);
            color: white;
            font-weight: 500;
            margin-bottom: var(--spacing-md);
            transform: translateX(100%);
            transition: transform var(--transition-normal);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid rgba(255, 255, 255, 0.3);
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification-success {
            background: linear-gradient(135deg, #34c759, #28a745);
        }

        .notification-error {
            background: linear-gradient(135deg, #ff3b30, #dc3545);
        }

        .notification-info {
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
        }

        /* ===== RESPONSIVE DESIGN IMPROVEMENTS ===== */
        @media (max-width: 1024px) {
            .tiles-grid.grid-2 {
                grid-template-columns: 1fr;
            }
            
            .tile-large {
                grid-column: 1;
            }
        }

        @media (max-width: 768px) {
            .page-header {
                padding: var(--spacing-lg);
            }

            .header-content {
                flex-direction: column;
                align-items: stretch;
                gap: var(--spacing-lg);
            }

            .header-title {
                min-width: auto;
            }

            .header-title h1 {
                font-size: 1.5rem;
            }

            .header-actions {
                flex-direction: column;
                gap: var(--spacing-md);
            }

            .employee-info {
                min-width: auto;
            }

            .quick-actions {
                padding: var(--spacing-lg);
            }

            .actions-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-sm);
            }

            .action-btn {
                min-height: 100px;
                padding: var(--spacing-md);
            }

            .action-icon {
                font-size: 24px;
            }

            .current-status {
                padding-top: var(--spacing-lg);
            }

            .summary-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-sm);
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .entry-card {
                flex-direction: column;
                gap: var(--spacing-sm);
            }

            .entry-date {
                align-self: flex-start;
                min-width: auto;
            }

            .entry-times, .entry-hours {
                flex-wrap: wrap;
                gap: var(--spacing-md);
            }

            .modal {
                width: 95%;
                margin: var(--spacing-md);
            }

            .modal-header, .modal-body, .modal-footer {
                padding: var(--spacing-lg);
            }
        }

        @media (max-width: 480px) {
            .header-title h1 {
                font-size: 1.25rem;
            }

            .actions-grid {
                grid-template-columns: 1fr;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .request-details {
                grid-template-columns: 1fr;
            }

            .request-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .employee-meta {
                flex-direction: column;
                gap: var(--spacing-xs);
            }

            .header-controls {
                flex-direction: column;
                width: 100%;
            }

            .header-controls .form-select {
                width: 100%;
            }
        }

        /* ===== ACCESSIBILITY IMPROVEMENTS ===== */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* ===== PRINT STYLES ===== */
        @media print {
            .quick-actions,
            .modal-overlay,
            .notification,
            .btn,
            .header-controls {
                display: none !important;
            }

            .page-header,
            .tile,
            .entry-card,
            .overtime-request {
                break-inside: avoid;
                box-shadow: none !important;
                border: 1px solid #ccc !important;
            }

            .tiles-grid {
                display: block !important;
            }

            .tile {
                margin-bottom: 1rem !important;
            }
        }
    </style>
</body>
</html>
