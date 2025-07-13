<?php
// Include authentication and database connection
require_once 'auth.php';
require_once 'db.php';

// Get current user info from session
$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['role'];
$user_name = $_SESSION['firstName'];

// Initialize variables for dashboard stats
$total_employees = 0;
$present_today = 0;
$late_today = 0;
$absent_today = 0;
$attendance_rate = 0;
$recent_activities = [];

// Get today's date
$today = date('Y-m-d');

try {
    // Get total employees count
    $stmt = mysqli_prepare($conn, "SELECT COUNT(*) as total FROM employees WHERE status = 'active'");
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    $total_employees = $row['total'];

    // Get today's attendance statistics
    $stmt = mysqli_prepare($conn, "
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'late' OR status = 'tardy' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
        FROM attendance 
        WHERE date = ?
    ");
    mysqli_stmt_bind_param($stmt, "s", $today);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $attendance_stats = mysqli_fetch_assoc($result);

    $present_today = $attendance_stats['present'] ?: 0;
    $late_today = $attendance_stats['late'] ?: 0;
    $absent_today = $attendance_stats['absent'] ?: 0;

    // Calculate absent employees (those without attendance records today)
    $recorded_employees = $attendance_stats['total_records'] ?: 0;
    if ($recorded_employees < $total_employees) {
        $absent_today += ($total_employees - $recorded_employees);
    }

    // Calculate attendance rate
    if ($total_employees > 0) {
        $attendance_rate = round((($present_today + $late_today) / $total_employees) * 100, 1);
    }

    // Get recent activities (last 10 attendance records)
    $stmt = mysqli_prepare($conn, "
        SELECT 
            a.*, 
            e.firstName as employee_name,
            e.employeeCode as employee_code
        FROM attendance a 
        JOIN employees e ON a.employee_id = e.id 
        ORDER BY a.created_at DESC 
        LIMIT 10
    ");
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    while ($row = mysqli_fetch_assoc($result)) {
        $recent_activities[] = $row;
    }

} catch (Exception $e) {
    error_log("Dashboard error: " . $e->getMessage());
    // Use default values if database queries fail
}

// Get next payday information
$next_payday = date('Y-m-d', strtotime('next friday'));
$days_to_payday = ceil((strtotime($next_payday) - time()) / (60 * 60 * 24));

// Include header
include("header.php");
?>

<!-- Main Content Area -->
<main class="main-content" id="main-content">
    <!-- Dashboard Header -->
    <header class="dashboard-header">
        <div class="header-content">
            <div class="header-title">
                <h1>Dashboard</h1>
                <p class="header-subtitle">Welcome back! Here's what's happening today.</p>
            </div>
            <div class="header-actions">
                <div class="current-time">
                    <span class="time-label">Current Time</span>
                    <span class="time-value" id="current-time"><?php echo date('H:i:s'); ?></span>
                </div>
                <button class="btn btn-primary" onclick="location.reload()" title="Refresh dashboard data">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"></polyline>
                        <polyline points="1,20 1,14 7,14"></polyline>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                    </svg>
                    Refresh
                </button>
            </div>
        </div>
    </header>

    <!-- Dashboard Content -->
    <div class="dashboard-content">
        <!-- Quick Stats Row -->
        <div class="quick-stats">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-info">
                    <div class="stat-value"><?php echo $total_employees; ?></div>
                    <div class="stat-label">Total Employees</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <div class="stat-value"><?php echo $present_today + $late_today; ?></div>
                    <div class="stat-label">Present Today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏰</div>
                <div class="stat-info">
                    <div class="stat-value"><?php echo $late_today; ?></div>
                    <div class="stat-label">Late Today</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-value"><?php echo $attendance_rate; ?>%</div>
                    <div class="stat-label">Attendance Rate</div>
                </div>
            </div>
        </div>

        <!-- Main Dashboard Tiles -->
        <div class="tiles-grid grid-2">
            <!-- Attendance Count Tile -->
            <div class="tile tile-accent dashboard-tile" id="attendance-count-tile">
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Today's Attendance</h3>
                        <p class="tile-subtitle">Real-time attendance overview</p>
                    </div>
                    <button class="tile-refresh-btn" onclick="location.reload()" title="Refresh attendance data">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
                <div class="tile-content">
                    <div class="attendance-overview">
                        <div class="attendance-main-stat">
                            <div class="stat-number"><?php echo $present_today + $late_today; ?></div>
                            <div class="stat-label">Present Today</div>
                            <div class="stat-sublabel">out of <span><?php echo $total_employees; ?></span> employees</div>
                        </div>
                        <div class="attendance-rate">
                            <div class="rate-circle" data-rate="<?php echo $attendance_rate; ?>">
                                <svg viewBox="0 0 36 36" class="circular-chart">
                                    <path class="circle-bg" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path class="circle" stroke-dasharray="<?php echo $attendance_rate; ?>, 100" d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <text x="18" y="20.35" class="percentage"><?php echo $attendance_rate; ?>%</text>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="attendance-breakdown">
                        <div class="breakdown-item present">
                            <span class="breakdown-dot"></span>
                            <span class="breakdown-label">On Time</span>
                            <span class="breakdown-value"><?php echo $present_today; ?></span>
                        </div>
                        <div class="breakdown-item late">
                            <span class="breakdown-dot"></span>
                            <span class="breakdown-label">Late</span>
                            <span class="breakdown-value"><?php echo $late_today; ?></span>
                        </div>
                        <div class="breakdown-item absent">
                            <span class="breakdown-dot"></span>
                            <span class="breakdown-label">Absent</span>
                            <span class="breakdown-value"><?php echo $absent_today; ?></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Attendance Statistics Chart Tile -->
            <div class="tile dashboard-tile" id="attendance-chart-tile">
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Attendance Statistics</h3>
                        <p class="tile-subtitle">Trends and patterns</p>
                    </div>
                    <div class="tile-actions">
                        <select class="chart-period-select" id="chart-period">
                            <option value="week">This Week</option>
                            <option value="month" selected>This Month</option>
                            <option value="quarter">This Quarter</option>
                        </select>
                        <button class="tile-refresh-btn" onclick="location.reload()" title="Refresh chart data">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,4 23,10 17,10"></polyline>
                                <polyline points="1,20 1,14 7,14"></polyline>
                                <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="tile-content">
                    <div class="chart-container">
                        <div class="chart-placeholder">
                            <div class="chart-icon">📊</div>
                            <div class="chart-title">Attendance Chart</div>
                            <div class="chart-stats">
                                <div class="chart-stat">
                                    <span class="stat-color present"></span>
                                    <span>Present: <?php echo $present_today; ?></span>
                                </div>
                                <div class="chart-stat">
                                    <span class="stat-color late"></span>
                                    <span>Late: <?php echo $late_today; ?></span>
                                </div>
                                <div class="chart-stat">
                                    <span class="stat-color absent"></span>
                                    <span>Absent: <?php echo $absent_today; ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Interactive Calendar Tile -->
            <div class="tile dashboard-tile" id="calendar-tile">
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Calendar</h3>
                        <p class="tile-subtitle">Current month overview</p>
                    </div>
                    <div class="tile-actions">
                        <button class="btn btn-sm btn-outline" onclick="window.location.href='attendance.php'">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            View Full
                        </button>
                    </div>
                </div>
                <div class="tile-content">
                    <div class="calendar-simple">
                        <div class="calendar-header">
                            <h4><?php echo date('F Y'); ?></h4>
                        </div>
                        <div class="calendar-grid">
                            <div class="calendar-day-header">Sun</div>
                            <div class="calendar-day-header">Mon</div>
                            <div class="calendar-day-header">Tue</div>
                            <div class="calendar-day-header">Wed</div>
                            <div class="calendar-day-header">Thu</div>
                            <div class="calendar-day-header">Fri</div>
                            <div class="calendar-day-header">Sat</div>
                            
                            <?php
                            // Generate calendar days for current month
                            $first_day = date('Y-m-01');
                            $last_day = date('Y-m-t');
                            $start_day = date('w', strtotime($first_day)); // Day of week (0=Sunday)
                            $days_in_month = date('t');
                            $current_day = date('j');
                            
                            // Empty cells for days before month starts
                            for ($i = 0; $i < $start_day; $i++) {
                                echo '<div class="calendar-day empty"></div>';
                            }
                            
                            // Days of the month
                            for ($day = 1; $day <= $days_in_month; $day++) {
                                $class = 'calendar-day';
                                if ($day == $current_day) {
                                    $class .= ' today';
                                }
                                echo "<div class=\"$class\">$day</div>";
                            }
                            ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payday Countdown Tile -->
            <div class="tile dashboard-tile" id="payday-countdown-tile">
                <div class="tile-header">
                    <div class="tile-title-group">
                        <h3 class="tile-title">Next Payday</h3>
                        <p class="tile-subtitle">Countdown to next payment</p>
                    </div>
                    <button class="tile-refresh-btn" onclick="location.reload()" title="Refresh payday data">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23,4 23,10 17,10"></polyline>
                            <polyline points="1,20 1,14 7,14"></polyline>
                            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
                        </svg>
                    </button>
                </div>
                <div class="tile-content">
                    <div class="countdown-container">
                        <div class="countdown-main">
                            <div class="countdown-number"><?php echo $days_to_payday; ?></div>
                            <div class="countdown-label">Days Remaining</div>
                        </div>
                        <div class="countdown-details">
                            <div class="countdown-date">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value"><?php echo date('M j, Y', strtotime($next_payday)); ?></span>
                            </div>
                            <div class="countdown-period">
                                <span class="detail-label">Period:</span>
                                <span class="detail-value">Weekly</span>
                            </div>
                        </div>
                        <div class="countdown-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: <?php echo max(0, 100 - ($days_to_payday / 7 * 100)); ?>%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Activity Section -->
        <div class="recent-activity-section">
            <div class="section-header">
                <h2>Recent Activity</h2>
                <button class="btn btn-ghost btn-sm" onclick="window.location.href='attendance.php'">View All</button>
            </div>
            <div class="activity-list">
                <?php if (empty($recent_activities)): ?>
                    <div class="activity-item">
                        <div class="activity-icon">📝</div>
                        <div class="activity-content">
                            <div class="activity-text">No recent activity found</div>
                            <div class="activity-time">Start tracking attendance to see activity here</div>
                        </div>
                    </div>
                <?php else: ?>
                    <?php foreach ($recent_activities as $activity): ?>
                        <div class="activity-item">
                            <div class="activity-icon">
                                <?php 
                                switch($activity['status']) {
                                    case 'present': echo '✅'; break;
                                    case 'late': case 'tardy': echo '⏰'; break;
                                    case 'absent': echo '❌'; break;
                                    default: echo '📝'; break;
                                }
                                ?>
                            </div>
                            <div class="activity-content">
                                <div class="activity-text">
                                    <strong><?php echo htmlspecialchars($activity['employee_name']); ?></strong>
                                    <?php 
                                    switch($activity['status']) {
                                        case 'present': echo 'clocked in on time'; break;
                                        case 'late': case 'tardy': echo 'clocked in late'; break;
                                        case 'absent': echo 'was marked absent'; break;
                                        default: echo 'updated attendance'; break;
                                    }
                                    ?>
                                    <?php if ($activity['timeIn']): ?>
                                        at <?php echo date('g:i A', strtotime($activity['timeIn'])); ?>
                                    <?php endif; ?>
                                </div>
                                <div class="activity-time">
                                    <?php echo date('M j, Y', strtotime($activity['date'])); ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</main>

<!-- Additional Dashboard Styles -->
<style>
/* Dashboard-specific styles */
.dashboard-header {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-lg);
}

.header-title h1 {
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
}

.header-subtitle {
    color: var(--text-secondary);
    margin-bottom: 0;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
}

.current-time {
    text-align: right;
}

.time-label {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
    margin-bottom: var(--spacing-xs);
}

.time-value {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--accent-primary);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

/* Quick Stats */
.quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.stat-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    transition: all var(--transition-fast);
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.stat-icon {
    font-size: 2rem;
    opacity: 0.8;
}

.stat-value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--accent-primary);
    line-height: 1;
}

.stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
}

/* Tiles Grid */
.tiles-grid {
    display: grid;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}

.tile {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-fast);
}

.tile:hover {
    box-shadow: var(--shadow-lg);
}

.tile-accent {
    border-left: 4px solid var(--accent-primary);
}

.tile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.tile-title {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

.tile-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.tile-content {
    padding: var(--spacing-lg);
}

.tile-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.tile-refresh-btn {
    background: none;
    border: none;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.tile-refresh-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

.tile-refresh-btn svg {
    width: 16px;
    height: 16px;
}

/* Attendance Overview */
.attendance-overview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.attendance-main-stat {
    flex: 1;
}

.stat-number {
    font-size: 3rem;
    font-weight: var(--font-weight-bold);
    color: var(--accent-primary);
    line-height: 1;
    margin-bottom: var(--spacing-xs);
}

.stat-sublabel {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
}

.attendance-rate {
    flex-shrink: 0;
}

.rate-circle {
    width: 120px;
    height: 120px;
}

.circular-chart {
    width: 100%;
    height: 100%;
}

.circle-bg {
    fill: none;
    stroke: var(--bg-tertiary);
    stroke-width: 2.8;
}

.circle {
    fill: none;
    stroke: var(--accent-primary);
    stroke-width: 2.8;
    stroke-linecap: round;
}

.percentage {
    fill: var(--text-primary);
    font-family: var(--font-family);
    font-size: 0.5em;
    font-weight: var(--font-weight-semibold);
    text-anchor: middle;
}

/* Attendance Breakdown */
.attendance-breakdown {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-md);
}

.breakdown-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
}

.breakdown-item:hover {
    background-color: var(--bg-secondary);
}

.breakdown-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.breakdown-item.present .breakdown-dot {
    background-color: #22c55e;
}

.breakdown-item.late .breakdown-dot {
    background-color: #f59e0b;
}

.breakdown-item.absent .breakdown-dot {
    background-color: #ef4444;
}

.breakdown-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    flex: 1;
}

.breakdown-value {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
}

/* Chart Placeholder */
.chart-container {
    position: relative;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chart-placeholder {
    text-align: center;
    color: var(--text-secondary);
}

.chart-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
}

.chart-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--spacing-lg);
    color: var(--text-primary);
}

.chart-stats {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: center;
}

.chart-stat {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-sm);
}

.stat-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.stat-color.present {
    background-color: #22c55e;
}

.stat-color.late {
    background-color: #f59e0b;
}

.stat-color.absent {
    background-color: #ef4444;
}

/* Calendar Simple */
.calendar-simple {
    width: 100%;
}

.calendar-header {
    text-align: center;
    margin-bottom: var(--spacing-md);
}

.calendar-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
}

.calendar-day-header {
    padding: var(--spacing-sm);
    text-align: center;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    background: var(--bg-secondary);
    transition: all var(--transition-fast);
    cursor: pointer;
}

.calendar-day:hover {
    background: var(--accent-light);
}

.calendar-day.today {
    background: var(--accent-primary);
    color: white;
    font-weight: var(--font-weight-bold);
}

.calendar-day.empty {
    background: transparent;
    cursor: default;
}

/* Countdown */
.countdown-container {
    text-align: center;
}

.countdown-main {
    margin-bottom: var(--spacing-lg);
}
.main-content {
    margin-left: 150px;

}
.countdown-number {
    font-size: 4rem;
    font-weight: var(--font-weight-bold);
    color: var(--accent-primary);
    line-height: 1;
    margin-bottom: var(--spacing-sm);
}

.countdown-label {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.countdown-details {
    margin-bottom: var(--spacing-lg);
}

.countdown-details > div {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
}

.detail-label {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.detail-value {
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
}

.countdown-progress {
    margin-top: var(--spacing-lg);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-hover));
    border-radius: var(--radius-sm);
    transition: width var(--transition-normal);
}

/* Recent Activity */
.recent-activity-section {
    margin-top: var(--spacing-2xl);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.section-header h2 {
    margin-bottom: 0;
}

.activity-list {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.activity-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
    transition: background-color var(--transition-fast);
}

.activity-item:last-child {
    border-bottom: none;
}

.activity-item:hover {
    background-color: var(--bg-secondary);
}

.activity-icon {
    font-size: 1.5rem;
    opacity: 0.7;
}

.activity-content {
    flex: 1;
}

.activity-text {
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
}

.activity-time {
    font-size: var(--font-size-sm);
    color: var(--text-tertiary);
}

/* Chart Period Select */
.chart-period-select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    margin-right: var(--spacing-sm);
}

/* Button Styles */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
}

.btn-primary {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
}

.btn-primary:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
}

.btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border-color: transparent;
}

.btn-ghost:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.btn-outline {
    background: transparent;
    color: var(--accent-primary);
    border-color: var(--accent-primary);
}

.btn-outline:hover {
    background: var(--accent-primary);
    color: white;
}

.btn-sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
}

.btn-icon {
    width: 16px;
    height: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .header-actions {
        width: 100%;
        justify-content: space-between;
    }
    
    .tiles-grid.grid-2 {
        grid-template-columns: 1fr;
    }
    
    .attendance-overview {
        flex-direction: column;
        gap: var(--spacing-lg);
        text-align: center;
    }
    
    .breakdown-item {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-xs);
    }
}
</style>

<script>
// Update current time every second
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Update time immediately and then every second
updateCurrentTime();
setInterval(updateCurrentTime, 1000);

// Handle mobile menu toggle
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    });
}
</script>

<?php include 'footer.php'; ?>