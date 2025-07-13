<?php
// Include authentication and database connection
require_once 'auth.php';
require_once 'db.php';

// Check if user is admin
if ($_SESSION['role'] !== 'admin') {
    header('Location: dashboard.php');
    exit();
}

// Initialize variables
$message = '';
$messageType = '';
$attendanceRecords = [];
$employees = [];
$stats = [
    'totalRecords' => 0,
    'presentToday' => 0,
    'absentToday' => 0,
    'lateToday' => 0,
    'avgHoursWeek' => 0
];

// Handle POST requests for CRUD operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add_attendance':
            $result = addAttendanceRecord($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'edit_attendance':
            $result = editAttendanceRecord($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'delete_attendance':
            $result = deleteAttendanceRecord($conn, $_POST['attendance_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'bulk_delete':
            $result = bulkDeleteAttendance($conn, $_POST['attendance_ids']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'clock_in':
            $result = clockIn($conn, $_POST['employee_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'clock_out':
            $result = clockOut($conn, $_POST['employee_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'start_break':
            $result = startBreak($conn, $_POST['attendance_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'end_break':
            $result = endBreak($conn, $_POST['attendance_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
    }
}

// Get filter parameters
$employeeFilter = $_GET['employee'] ?? '';
$statusFilter = $_GET['status'] ?? '';
$dateFromFilter = $_GET['date_from'] ?? date('Y-m-01');
$dateToFilter = $_GET['date_to'] ?? date('Y-m-d');
$searchFilter = $_GET['search'] ?? '';
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$recordsPerPage = 25;
$offset = ($page - 1) * $recordsPerPage;

// Build WHERE clause for filters
$whereConditions = [];
$params = [];
$types = '';

if (!empty($employeeFilter)) {
    $whereConditions[] = "a.employee_id = ?";
    $params[] = $employeeFilter;
    $types .= 'i';
}

if (!empty($statusFilter)) {
    $whereConditions[] = "a.status = ?";
    $params[] = $statusFilter;
    $types .= 's';
}

if (!empty($dateFromFilter)) {
    $whereConditions[] = "a.date >= ?";
    $params[] = $dateFromFilter;
    $types .= 's';
}

if (!empty($dateToFilter)) {
    $whereConditions[] = "a.date <= ?";
    $params[] = $dateToFilter;
    $types .= 's';
}

if (!empty($searchFilter)) {
    $whereConditions[] = "(e.firstName LIKE ? OR e.lastName LIKE ? OR e.employeeCode LIKE ?)";
    $searchTerm = '%' . $searchFilter . '%';
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    $types .= 'sss';
}

$whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

// Functions for CRUD operations
function addAttendanceRecord($conn, $data) {
    $required = ['employee_id', 'date', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return ['message' => ucfirst(str_replace('_', ' ', $field)) . ' is required', 'type' => 'error'];
        }
    }
    
    // Check for duplicate record
    $checkSql = "SELECT id FROM attendance WHERE employee_id = ? AND date = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'is', $data['employee_id'], $data['date']);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) > 0) {
        return ['message' => 'Attendance record already exists for this date', 'type' => 'error'];
    }
    
    $sql = "INSERT INTO attendance (employee_id, date, time_in, time_out, lunch_start, lunch_end, status, hours_worked, overtime_hours, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $totalHours = calculateTotalHours($data['time_in'] ?? null, $data['time_out'] ?? null, $data['lunch_start'] ?? null, $data['lunch_end'] ?? null);
    $overtimeHours = max(0, $totalHours - 8);
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'issssssdds',
        $data['employee_id'],
        $data['date'],
        $data['time_in'] ?? null,
        $data['time_out'] ?? null,
        $data['lunch_start'] ?? null,
        $data['lunch_end'] ?? null,
        $data['status'],
        $totalHours,
        $overtimeHours,
        $data['notes'] ?? ''
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Attendance record added successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error adding attendance record: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function editAttendanceRecord($conn, $data) {
    $attendanceId = $data['attendance_id'];
    
    $required = ['employee_id', 'date', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return ['message' => ucfirst(str_replace('_', ' ', $field)) . ' is required', 'type' => 'error'];
        }
    }
    
    $totalHours = calculateTotalHours($data['time_in'] ?? null, $data['time_out'] ?? null, $data['lunch_start'] ?? null, $data['lunch_end'] ?? null);
    $overtimeHours = max(0, $totalHours - 8);
    
    $sql = "UPDATE attendance SET employee_id = ?, date = ?, time_in = ?, time_out = ?, lunch_start = ?, lunch_end = ?, status = ?, hours_worked = ?, overtime_hours = ?, notes = ?, updated_at = NOW() WHERE id = ?";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'issssssdsi',
        $data['employee_id'],
        $data['date'],
        $data['time_in'] ?? null,
        $data['time_out'] ?? null,
        $data['lunch_start'] ?? null,
        $data['lunch_end'] ?? null,
        $data['status'],
        $totalHours,
        $overtimeHours,
        $data['notes'] ?? '',
        $attendanceId
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Attendance record updated successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error updating attendance record: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function deleteAttendanceRecord($conn, $attendanceId) {
    $sql = "DELETE FROM attendance WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'i', $attendanceId);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Attendance record deleted successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error deleting attendance record: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function bulkDeleteAttendance($conn, $attendanceIds) {
    if (empty($attendanceIds) || !is_array($attendanceIds)) {
        return ['message' => 'No records selected for deletion', 'type' => 'error'];
    }
    
    $placeholders = str_repeat('?,', count($attendanceIds) - 1) . '?';
    $sql = "DELETE FROM attendance WHERE id IN ($placeholders)";
    $stmt = mysqli_prepare($conn, $sql);
    
    $types = str_repeat('i', count($attendanceIds));
    mysqli_stmt_bind_param($stmt, $types, ...$attendanceIds);
    
    if (mysqli_stmt_execute($stmt)) {
        $deletedCount = mysqli_stmt_affected_rows($stmt);
        return ['message' => "$deletedCount attendance records deleted successfully", 'type' => 'success'];
    } else {
        return ['message' => 'Error deleting attendance records: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function clockIn($conn, $employeeId) {
    $today = date('Y-m-d');
    $currentTime = date('H:i:s');
    
    // Check if already clocked in today
    $checkSql = "SELECT id, time_in FROM attendance WHERE employee_id = ? AND date = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'is', $employeeId, $today);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) > 0) {
        $record = mysqli_fetch_assoc($checkResult);
        if ($record['time_in']) {
            return ['message' => 'Already clocked in today', 'type' => 'error'];
        }
    }
    
    // Insert or update attendance record
    $sql = "INSERT INTO attendance (employee_id, date, time_in, status, created_at) VALUES (?, ?, ?, 'present', NOW()) ON DUPLICATE KEY UPDATE time_in = ?, status = 'present', updated_at = NOW()";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'isss', $employeeId, $today, $currentTime, $currentTime);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Clocked in successfully at ' . date('g:i A', strtotime($currentTime)), 'type' => 'success'];
    } else {
        return ['message' => 'Error clocking in: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function clockOut($conn, $employeeId) {
    $today = date('Y-m-d');
    $currentTime = date('H:i:s');
    
    // Check if clocked in today
    $checkSql = "SELECT id, time_in, lunch_start, lunch_end FROM attendance WHERE employee_id = ? AND date = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'is', $employeeId, $today);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) === 0) {
        return ['message' => 'No clock-in record found for today', 'type' => 'error'];
    }
    
    $record = mysqli_fetch_assoc($checkResult);
    if (!$record['time_in']) {
        return ['message' => 'Must clock in first', 'type' => 'error'];
    }
    
    $totalHours = calculateTotalHours($record['time_in'], $currentTime, $record['lunch_start'], $record['lunch_end']);
    $overtimeHours = max(0, $totalHours - 8);
    
    $sql = "UPDATE attendance SET time_out = ?, hours_worked = ?, overtime_hours = ?, updated_at = NOW() WHERE employee_id = ? AND date = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'sddis', $currentTime, $totalHours, $overtimeHours, $employeeId, $today);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Clocked out successfully at ' . date('g:i A', strtotime($currentTime)), 'type' => 'success'];
    } else {
        return ['message' => 'Error clocking out: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function startBreak($conn, $attendanceId) {
    $currentTime = date('H:i:s');
    
    $sql = "UPDATE attendance SET lunch_start = ?, updated_at = NOW() WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'si', $currentTime, $attendanceId);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Break started at ' . date('g:i A', strtotime($currentTime)), 'type' => 'success'];
    } else {
        return ['message' => 'Error starting break: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function endBreak($conn, $attendanceId) {
    $currentTime = date('H:i:s');
    
    $sql = "UPDATE attendance SET lunch_end = ?, updated_at = NOW() WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'si', $currentTime, $attendanceId);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Break ended at ' . date('g:i A', strtotime($currentTime)), 'type' => 'success'];
    } else {
        return ['message' => 'Error ending break: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function calculateTotalHours($timeIn, $timeOut, $breakStart = null, $breakEnd = null) {
    if (!$timeIn || !$timeOut) {
        return 0;
    }
    
    $start = new DateTime($timeIn);
    $end = new DateTime($timeOut);
    $totalMinutes = ($end->getTimestamp() - $start->getTimestamp()) / 60;
    
    // Subtract break time if both break start and end are set
    if ($breakStart && $breakEnd) {
        $breakStartTime = new DateTime($breakStart);
        $breakEndTime = new DateTime($breakEnd);
        $breakMinutes = ($breakEndTime->getTimestamp() - $breakStartTime->getTimestamp()) / 60;
        $totalMinutes -= $breakMinutes;
    }
    
    return round($totalMinutes / 60, 2);
}

// Fetch attendance records with filters
$sql = "SELECT a.*, e.firstName, e.lastName, e.employeeCode, e.department, e.position 
        FROM attendance a 
        JOIN employees e ON a.employee_id = e.id 
        $whereClause 
        ORDER BY a.date DESC, a.time_in DESC 
        LIMIT ? OFFSET ?";

$params[] = $recordsPerPage;
$params[] = $offset;
$types .= 'ii';

$stmt = mysqli_prepare($conn, $sql);
if (!empty($params)) {
    mysqli_stmt_bind_param($stmt, $types, ...$params);
}
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

while ($row = mysqli_fetch_assoc($result)) {
    $attendanceRecords[] = $row;
}

// Get total count for pagination
$countSql = "SELECT COUNT(*) as total FROM attendance a JOIN employees e ON a.employee_id = e.id $whereClause";
$countParams = array_slice($params, 0, -2); // Remove limit and offset
$countTypes = substr($types, 0, -2);

$countStmt = mysqli_prepare($conn, $countSql);
if (!empty($countParams)) {
    mysqli_stmt_bind_param($countStmt, $countTypes, ...$countParams);
}
mysqli_stmt_execute($countStmt);
$countResult = mysqli_stmt_get_result($countStmt);
$totalRecords = mysqli_fetch_assoc($countResult)['total'];
$totalPages = ceil($totalRecords / $recordsPerPage);

// Fetch employees for dropdowns
$empSql = "SELECT id, firstName, lastName, employeeCode FROM employees WHERE status = 'active' ORDER BY firstName, lastName";
$empResult = mysqli_query($conn, $empSql);
while ($row = mysqli_fetch_assoc($empResult)) {
    $employees[] = $row;
}

// Calculate statistics
$today = date('Y-m-d');
$weekStart = date('Y-m-d', strtotime('monday this week'));

$statsSql = "SELECT 
    COUNT(*) as totalRecords,
    SUM(CASE WHEN date = ? AND status = 'present' THEN 1 ELSE 0 END) as presentToday,
    SUM(CASE WHEN date = ? AND status = 'absent' THEN 1 ELSE 0 END) as absentToday,
    SUM(CASE WHEN date = ? AND status = 'late' THEN 1 ELSE 0 END) as lateToday,
    AVG(CASE WHEN date >= ? AND hours_worked > 0 THEN hours_worked ELSE NULL END) as avgHoursWeek
    FROM attendance";
$statsStmt = mysqli_prepare($conn, $statsSql);
mysqli_stmt_bind_param($statsStmt, 'ssss', $today, $today, $today, $weekStart);
mysqli_stmt_execute($statsStmt);
$statsResult = mysqli_stmt_get_result($statsStmt);
$stats = mysqli_fetch_assoc($statsResult);

// Get attendance for editing if edit parameter is present
$editAttendance = null;
if (isset($_GET['edit'])) {
    $editId = intval($_GET['edit']);
    $editSql = "SELECT a.*, e.firstName, e.lastName FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?";
    $editStmt = mysqli_prepare($conn, $editSql);
    mysqli_stmt_bind_param($editStmt, 'i', $editId);
    mysqli_stmt_execute($editStmt);
    $editResult = mysqli_stmt_get_result($editStmt);
    
    if (mysqli_num_rows($editResult) > 0) {
        $editAttendance = mysqli_fetch_assoc($editResult);
    }
}

// Get attendance for viewing if view parameter is present
$viewAttendance = null;
if (isset($_GET['view'])) {
    $viewId = intval($_GET['view']);
    $viewSql = "SELECT a.*, e.firstName, e.lastName, e.employeeCode, e.department, e.position FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?";
    $viewStmt = mysqli_prepare($conn, $viewSql);
    mysqli_stmt_bind_param($viewStmt, 'i', $viewId);
    mysqli_stmt_execute($viewStmt);
    $viewResult = mysqli_stmt_get_result($viewStmt);
    
    if (mysqli_num_rows($viewResult) > 0) {
        $viewAttendance = mysqli_fetch_assoc($viewResult);
    }
}

function getStatusIcon($status) {
    $icons = [
        'present' => '✅',
        'absent' => '❌',
        'late' => '⏰',
        'half_day' => '🕐',
        'on_break' => '☕'
    ];
    return $icons[$status] ?? '❓';
}

function formatTime($time) {
    return $time ? date('g:i A', strtotime($time)) : '-';
}

function formatHours($hours) {
    if ($hours <= 0) return '-';
    $h = floor($hours);
    $m = round(($hours - $h) * 60);
    return sprintf('%dh %02dm', $h, $m);
}
// Include header
include 'header.php';
?>

            <!-- Header -->
            <!-- Header -->
            <header class="page-header">
                <div class="header-top">
                    <div class="header-title">
                        <h1>Attendance Management</h1>
                        <p>Comprehensive attendance tracking, clock-in/out management, and reporting</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-outline" onclick="showCalendarView()" title="Calendar view">
                            <span class="btn-icon">📅</span>
                            <span class="btn-text">Calendar</span>
                        </button>
                        <button class="btn btn-outline" onclick="exportAttendance()" title="Export attendance data">
                            <span class="btn-icon">📥</span>
                            <span class="btn-text">Export</span>
                        </button>
                        <button class="btn btn-secondary" onclick="location.reload()" title="Refresh data">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Refresh</span>
                        </button>
                        <button class="btn btn-primary" onclick="openAttendanceModal()">
                            <span class="btn-icon">📝➕</span>
                            <span class="btn-text">Add Record</span>
                        </button>
                    </div>
                </div>
                
                <!-- Filters and Search -->
                <form method="GET" class="header-filters"><br>
                    <div class="filter-group">
                        <label for="employee" class="filter-label">Employee:</label>
                        <select name="employee" id="employee" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Employees</option>
                            <?php foreach ($employees as $emp): ?>
                                <option value="<?php echo htmlspecialchars($emp['id']); ?>" <?php echo $employeeFilter == $emp['id'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($emp['firstName'] . ' ' . $emp['lastName'] . ' (' . $emp['employeeCode'] . ')'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div><br>
                    <div class="filter-group">
                        <label for="status" class="filter-label">Status:</label>
                        <select name="status" id="status" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Status</option>
                            <option value="present" <?php echo $statusFilter === 'present' ? 'selected' : ''; ?>>Present</option>
                            <option value="absent" <?php echo $statusFilter === 'absent' ? 'selected' : ''; ?>>Absent</option>
                            <option value="late" <?php echo $statusFilter === 'late' ? 'selected' : ''; ?>>Late</option>
                            <option value="half_day" <?php echo $statusFilter === 'half_day' ? 'selected' : ''; ?>>Half Day</option>
                            <option value="on_break" <?php echo $statusFilter === 'on_break' ? 'selected' : ''; ?>>On Break</option>
                        </select>
                    </div> <br>
                    <div class="filter-group">
                        <label for="date_from" class="filter-label">From Date:</label>
                        <input type="date" name="date_from" id="date_from" class="filter-input" value="<?php echo htmlspecialchars($dateFromFilter); ?>" onchange="this.form.submit()">
                    </div><br>
                    <div class="filter-group">
                        <label for="date_to" class="filter-label">To Date:</label>
                        <input type="date" name="date_to" id="date_to" class="filter-input" value="<?php echo htmlspecialchars($dateToFilter); ?>" onchange="this.form.submit()">
                    </div><br>
                    <div class="filter-group">
                        <label for="search" class="filter-label">Search:</label>
                        <input type="text" name="search" id="search" class="filter-input" placeholder="Search employees..." value="<?php echo htmlspecialchars($searchFilter); ?>" onchange="this.form.submit()">
                    </div><br>
                </form>
            </header>

            <!-- Message Display -->
            <?php if (!empty($message)): ?>
                <div class="alert alert-<?php echo $messageType; ?>" style="margin: 1rem 0; padding: 1rem; border-radius: 6px; <?php echo $messageType === 'success' ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' : 'background: #fecaca; color: #991b1b; border: 1px solid #fca5a5;'; ?>">
                    <?php echo htmlspecialchars($message); ?>
                </div>
            <?php endif; ?>

            <!-- Content Area -->
            <div class="content-area">
                <!-- Statistics Cards -->
                <div class="stats-grid">
                    <div class="stat-card stat-total">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['totalRecords']; ?></div>
                            <div class="stat-label">Total Records</div>
                        </div>
                    </div>
                    <div class="stat-card stat-present">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['presentToday']; ?></div>
                            <div class="stat-label">Present Today</div>
                        </div>
                    </div>
                    <div class="stat-card stat-absent">
                        <div class="stat-icon">❌</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['absentToday']; ?></div>
                            <div class="stat-label">Absent Today</div>
                        </div>
                    </div>
                    <div class="stat-card stat-late">
                        <div class="stat-icon">⏰</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['lateToday']; ?></div>
                            <div class="stat-label">Late Today</div>
                        </div>
                    </div>
                    <div class="stat-card stat-hours">
                        <div class="stat-icon">🕐</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo number_format($stats['avgHoursWeek'], 1); ?>h</div>
                            <div class="stat-label">Avg Hours/Week</div>
                        </div>
                    </div>
                </div>

                <!-- Attendance Table -->
                <div class="card">
                    <div class="card-header">
                        <h3>Attendance Records</h3>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-outline" onclick="toggleBulkActions()" id="bulkToggleBtn">
                                <span class="btn-icon">☑️</span>
                                <span class="btn-text">Bulk Actions</span>
                            </button>
                        </div>
                    </div>
                    <div class="card-content">
                        <?php if (empty($attendanceRecords)): ?>
                            <div class="empty-state">
                                <div class="empty-icon">📝</div>
                                <h3>No attendance records found</h3>
                                <p>No attendance records match the selected filters. Try adjusting your search criteria or add new records.</p>
                                <button class="btn btn-primary" onclick="openAttendanceModal()">
                                    <span class="btn-icon">📝➕</span>
                                    <span class="btn-text">Add First Record</span>
                                </button>
                            </div>
                        <?php else: ?>
                            <!-- Bulk Actions Bar -->
                            <div class="bulk-actions-bar hidden" id="bulkActionsBar">
                                <div class="bulk-actions-info">
                                    <span id="selectedCount">0</span> records selected
                                </div>
                                <div class="bulk-actions-buttons">
                                    <button class="btn btn-sm btn-danger" onclick="bulkDeleteRecords()">
                                        <span class="btn-icon">🗑️</span>
                                        <span class="btn-text">Delete Selected</span>
                                    </button>
                                    <button class="btn btn-sm btn-outline" onclick="clearSelection()">
                                        <span class="btn-text">Clear Selection</span>
                                    </button>
                                </div>
                            </div>

                            <div class="table-container">
                                <table class="table attendance-table">
                                    <thead>
                                        <tr>
                                            <th class="bulk-checkbox-header hidden">
                                                <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                            </th>
                                            <th>Date</th>
                                            <th>Employee</th>
                                            <th>Department</th>
                                            <th>Clock In</th>
                                            <th>Clock Out</th>
                                            <th>Break</th>
                                            <th>Total Hours</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($attendanceRecords as $record): ?>
                                            <tr>
                                                <td class="bulk-checkbox-cell hidden">
                                                    <input type="checkbox" class="record-checkbox" value="<?php echo $record['id']; ?>" onchange="updateSelectedCount()">
                                                </td>
                                                <td>
                                                    <div class="date-info">
                                                        <div class="date-primary"><?php echo date('M d, Y', strtotime($record['date'])); ?></div>
                                                        <div class="date-secondary"><?php echo date('l', strtotime($record['date'])); ?></div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="employee-info">
                                                        <div class="employee-name"><?php echo htmlspecialchars($record['firstName'] . ' ' . $record['lastName']); ?></div>
                                                        <div class="employee-code"><?php echo htmlspecialchars($record['employeeCode']); ?></div>
                                                    </div>
                                                </td>
                                                <td><?php echo htmlspecialchars($record['department']); ?></td>
                                                <td>
                                                    <span class="time-display"><?php echo formatTime($record['time_in']); ?></span>
                                                </td>
                                                <td>
                                                    <span class="time-display"><?php echo formatTime($record['time_out']); ?></span>
                                                </td>
                                                <td>
                                                    <?php if ($record['lunch_start'] && $record['lunch_end']): ?>
                                                        <div class="break-info">
                                                            <div><?php echo formatTime($record['lunch_start']); ?> - <?php echo formatTime($record['lunch_end']); ?></div>
                                                        </div>
                                                    <?php elseif ($record['lunch_start']): ?>
                                                        <div class="break-info break-active">
                                                            <div>Started: <?php echo formatTime($record['lunch_start']); ?></div>
                                                            <button class="btn btn-xs btn-primary" onclick="endBreak(<?php echo $record['id']; ?>)">End Break</button>
                                                        </div>
                                                    <?php else: ?>
                                                        <span class="no-break">-</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <div class="hours-info">
                                                        <div class="total-hours"><?php echo formatHours($record['hours_worked']); ?></div>
                                                        <?php if ($record['overtime_hours'] > 0): ?>
                                                            <div class="overtime-hours">OT: <?php echo formatHours($record['overtime_hours']); ?></div>
                                                        <?php endif; ?>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="status-badge status-<?php echo $record['status']; ?>">
                                                        <?php echo getStatusIcon($record['status']); ?> <?php echo ucfirst(str_replace('_', ' ', $record['status'])); ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-sm btn-outline" onclick="viewAttendance(<?php echo $record['id']; ?>)" title="View Details">
                                                            <span class="btn-icon">👁️</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline" onclick="editAttendance(<?php echo $record['id']; ?>)" title="Edit Record">
                                                            <span class="btn-icon">✏️</span>
                                                        </button>
                                                        <?php if (!$record['lunch_start'] && $record['time_in'] && !$record['time_out']): ?>
                                                            <button class="btn btn-sm btn-secondary" onclick="startBreak(<?php echo $record['id']; ?>)" title="Start Break">
                                                                <span class="btn-icon">☕</span>
                                                            </button>
                                                        <?php endif; ?>
                                                        <button class="btn btn-sm btn-danger" onclick="deleteAttendance(<?php echo $record['id']; ?>)" title="Delete Record">
                                                            <span class="btn-icon">🗑️</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Pagination -->
                            <?php if ($totalPages > 1): ?>
                                <div class="pagination">
                                    <?php if ($page > 1): ?>
                                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page - 1])); ?>" class="btn btn-outline">Previous</a>
                                    <?php endif; ?>

                                    <?php for ($i = max(1, $page - 2); $i <= min($totalPages, $page + 2); $i++): ?>
                                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>" 
                                           class="btn <?php echo ($i == $page) ? 'btn-primary' : 'btn-outline'; ?>">
                                            <?php echo $i; ?>
                                        </a>
                                    <?php endfor; ?>

                                    <?php if ($page < $totalPages): ?>
                                        <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page + 1])); ?>" class="btn btn-outline">Next</a>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </main>

    <!-- Add/Edit Attendance Modal -->
    <div class="modal-overlay hidden" id="attendanceModal">
        <div class="modal large">
            <div class="modal-header">
                <h3 id="attendanceModalTitle">Add Attendance Record</h3>
                <button class="modal-close" onclick="closeAttendanceModal()" aria-label="Close modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-content">
                <form id="attendanceForm" method="POST" class="form">
                    <input type="hidden" name="action" id="attendanceFormAction" value="add_attendance">
                    <input type="hidden" name="attendance_id" id="attendanceId">
                    
                    <div class="form-section">
                        <h4>Basic Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="attendanceEmployee" class="form-label">Employee *</label>
                                <select name="employee_id" id="attendanceEmployee" class="form-input" required>
                                    <option value="">Select Employee</option>
                                    <?php foreach ($employees as $emp): ?>
                                        <option value="<?php echo htmlspecialchars($emp['id']); ?>">
                                            <?php echo htmlspecialchars($emp['firstName'] . ' ' . $emp['lastName'] . ' (' . $emp['employeeCode'] . ')'); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="attendanceDate" class="form-label">Date *</label>
                                <input type="date" name="date" id="attendanceDate" class="form-input" required value="<?php echo date('Y-m-d'); ?>">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="attendanceStatus" class="form-label">Status *</label>
                                <select name="status" id="attendanceStatus" class="form-input" required>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="late">Late</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="on_break">On Break</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Time Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="attendanceTimeIn" class="form-label">Clock In Time</label>
                                <input type="time" name="time_in" id="attendanceTimeIn" class="form-input">
                            </div>
                            <div class="form-group">
                                <label for="attendanceTimeOut" class="form-label">Clock Out Time</label>
                                <input type="time" name="time_out" id="attendanceTimeOut" class="form-input">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="attendanceBreakStart" class="form-label">Break Start</label>
                                <input type="time" name="lunch_start" id="attendanceBreakStart" class="form-input">
                            </div>
                            <div class="form-group">
                                <label for="attendanceBreakEnd" class="form-label">Break End</label>
                                <input type="time" name="lunch_end" id="attendanceBreakEnd" class="form-input">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Additional Information</h4>
                        <div class="form-group">
                            <label for="attendanceNotes" class="form-label">Notes</label>
                            <textarea name="notes" id="attendanceNotes" class="form-input" rows="3" placeholder="Optional notes about this attendance record"></textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeAttendanceModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span class="btn-text">Save Record</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Clock In/Out Modal -->
    <div class="modal-overlay hidden" id="clockModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Clock In/Out</h3>
                <button class="modal-close" onclick="closeClockModal()" aria-label="Close modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-content">
                <div class="clock-display">
                    <div class="current-time" id="currentTime"><?php echo date('g:i:s A'); ?></div>
                    <div class="current-date"><?php echo date('l, F j, Y'); ?></div>
                </div>
                
                <form id="clockForm" method="POST" class="form">
                    <input type="hidden" name="action" id="clockAction">
                    
                    <div class="form-group">
                        <label for="clockEmployee" class="form-label">Employee *</label>
                        <select name="employee_id" id="clockEmployee" class="form-input" required>
                            <option value="">Select Employee</option>
                            <?php foreach ($employees as $emp): ?>
                                <option value="<?php echo htmlspecialchars($emp['id']); ?>">
                                    <?php echo htmlspecialchars($emp['firstName'] . ' ' . $emp['lastName'] . ' (' . $emp['employeeCode'] . ')'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="clock-actions">
                        <button type="button" class="btn btn-primary btn-large" onclick="clockIn()">
                            <span class="btn-icon">🕐</span>
                            <span class="btn-text">Clock In</span>
                        </button>
                        <button type="button" class="btn btn-secondary btn-large" onclick="clockOut()">
                            <span class="btn-icon">🕕</span>
                            <span class="btn-text">Clock Out</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- View Attendance Modal -->
    <?php if ($viewAttendance): ?>
        <div class="modal-overlay active" id="viewAttendanceModal">
            <div class="modal large">
                <div class="modal-header">
                    <h3>Attendance Details</h3>
                    <button class="modal-close" onclick="closeViewModal()" aria-label="Close modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="attendance-details">
                        <div class="detail-section">
                            <h4>Employee Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Employee</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewAttendance['firstName'] . ' ' . $viewAttendance['lastName']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Employee ID</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewAttendance['employeeCode']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Department</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewAttendance['department']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Position</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewAttendance['position']); ?></div>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Attendance Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Date</label>
                                    <div class="detail-value"><?php echo date('F j, Y (l)', strtotime($viewAttendance['date'])); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Status</label>
                                    <div class="detail-value">
                                        <span class="status-badge status-<?php echo $viewAttendance['status']; ?>">
                                            <?php echo getStatusIcon($viewAttendance['status']); ?> <?php echo ucfirst(str_replace('_', ' ', $viewAttendance['status'])); ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Clock In</label>
                                    <div class="detail-value"><?php echo formatTime($viewAttendance['time_in']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Clock Out</label>
                                    <div class="detail-value"><?php echo formatTime($viewAttendance['time_out']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Break Start</label>
                                    <div class="detail-value"><?php echo formatTime($viewAttendance['lunch_start']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Break End</label>
                                    <div class="detail-value"><?php echo formatTime($viewAttendance['lunch_end']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Total Hours</label>
                                    <div class="detail-value"><?php echo formatHours($viewAttendance['hours_worked']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Overtime Hours</label>
                                    <div class="detail-value"><?php echo formatHours($viewAttendance['overtime_hours']); ?></div>
                                </div>
                            </div>
                        </div>

                        <?php if ($viewAttendance['notes']): ?>
                        <div class="detail-section">
                            <h4>Notes</h4>
                            <div class="detail-value">
                                <?php echo nl2br(htmlspecialchars($viewAttendance['notes'])); ?>
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" onclick="closeViewModal()">
                            <span class="btn-text">Close</span>
                        </button>
                        <button type="button" class="btn btn-primary" onclick="editFromView(<?php echo $viewAttendance['id']; ?>)">
                            <span class="btn-icon">✏️</span>
                            <span class="btn-text">Edit Record</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <!-- Calendar View Modal -->
    <div class="modal-overlay hidden" id="calendarModal">
        <div class="modal extra-large">
            <div class="modal-header">
                <h3>Attendance Calendar</h3>
                <button class="modal-close" onclick="closeCalendarModal()" aria-label="Close modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-content">
                <div class="calendar-controls">
                    <button class="btn btn-outline" onclick="previousMonth()">‹ Previous</button>
                    <h4 id="calendarMonth"><?php echo date('F Y'); ?></h4>
                    <button class="btn btn-outline" onclick="nextMonth()">Next ›</button>
                </div>
                <div class="calendar-grid" id="calendarGrid">
                    <!-- Calendar will be populated by JavaScript -->
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="js/theme.js"></script>
    <script>
        // Global variables
        let bulkMode = false;
        let selectedRecords = new Set();
        let currentCalendarDate = new Date();

        // Modal functions
        function openAttendanceModal(attendanceId = null) {
            const modal = document.getElementById('attendanceModal');
            const form = document.getElementById('attendanceForm');
            const title = document.getElementById('attendanceModalTitle');
            const formAction = document.getElementById('attendanceFormAction');
            const attendanceIdField = document.getElementById('attendanceId');
            
            if (attendanceId) {
                title.textContent = 'Edit Attendance Record';
                formAction.value = 'edit_attendance';
                attendanceIdField.value = attendanceId;
                window.location.href = `employee-management.php?edit=${attendanceId}`;
                return;
            } else {
                title.textContent = 'Add Attendance Record';
                formAction.value = 'add_attendance';
                attendanceIdField.value = '';
                form.reset();
                document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
                document.getElementById('attendanceStatus').value = 'present';
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeAttendanceModal() {
            const modal = document.getElementById('attendanceModal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        function openClockModal() {
            const modal = document.getElementById('clockModal');
            modal.classList.remove('hidden');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateClock();
        }

        function closeClockModal() {
            const modal = document.getElementById('clockModal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        function updateClock() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        }

        function clockIn() {
            const employeeId = document.getElementById('clockEmployee').value;
            if (!employeeId) {
                alert('Please select an employee');
                return;
            }
            
            document.getElementById('clockAction').value = 'clock_in';
            document.getElementById('clockForm').submit();
        }

        function clockOut() {
            const employeeId = document.getElementById('clockEmployee').value;
            if (!employeeId) {
                alert('Please select an employee');
                return;
            }
            
            document.getElementById('clockAction').value = 'clock_out';
            document.getElementById('clockForm').submit();
        }

        function viewAttendance(attendanceId) {
            window.location.href = `employee-management.php?view=${attendanceId}`;
        }

        function editAttendance(attendanceId) {
            window.location.href = `employee-management.php?edit=${attendanceId}`;
        }

        function closeViewModal() {
            window.location.href = 'employee-management.php';
        }

        function editFromView(attendanceId) {
            window.location.href = `employee-management.php?edit=${attendanceId}`;
        }

        function deleteAttendance(attendanceId) {
            if (confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete_attendance">
                    <input type="hidden" name="attendance_id" value="${attendanceId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function startBreak(attendanceId) {
            if (confirm('Start break for this employee?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="start_break">
                    <input type="hidden" name="attendance_id" value="${attendanceId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function endBreak(attendanceId) {
            if (confirm('End break for this employee?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="end_break">
                    <input type="hidden" name="attendance_id" value="${attendanceId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        // Bulk actions
        function toggleBulkActions() {
            bulkMode = !bulkMode;
            const bulkElements = document.querySelectorAll('.bulk-checkbox-header, .bulk-checkbox-cell');
            const bulkBar = document.getElementById('bulkActionsBar');
            const toggleBtn = document.getElementById('bulkToggleBtn');
            
            if (bulkMode) {
                bulkElements.forEach(el => el.classList.remove('hidden'));
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = '<span class="btn-icon">☑️</span><span class="btn-text">Exit Bulk</span>';
            } else {
                bulkElements.forEach(el => el.classList.add('hidden'));
                bulkBar.classList.add('hidden');
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = '<span class="btn-icon">☑️</span><span class="btn-text">Bulk Actions</span>';
                clearSelection();
            }
        }

        function toggleSelectAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.record-checkbox');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAll.checked;
                if (selectAll.checked) {
                    selectedRecords.add(checkbox.value);
                } else {
                    selectedRecords.delete(checkbox.value);
                }
            });
            
            updateSelectedCount();
        }

        function updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.record-checkbox:checked');
            selectedRecords.clear();
            checkboxes.forEach(checkbox => selectedRecords.add(checkbox.value));
            
            const count = selectedRecords.size;
            document.getElementById('selectedCount').textContent = count;
            
            const bulkBar = document.getElementById('bulkActionsBar');
            if (count > 0) {
                bulkBar.classList.remove('hidden');
            } else {
                bulkBar.classList.add('hidden');
            }
        }

        function clearSelection() {
            selectedRecords.clear();
            document.querySelectorAll('.record-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.getElementById('selectAll').checked = false;
            updateSelectedCount();
        }

        function bulkDeleteRecords() {
            if (selectedRecords.size === 0) {
                alert('No records selected');
                return;
            }
            
            if (confirm(`Are you sure you want to delete ${selectedRecords.size} attendance records? This action cannot be undone.`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `<input type="hidden" name="action" value="bulk_delete">`;
                
                selectedRecords.forEach(id => {
                    form.innerHTML += `<input type="hidden" name="attendance_ids[]" value="${id}">`;
                });
                
                document.body.appendChild(form);
                form.submit();
            }
        }

        // Calendar functions
        function showCalendarView() {
            const modal = document.getElementById('calendarModal');
            modal.classList.remove('hidden');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            generateCalendar();
        }

        function closeCalendarModal() {
            const modal = document.getElementById('calendarModal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        function previousMonth() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            generateCalendar();
        }

        function nextMonth() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            generateCalendar();
        }

        function generateCalendar() {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            
            document.getElementById('calendarMonth').textContent = 
                monthNames[currentCalendarDate.getMonth()] + ' ' + currentCalendarDate.getFullYear();
            
            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';
            
            // Add day headers
            const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayHeaders.forEach(day => {
                const header = document.createElement('div');
                header.className = 'calendar-day-header';
                header.textContent = day;
                grid.appendChild(header);
            });
            
            // Get first day of month and number of days
            const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
            const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            // Generate calendar days
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                
                if (date.getMonth() !== currentCalendarDate.getMonth()) {
                    dayElement.classList.add('other-month');
                }
                
                if (date.toDateString() === new Date().toDateString()) {
                    dayElement.classList.add('today');
                }
                
                dayElement.innerHTML = `
                    <div class="calendar-day-number">${date.getDate()}</div>
                    <div class="calendar-day-content">
                        <!-- Attendance data would be loaded here -->
                    </div>
                `;
                
                grid.appendChild(dayElement);
            }
        }

        // Export function
        function exportAttendance() {
            const records = <?php echo json_encode($attendanceRecords); ?>;
            const headers = ['Date', 'Employee', 'Employee Code', 'Department', 'Clock In', 'Clock Out', 'Break Start', 'Break End', 'Total Hours', 'Overtime Hours', 'Status', 'Notes'];
            
            let csvContent = headers.join(',') + '\n';
            
            records.forEach(record => {
                const row = [
                    record.date,
                    `"${record.firstName} ${record.lastName}"`,
                    record.employeeCode,
                    `"${record.department}"`,
                    record.time_in || '',
                    record.time_out || '',
                    record.lunch_start || '',
                    record.lunch_end || '',
                    record.hours_worked || '',
                    record.overtime_hours || '',
                    record.status,
                    `"${(record.notes || '').replace(/"/g, '""')}"`
                ];
                
                csvContent += row.join(',') + '\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        // Auto-open modal if edit parameter is present
        <?php if ($editAttendance): ?>
            document.addEventListener('DOMContentLoaded', function() {
                openEditModal(<?php echo json_encode($editAttendance); ?>);
            });
            
            function openEditModal(attendance) {
                const modal = document.getElementById('attendanceModal');
                const title = document.getElementById('attendanceModalTitle');
                const formAction = document.getElementById('attendanceFormAction');
                const attendanceIdField = document.getElementById('attendanceId');
                
                title.textContent = 'Edit Attendance Record';
                formAction.value = 'edit_attendance';
                attendanceIdField.value = attendance.id;
                
                document.getElementById('attendanceEmployee').value = attendance.employee_id;
                document.getElementById('attendanceDate').value = attendance.date;
                document.getElementById('attendanceStatus').value = attendance.status;
                document.getElementById('attendanceTimeIn').value = attendance.time_in || '';
                document.getElementById('attendanceTimeOut').value = attendance.time_out || '';
                document.getElementById('attendanceBreakStart').value = attendance.lunch_start || '';
                document.getElementById('attendanceBreakEnd').value = attendance.lunch_end || '';
                document.getElementById('attendanceNotes').value = attendance.notes || '';
                
                modal.classList.remove('hidden');
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        <?php endif; ?>

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Update clock every second
            setInterval(updateClock, 1000);
            
            // Close modals when clicking outside
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('modal-overlay')) {
                    closeAttendanceModal();
                    closeClockModal();
                    closeCalendarModal();
                    closeViewModal();
                }
            });
            
            // Sidebar toggle functionality
            document.getElementById('sidebar-toggle')?.addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('collapsed');
            });
            
            document.getElementById('mobile-menu-toggle')?.addEventListener('click', function() {
                document.getElementById('sidebar').classList.toggle('mobile-open');
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.altKey) {
                    switch(e.key.toLowerCase()) {
                        case 'c':
                            e.preventDefault();
                            openClockModal();
                            break;
                        case 'a':
                            e.preventDefault();
                            openAttendanceModal();
                            break;
                        case 'e':
                            e.preventDefault();
                            exportAttendance();
                            break;
                        case 'v':
                            e.preventDefault();
                            showCalendarView();
                            break;
                    }
                }
            });
        });
    </script>

    <!-- Additional Styles -->
    <style>
        /* Stats Grid Layout */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-primary, #ffffff);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: var(--radius-md, 8px);
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.2s ease;
        }

        .stat-card:hover {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        .stat-icon {
            font-size: 1.5rem;
            opacity: 0.8;
            flex-shrink: 0;
        }

        .stat-info {
            min-width: 0;
        }

        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary, #111827);
            line-height: 1.2;
            margin-bottom: 0.25rem;
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary, #6b7280);
            font-weight: 500;
        }

        .stat-total { border-left: 4px solid #3b82f6; }
        .stat-present { border-left: 4px solid #22c55e; }
        .stat-absent { border-left: 4px solid #ef4444; }
        .stat-late { border-left: 4px solid #f59e0b; }
        .stat-hours { border-left: 4px solid #8b5cf6; }

        /* Attendance Table Styles */
        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .attendance-table th,
        .attendance-table td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            vertical-align: top;
        }

        .attendance-table th {
            background: var(--bg-secondary, #f9fafb);
            font-weight: 600;
            color: var(--text-primary, #111827);
            white-space: nowrap;
        }

        .attendance-table tbody tr:hover {
            background: var(--bg-secondary, #f9fafb);
        }

        .date-info {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
        }

        .date-primary {
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .date-secondary {
            font-size: 0.75rem;
            color: var(--text-tertiary, #9ca3af);
        }

        .employee-info {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
        }

        .employee-name {
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .employee-code {
            font-family: 'Courier New', monospace;
            background: var(--bg-tertiary, #f3f4f6);
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.75rem;
            display: inline-block;
            font-weight: 500;
        }

        .time-display {
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .break-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.75rem;
        }

        .break-active {
            color: #f59e0b;
            font-weight: 500;
        }

        .no-break {
            color: var(--text-tertiary, #9ca3af);
        }

        .hours-info {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
        }

        .total-hours {
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .overtime-hours {
            font-size: 0.75rem;
            color: #f59e0b;
            font-weight: 500;
        }

        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: capitalize;
        }

        .status-badge.status-present {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }

        .status-badge.status-absent {
            background: #fecaca;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        .status-badge.status-late {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }

        .status-badge.status-half_day {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #bfdbfe;
        }

        .status-badge.status-on_break {
            background: #f3e8ff;
            color: #7c3aed;
            border: 1px solid #e9d5ff;
        }

        /* Bulk Actions */
        .bulk-actions-bar {
            background: var(--bg-secondary, #f9fafb);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .bulk-actions-info {
            font-size: 0.875rem;
            color: var(--text-secondary, #6b7280);
            font-weight: 500;
        }

        .bulk-actions-buttons {
            display: flex;
            gap: 0.5rem;
        }

        .bulk-checkbox-header,
        .bulk-checkbox-cell {
            width: 40px;
            text-align: center;
        }

        /* Clock Modal */
        .clock-display {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: var(--bg-secondary, #f9fafb);
            border-radius: 8px;
        }

        .current-time {
            font-size: 3rem;
            font-weight: 700;
            color: var(--text-primary, #111827);
            font-family: 'Courier New', monospace;
            margin-bottom: 0.5rem;
        }

        .current-date {
            font-size: 1.125rem;
            color: var(--text-secondary, #6b7280);
        }

        .clock-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 1.5rem;
        }

        .btn-large {
            padding: 1rem 2rem;
            font-size: 1.125rem;
            min-width: 150px;
        }

        /* Calendar Styles */
        .modal.extra-large {
            max-width: 1000px;
            width: 95vw;
        }

        .calendar-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: var(--bg-secondary, #f9fafb);
            border-radius: 8px;
        }

        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
            background: var(--border-color, #e5e7eb);
            border-radius: 8px;
            overflow: hidden;
        }

        .calendar-day-header {
            background: var(--bg-secondary, #f9fafb);
            padding: 0.75rem;
            text-align: center;
            font-weight: 600;
            color: var(--text-secondary, #6b7280);
            font-size: 0.875rem;
        }

        .calendar-day {
            background: var(--bg-primary, #ffffff);
            min-height: 100px;
            padding: 0.5rem;
            position: relative;
        }

        .calendar-day.other-month {
            background: var(--bg-tertiary, #f3f4f6);
            color: var(--text-tertiary, #9ca3af);
        }

        .calendar-day.today {
            background: #dbeafe;
            border: 2px solid #3b82f6;
        }

        .calendar-day-number {
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .calendar-day-content {
            font-size: 0.75rem;
        }

        /* Form Styles */
        .form-section {
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .form-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .form-section h4 {
            margin-bottom: 1rem;
            color: var(--text-primary, #111827);
            font-weight: 600;
        }

        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .form-input {
            padding: 0.75rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            background: var(--bg-primary, #ffffff);
            color: var(--text-primary, #111827);
            font-size: 0.875rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-input, .filter-select {
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 4px;
            background: var(--bg-primary, #ffffff);
            color: var(--text-primary, #111827);
            min-width: 120px;
            font-size: 0.875rem;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            margin: 5px;
        }

        .filter-input:focus, .filter-select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
        }

        /* Button Styles */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: 1px solid transparent;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .btn-primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }

        .btn-primary:hover {
            background: #2563eb;
            border-color: #2563eb;
        }

        .btn-secondary {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-primary, #111827);
            border-color: var(--border-color, #e5e7eb);
        }

        .btn-secondary:hover {
            background: var(--bg-tertiary, #f3f4f6);
        }

        .btn-outline {
            background: transparent;
            color: var(--text-primary, #111827);
            border-color: var(--border-color, #e5e7eb);
        }

        .btn-outline:hover {
            background: var(--bg-secondary, #f9fafb);
        }

        .btn-danger {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
        }

        .btn-danger:hover {
            background: #dc2626;
            border-color: #dc2626;
        }

        .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
        }

        .btn-xs {
            padding: 0.25rem 0.5rem;
            font-size: 0.625rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
            
            .header-filters {
                flex-direction: column;
                gap: 0.75rem;
            }
            
            .filter-group {
                min-width: 100%;
            }
            
            .attendance-table {
                font-size: 0.75rem;
            }
            
            .attendance-table th,
            .attendance-table td {
                padding: 0.5rem 0.25rem;
            }
            
            .action-buttons {
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .current-time {
                font-size: 2rem;
            }
            
            .clock-actions {
                flex-direction: column;
            }
        }

        /* Hidden utility */
        .hidden {
            display: none !important;
        }

        /* Active state for buttons */
        .btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
    </style>

<?php include 'footer.php'; ?>
