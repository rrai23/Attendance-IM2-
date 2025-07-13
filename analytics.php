<?php
// Include authentication and database connection
require_once 'auth.php';
require_once 'db.php';

// Check if user is admin
if ($_SESSION['role'] !== 'admin') {
    header('Location: dashboard.php');
    exit();
}

// Get filter parameters from GET request
$employee_id = isset($_GET['employee']) ? (int)$_GET['employee'] : null;
$department = isset($_GET['department']) ? $_GET['department'] : '';
$date_range = isset($_GET['range']) ? $_GET['range'] : 'last30days';
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';

// Calculate date range based on selection
function calculateDateRange($range, $start = '', $end = '') {
    $today = date('Y-m-d');
    
    switch ($range) {
        case 'today':
            return [$today, $today];
        case 'yesterday':
            $yesterday = date('Y-m-d', strtotime('-1 day'));
            return [$yesterday, $yesterday];
        case 'last7days':
            return [date('Y-m-d', strtotime('-7 days')), $today];
        case 'last30days':
            return [date('Y-m-d', strtotime('-30 days')), $today];
        case 'thisMonth':
            return [date('Y-m-01'), $today];
        case 'lastMonth':
            return [date('Y-m-01', strtotime('first day of last month')), date('Y-m-t', strtotime('last day of last month'))];
        case 'custom':
            return [$start, $end];
        default:
            return [date('Y-m-d', strtotime('-30 days')), $today];
    }
}

list($filter_start_date, $filter_end_date) = calculateDateRange($date_range, $start_date, $end_date);

// Fetch employees for dropdown
$employees_query = "SELECT id, firstName, lastName, department FROM employees ORDER BY lastName, firstName";
$employees_result = mysqli_query($conn, $employees_query);
$employees = [];
while ($row = mysqli_fetch_assoc($employees_result)) {
    $employees[] = $row;
}

// Get unique departments
$departments_query = "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department";
$departments_result = mysqli_query($conn, $departments_query);
$departments = [];
while ($row = mysqli_fetch_assoc($departments_result)) {
    $departments[] = $row['department'];
}

// Build WHERE clause for filtering
$where_conditions = [];
$params = [];
$types = '';

if ($employee_id) {
    $where_conditions[] = "a.employee_id = ?";
    $params[] = $employee_id;
    $types .= 'i';
}

if ($department) {
    $where_conditions[] = "e.department = ?";
    $params[] = $department;
    $types .= 's';
}

if ($filter_start_date && $filter_end_date) {
    $where_conditions[] = "a.date BETWEEN ? AND ?";
    $params[] = $filter_start_date;
    $params[] = $filter_end_date;
    $types .= 'ss';
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

// Calculate summary statistics
$summary_query = "
    SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'on_leave' THEN 1 ELSE 0 END) as leave_count,
        AVG(CASE WHEN a.hours_worked IS NOT NULL THEN a.hours_worked ELSE 0 END) as avg_hours,
        SUM(CASE WHEN a.overtime_hours IS NOT NULL THEN a.overtime_hours ELSE 0 END) as total_overtime
    FROM attendance a 
    JOIN employees e ON a.employee_id = e.id 
    $where_clause
";

$summary_stmt = mysqli_prepare($conn, $summary_query);
if (!empty($params)) {
    mysqli_stmt_bind_param($summary_stmt, $types, ...$params);
}
mysqli_stmt_execute($summary_stmt);
$summary_result = mysqli_stmt_get_result($summary_stmt);
$summary = mysqli_fetch_assoc($summary_result);

// Calculate rates
$attendance_rate = $summary['total_records'] > 0 ? 
    round((($summary['present_count'] + $summary['late_count']) / $summary['total_records']) * 100, 2) : 0;
$punctuality_rate = $summary['total_records'] > 0 ? 
    round(($summary['present_count'] / $summary['total_records']) * 100, 2) : 0;

// Get attendance statistics for charts
$presence_stats = [
    'present' => (int)$summary['present_count'],
    'late' => (int)$summary['late_count'],
    'absent' => (int)$summary['absent_count'],
    'on_leave' => (int)$summary['leave_count']
];

// Get weekly patterns
$weekly_query = "
    SELECT 
        DAYOFWEEK(a.date) as day_of_week,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
    FROM attendance a 
    JOIN employees e ON a.employee_id = e.id 
    $where_clause
    GROUP BY DAYOFWEEK(a.date)
    ORDER BY DAYOFWEEK(a.date)
";

$weekly_stmt = mysqli_prepare($conn, $weekly_query);
if (!empty($params)) {
    mysqli_stmt_bind_param($weekly_stmt, $types, ...$params);
}
mysqli_stmt_execute($weekly_stmt);
$weekly_result = mysqli_stmt_get_result($weekly_stmt);

$weekly_patterns = [
    'labels' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    'present' => array_fill(0, 7, 0),
    'late' => array_fill(0, 7, 0),
    'absent' => array_fill(0, 7, 0)
];

while ($row = mysqli_fetch_assoc($weekly_result)) {
    $day_index = $row['day_of_week'] - 1; // MySQL DAYOFWEEK returns 1-7, we need 0-6
    $weekly_patterns['present'][$day_index] = (int)$row['present'];
    $weekly_patterns['late'][$day_index] = (int)$row['late'];
    $weekly_patterns['absent'][$day_index] = (int)$row['absent'];
}

// Get tardiness trends (weekly)
$tardiness_query = "
    SELECT 
        YEARWEEK(a.date) as week,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        AVG(CASE WHEN a.status = 'late' AND a.minutes_late IS NOT NULL THEN a.minutes_late ELSE 0 END) as avg_delay
    FROM attendance a 
    JOIN employees e ON a.employee_id = e.id 
    $where_clause
    GROUP BY YEARWEEK(a.date)
    ORDER BY YEARWEEK(a.date)
    LIMIT 12
";

$tardiness_stmt = mysqli_prepare($conn, $tardiness_query);
if (!empty($params)) {
    mysqli_stmt_bind_param($tardiness_stmt, $types, ...$params);
}
mysqli_stmt_execute($tardiness_stmt);
$tardiness_result = mysqli_stmt_get_result($tardiness_stmt);

$tardiness_trends = [
    'labels' => [],
    'late_arrivals' => [],
    'average_delay' => []
];

while ($row = mysqli_fetch_assoc($tardiness_result)) {
    $tardiness_trends['labels'][] = 'Week ' . substr($row['week'], -2);
    $tardiness_trends['late_arrivals'][] = (int)$row['late_count'];
    $tardiness_trends['average_delay'][] = round($row['avg_delay'], 1);
}

// Get monthly overview
$monthly_query = "
    SELECT 
        DATE_FORMAT(a.date, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended
    FROM attendance a 
    JOIN employees e ON a.employee_id = e.id 
    $where_clause
    GROUP BY DATE_FORMAT(a.date, '%Y-%m')
    ORDER BY month
    LIMIT 12
";

$monthly_stmt = mysqli_prepare($conn, $monthly_query);
if (!empty($params)) {
    mysqli_stmt_bind_param($monthly_stmt, $types, ...$params);
}
mysqli_stmt_execute($monthly_stmt);
$monthly_result = mysqli_stmt_get_result($monthly_stmt);

$monthly_overview = [
    'labels' => [],
    'attendance_rate' => [],
    'target_rate' => []
];

while ($row = mysqli_fetch_assoc($monthly_result)) {
    $rate = $row['total'] > 0 ? round(($row['attended'] / $row['total']) * 100, 2) : 0;
    $monthly_overview['labels'][] = date('M Y', strtotime($row['month'] . '-01'));
    $monthly_overview['attendance_rate'][] = $rate;
    $monthly_overview['target_rate'][] = 95; // Target 95%
}

// Get detailed analytics for table
$detailed_query = "
    SELECT 
        e.id,
        CONCAT(e.firstName, ' ', e.lastName) as full_name,
        e.department,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        AVG(CASE WHEN a.hours_worked IS NOT NULL THEN a.hours_worked ELSE 0 END) as avg_hours,
        SUM(CASE WHEN a.overtime_hours IS NOT NULL THEN a.overtime_hours ELSE 0 END) as total_overtime
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id 
    " . ($where_clause ? str_replace('a.employee_id', 'e.id', $where_clause) : '') . "
    GROUP BY e.id, e.firstName, e.lastName, e.department
    ORDER BY e.lastName, e.firstName
";

$detailed_stmt = mysqli_prepare($conn, $detailed_query);
if (!empty($params)) {
    // Adjust parameters for employee-based query
    $detailed_params = $params;
    $detailed_types = $types;
    if ($employee_id) {
        // Replace employee_id parameter position
        $detailed_params[0] = $employee_id;
    }
    mysqli_stmt_bind_param($detailed_stmt, $detailed_types, ...$detailed_params);
}
mysqli_stmt_execute($detailed_stmt);
$detailed_result = mysqli_stmt_get_result($detailed_stmt);

$detailed_analytics = [];
while ($row = mysqli_fetch_assoc($detailed_result)) {
    $attendance_rate_emp = $row['total_days'] > 0 ? 
        round((($row['present_days'] + $row['late_days']) / $row['total_days']) * 100, 2) : 0;
    
    $performance = 'poor';
    if ($attendance_rate_emp >= 95) $performance = 'excellent';
    elseif ($attendance_rate_emp >= 85) $performance = 'good';
    elseif ($attendance_rate_emp >= 75) $performance = 'average';
    
    $row['attendance_rate'] = $attendance_rate_emp;
    $row['performance'] = $performance;
    $detailed_analytics[] = $row;
}

// Performance data (simplified calculation)
$performance_data = [
    'labels' => ['Punctuality', 'Attendance', 'Overtime', 'Consistency', 'Reliability'],
    'scores' => [
        round($punctuality_rate),
        round($attendance_rate),
        min(100, round(($summary['total_overtime'] / max(1, $summary['total_records'])) * 10)), // Overtime score
        round($attendance_rate * 0.9), // Consistency approximation
        round($attendance_rate * 1.1) // Reliability approximation
    ],
    'employee_name' => $employee_id ? 'Selected Employee' : 'All Employees'
];

// Ensure scores don't exceed 100
$performance_data['scores'] = array_map(function($score) {
    return min(100, max(0, $score));
}, $performance_data['scores']);

// Include header
include 'header.php';
?>

<!-- Main Content -->
<main class="main-content" id="main-content">
    <!-- Page Header -->
    <header class="page-header">
        <div class="header-content">
            <div class="header-title">
                <h1>Analytics</h1>
                <p>Comprehensive attendance statistics and insights</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-outline" onclick="window.location.reload()" title="Refresh Data" aria-label="Refresh analytics data">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                    Refresh
                </button>
                <button class="btn btn-outline" onclick="exportAnalytics()" title="Export Analytics" aria-label="Export analytics data">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                </button>
                <button class="btn btn-outline" onclick="window.print()" title="Print Report" aria-label="Print analytics report">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 6,2 18,2 18,9"></polyline>
                        <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print
                </button>
            </div>
        </div>
    </header>

    <!-- Filters Section -->
    <section class="filters-section">
        <form method="GET" action="analytics.php">
            <div class="filters-container">
                <div class="filter-group">
                    <label for="employee" class="form-label">Employee</label>
                    <select name="employee" id="employee" class="form-select">
                        <option value="">All Employees</option>
                        <?php foreach ($employees as $emp): ?>
                            <option value="<?php echo $emp['id']; ?>" 
                                    <?php echo $employee_id == $emp['id'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($emp['firstName'] . ' ' . $emp['lastName']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="department" class="form-label">Department</label>
                    <select name="department" id="department" class="form-select">
                        <option value="">All Departments</option>
                        <?php foreach ($departments as $dept): ?>
                            <option value="<?php echo htmlspecialchars($dept); ?>" 
                                    <?php echo $department == $dept ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($dept); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="range" class="form-label">Date Range</label>
                    <select name="range" id="range" class="form-select" onchange="toggleCustomDates()">
                        <option value="today" <?php echo $date_range == 'today' ? 'selected' : ''; ?>>Today</option>
                        <option value="yesterday" <?php echo $date_range == 'yesterday' ? 'selected' : ''; ?>>Yesterday</option>
                        <option value="last7days" <?php echo $date_range == 'last7days' ? 'selected' : ''; ?>>Last 7 Days</option>
                        <option value="last30days" <?php echo $date_range == 'last30days' ? 'selected' : ''; ?>>Last 30 Days</option>
                        <option value="thisMonth" <?php echo $date_range == 'thisMonth' ? 'selected' : ''; ?>>This Month</option>
                        <option value="lastMonth" <?php echo $date_range == 'lastMonth' ? 'selected' : ''; ?>>Last Month</option>
                        <option value="custom" <?php echo $date_range == 'custom' ? 'selected' : ''; ?>>Custom Range</option>
                    </select>
                </div>
                
                <div class="filter-group custom-date-group" id="customDateContainer" style="display: <?php echo $date_range == 'custom' ? 'flex' : 'none'; ?>;">
                    <div class="date-inputs">
                        <div class="date-input-group">
                            <label for="start_date" class="form-label">Start Date</label>
                            <input type="date" name="start_date" id="start_date" class="form-input" value="<?php echo $start_date; ?>">
                        </div>
                        <div class="date-input-group">
                            <label for="end_date" class="form-label">End Date</label>
                            <input type="date" name="end_date" id="end_date" class="form-input" value="<?php echo $end_date; ?>">
                        </div>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button type="submit" class="btn btn-primary">Apply Filters</button>
                    <a href="analytics.php" class="btn btn-ghost">
                        <span class="btn-icon">✖️</span>
                        Clear Filters
                    </a>
                    <div class="filter-status">
                        <span id="filterStatus">
                            <?php 
                            $active_filters = 0;
                            if ($employee_id) $active_filters++;
                            if ($department) $active_filters++;
                            if ($date_range != 'last30days') $active_filters++;
                            echo $active_filters > 0 ? "$active_filters filter(s) active" : "No filters active";
                            ?>
                        </span>
                        <span class="employee-count"><?php echo count($employees); ?> employees</span>
                    </div>
                </div>
            </div>
        </form>
    </section>

    <!-- Analytics Summary Tiles -->
    <section class="analytics-summary">
        <div class="tiles-grid grid-4">
            <div class="tile tile-stat">
                <div class="tile-header">
                    <span class="tile-icon">📊</span>
                    <h3 class="tile-title">Attendance Rate</h3>
                </div>
                <div class="tile-content">
                    <div class="tile-stat-number"><?php echo $attendance_rate; ?>%</div>
                    <div class="tile-trend <?php echo $attendance_rate >= 95 ? 'positive' : ($attendance_rate >= 85 ? 'warning' : 'negative'); ?>">
                        <span class="trend-indicator"></span>
                        <span class="trend-text">
                            <?php 
                            if ($attendance_rate >= 95) echo 'Excellent';
                            elseif ($attendance_rate >= 85) echo 'Good';
                            else echo 'Needs improvement';
                            ?>
                        </span>
                    </div>
                </div>
            </div>

            <div class="tile tile-stat">
                <div class="tile-header">
                    <span class="tile-icon">⏰</span>
                    <h3 class="tile-title">Punctuality Rate</h3>
                </div>
                <div class="tile-content">
                    <div class="tile-stat-number"><?php echo $punctuality_rate; ?>%</div>
                    <div class="tile-trend <?php echo $punctuality_rate >= 90 ? 'positive' : ($punctuality_rate >= 75 ? 'warning' : 'negative'); ?>">
                        <span class="trend-indicator"></span>
                        <span class="trend-text">
                            <?php 
                            if ($punctuality_rate >= 90) echo 'Excellent';
                            elseif ($punctuality_rate >= 75) echo 'Good';
                            else echo 'Needs improvement';
                            ?>
                        </span>
                    </div>
                </div>
            </div>

            <div class="tile tile-stat">
                <div class="tile-header">
                    <span class="tile-icon">🕐</span>
                    <h3 class="tile-title">Total Hours</h3>
                </div>
                <div class="tile-content">
                    <div class="tile-stat-number"><?php echo round($summary['avg_hours'] * $summary['total_records'], 1); ?>h</div>
                    <div class="tile-trend neutral">
                        <span class="trend-indicator"></span>
                        <span class="trend-text">Stable</span>
                    </div>
                </div>
            </div>

            <div class="tile tile-stat">
                <div class="tile-header">
                    <span class="tile-icon">⏱️</span>
                    <h3 class="tile-title">Overtime Hours</h3>
                </div>
                <div class="tile-content">
                    <div class="tile-stat-number"><?php echo round($summary['total_overtime'], 1); ?>h</div>
                    <div class="tile-trend <?php echo $summary['total_overtime'] > 0 ? 'warning' : 'neutral'; ?>">
                        <span class="trend-indicator"></span>
                        <span class="trend-text">
                            <?php echo $summary['total_overtime'] > 0 ? 'Monitor closely' : 'Stable'; ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Charts Section -->
    <section class="charts-section">
        <div class="tiles-grid grid-2">
            <!-- Attendance Statistics Chart -->
            <div class="tile tile-large">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Attendance Overview</h3>
                        <p class="tile-subtitle">Distribution of attendance status</p>
                    </div>
                    <span class="tile-icon">📊</span>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <canvas id="presenceStatsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Time Patterns Chart -->
            <div class="tile tile-large">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Weekly Attendance Patterns</h3>
                        <p class="tile-subtitle">Attendance by day of week</p>
                    </div>
                    <span class="tile-icon">📅</span>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <canvas id="weeklyPatternsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Tardiness Trends Chart -->
            <div class="tile tile-large">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Tardiness Trends</h3>
                        <p class="tile-subtitle">Late arrivals and average delays</p>
                    </div>
                    <span class="tile-icon">⚠️</span>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <canvas id="tardinessTrendsChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Monthly Overview Chart -->
            <div class="tile tile-large">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Monthly Overview</h3>
                        <p class="tile-subtitle">Attendance rate vs target</p>
                    </div>
                    <span class="tile-icon">📈</span>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <canvas id="monthlyOverviewChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Performance Radar Chart -->
            <div class="tile">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Performance Overview</h3>
                        <p class="tile-subtitle">Multi-dimensional performance metrics</p>
                    </div>
                    <span class="tile-icon">🎯</span>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <canvas id="performanceRadarChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Detailed Analytics Table -->
    <section class="detailed-analytics">
        <div class="tile">
            <div class="tile-header">
                <div>
                    <h3 class="tile-title">Detailed Analytics</h3>
                    <p class="tile-subtitle">Comprehensive attendance breakdown</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-sm btn-outline" onclick="exportTable()">
                        <span class="btn-icon">📋</span>
                        Export Table
                    </button>
                </div>
            </div>
            <div class="tile-content">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Total Days</th>
                                <th>Present</th>
                                <th>Late</th>
                                <th>Absent</th>
                                <th>Attendance Rate</th>
                                <th>Avg Hours/Day</th>
                                <th>Overtime Hours</th>
                                <th>Performance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($detailed_analytics as $row): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($row['full_name']); ?></td>
                                <td><?php echo htmlspecialchars($row['department'] ?: 'N/A'); ?></td>
                                <td><?php echo $row['total_days']; ?></td>
                                <td><?php echo $row['present_days']; ?></td>
                                <td><?php echo $row['late_days']; ?></td>
                                <td><?php echo $row['absent_days']; ?></td>
                                <td><?php echo $row['attendance_rate']; ?>%</td>
                                <td><?php echo round($row['avg_hours'], 1); ?>h</td>
                                <td><?php echo round($row['total_overtime'], 1); ?>h</td>
                                <td>
                                    <span class="performance-badge <?php echo $row['performance']; ?>">
                                        <?php echo ucfirst($row['performance']); ?>
                                    </span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
</main>

<!-- Chart.js for data visualization -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>

<script>
// Chart data from PHP
const chartData = {
    presenceStats: <?php echo json_encode($presence_stats); ?>,
    weeklyPatterns: <?php echo json_encode($weekly_patterns); ?>,
    tardinessTrends: <?php echo json_encode($tardiness_trends); ?>,
    monthlyOverview: <?php echo json_encode($monthly_overview); ?>,
    performanceData: <?php echo json_encode($performance_data); ?>
};

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
});

function initializeCharts() {
    // Presence Statistics Pie Chart
    const presenceCtx = document.getElementById('presenceStatsChart').getContext('2d');
    new Chart(presenceCtx, {
        type: 'pie',
        data: {
            labels: ['Present', 'Late', 'Absent', 'On Leave'],
            datasets: [{
                data: [
                    chartData.presenceStats.present,
                    chartData.presenceStats.late,
                    chartData.presenceStats.absent,
                    chartData.presenceStats.on_leave
                ],
                backgroundColor: ['#4CAF50', '#FF9800', '#F44336', '#2196F3'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Weekly Patterns Bar Chart
    const weeklyCtx = document.getElementById('weeklyPatternsChart').getContext('2d');
    new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: chartData.weeklyPatterns.labels,
            datasets: [
                {
                    label: 'Present',
                    data: chartData.weeklyPatterns.present,
                    backgroundColor: '#4CAF50'
                },
                {
                    label: 'Late',
                    data: chartData.weeklyPatterns.late,
                    backgroundColor: '#FF9800'
                },
                {
                    label: 'Absent',
                    data: chartData.weeklyPatterns.absent,
                    backgroundColor: '#F44336'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true
                }
            }
        }
    });

    // Tardiness Trends Line Chart
    const tardinessCtx = document.getElementById('tardinessTrendsChart').getContext('2d');
    new Chart(tardinessCtx, {
        type: 'line',
        data: {
            labels: chartData.tardinessTrends.labels,
            datasets: [
                {
                    label: 'Late Arrivals',
                    data: chartData.tardinessTrends.late_arrivals,
                    borderColor: '#FF9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Delay (min)',
                    data: chartData.tardinessTrends.average_delay,
                    borderColor: '#F44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // Monthly Overview Line Chart
    const monthlyCtx = document.getElementById('monthlyOverviewChart').getContext('2d');
    new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: chartData.monthlyOverview.labels,
            datasets: [
                {
                    label: 'Attendance Rate',
                    data: chartData.monthlyOverview.attendance_rate,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    fill: true
                },
                {
                    label: 'Target (95%)',
                    data: chartData.monthlyOverview.target_rate,
                    borderColor: '#4CAF50',
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100
                }
            }
        }
    });

    // Performance Radar Chart
    const performanceCtx = document.getElementById('performanceRadarChart').getContext('2d');
    new Chart(performanceCtx, {
        type: 'radar',
        data: {
            labels: chartData.performanceData.labels,
            datasets: [{
                label: chartData.performanceData.employee_name,
                data: chartData.performanceData.scores,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                pointBackgroundColor: '#2196F3',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}

function toggleCustomDates() {
    const range = document.getElementById('range').value;
    const customContainer = document.getElementById('customDateContainer');
    customContainer.style.display = range === 'custom' ? 'flex' : 'none';
}

function exportAnalytics() {
    const data = {
        summary: {
            attendance_rate: <?php echo $attendance_rate; ?>,
            punctuality_rate: <?php echo $punctuality_rate; ?>,
            total_records: <?php echo $summary['total_records']; ?>,
            present_count: <?php echo $summary['present_count']; ?>,
            late_count: <?php echo $summary['late_count']; ?>,
            absent_count: <?php echo $summary['absent_count']; ?>
        },
        filters: {
            employee_id: <?php echo $employee_id ?: 'null'; ?>,
            department: '<?php echo $department; ?>',
            date_range: '<?php echo $date_range; ?>',
            start_date: '<?php echo $filter_start_date; ?>',
            end_date: '<?php echo $filter_end_date; ?>'
        },
        generated_at: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function exportTable() {
    const table = document.querySelector('.table');
    let csv = '';
    
    // Headers
    const headers = table.querySelectorAll('thead th');
    csv += Array.from(headers).map(h => h.textContent.trim()).join(',') + '\n';
    
    // Rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        csv += Array.from(cells).map(cell => {
            let text = cell.textContent.trim();
            // Handle performance badge
            if (cell.querySelector('.performance-badge')) {
                text = cell.querySelector('.performance-badge').textContent.trim();
            }
            return `"${text}"`;
        }).join(',') + '\n';
    });
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-table-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}
</script>

<style>
/* Analytics-specific styles */
.page-analytics {
    --accent-primary: var(--accent-analytics);
    --accent-light: rgba(52, 199, 89, 0.1);
    --accent-hover: rgba(52, 199, 89, 0.8);
}

.filters-section {
    margin-bottom: var(--spacing-xl);
    padding: var(--spacing-lg);
    background-color: var(--bg-primary);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
}

.filters-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
}

.custom-date-group {
    grid-column: span 2;
}

.date-inputs {
    display: flex;
    gap: var(--spacing-md);
}

.date-input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.filter-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: flex-start;
}

.filter-status {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
}

.employee-count {
    display: block;
    margin-top: var(--spacing-xs);
    font-weight: var(--font-weight-medium);
    color: var(--accent-primary);
}

.analytics-summary {
    margin-bottom: var(--spacing-xl);
}

.tile-trend {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-sm);
}

.tile-trend.positive {
    color: var(--accent-analytics);
}

.tile-trend.positive .trend-indicator::before {
    content: '↗';
}

.tile-trend.negative {
    color: #ff3b30;
}

.tile-trend.negative .trend-indicator::before {
    content: '↘';
}

.tile-trend.warning {
    color: #ff9500;
}

.tile-trend.warning .trend-indicator::before {
    content: '⚠';
}

.tile-trend.neutral .trend-indicator::before {
    content: '→';
}

.charts-section {
    margin-bottom: var(--spacing-xl);
}

.detailed-analytics {
    margin-bottom: var(--spacing-xl);
}

.chart-container {
    position: relative;
    height: 300px;
    margin: var(--spacing-lg) 0;
}

.tile-large .chart-container {
    height: 350px;
}

.performance-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
}

.performance-badge.excellent {
    background-color: rgba(52, 199, 89, 0.1);
    color: #34c759;
}

.performance-badge.good {
    background-color: rgba(0, 122, 255, 0.1);
    color: #007aff;
}

.performance-badge.average {
    background-color: rgba(255, 149, 0, 0.1);
    color: #ff9500;
}

.performance-badge.poor {
    background-color: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .filters-container {
        grid-template-columns: 1fr;
    }

    .custom-date-group {
        grid-column: span 1;
    }

    .date-inputs {
        flex-direction: column;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
    }

    .header-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
    }

    .tiles-grid.grid-2 {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 1024px) {
    .table-container {
        overflow-x: auto;
    }

    .table {
        min-width: 800px;
    }
}

/* Print styles */
@media print {
    .header-actions,
    .filter-actions {
        display: none !important;
    }

    .main-content {
        margin-left: 0;
    }

    .tile {
        break-inside: avoid;
        margin-bottom: var(--spacing-lg);
    }

    .charts-section {
        page-break-inside: avoid;
    }
}
</style>

<?php include 'footer.php'; ?>