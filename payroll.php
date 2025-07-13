<?php
// Include authentication and database connection
require_once 'auth.php';
require_once 'db.php';

// Check if user is admin
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header('Location: /IM2/login.php');
    exit();
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'update_wage':
            updateEmployeeWage();
            break;
        case 'approve_overtime':
            approveOvertimeRequest();
            break;
        case 'deny_overtime':
            denyOvertimeRequest();
            break;
        case 'process_payroll':
            processPayroll();
            break;
    }
}

// Payroll calculation functions
function updateEmployeeWage() {
    global $conn;
    
    $employee_id = (int)$_POST['employee_id'];
    $hourly_rate = (float)$_POST['hourly_rate'];
    $notes = $_POST['notes'] ?? '';
    
    $stmt = $conn->prepare("UPDATE employees SET hourlyRate = ? WHERE id = ?");
    $stmt->bind_param("di", $hourly_rate, $employee_id);
    
    if ($stmt->execute()) {
        $_SESSION['success_message'] = "Employee wage updated successfully";
    } else {
        $_SESSION['error_message'] = "Failed to update employee wage";
    }
    
    $stmt->close();
    header('Location: payroll.php');
    exit();
}

function approveOvertimeRequest() {
    global $conn;
    
    $request_id = (int)$_POST['request_id'];
    $approved_by = $_SESSION['user_id'];
    $approved_date = date('Y-m-d');
    
    $stmt = $conn->prepare("UPDATE overtime_requests SET status = 'approved', approved_by = ?, approved_date = ? WHERE id = ?");
    $stmt->bind_param("isi", $approved_by, $approved_date, $request_id);
    
    if ($stmt->execute()) {
        $_SESSION['success_message'] = "Overtime request approved";
    } else {
        $_SESSION['error_message'] = "Failed to approve overtime request";
    }
    
    $stmt->close();
    header('Location: payroll.php');
    exit();
}

function denyOvertimeRequest() {
    global $conn;
    
    $request_id = (int)$_POST['request_id'];
    $denied_by = $_SESSION['user_id'];
    $denied_date = date('Y-m-d');
    $reason = $_POST['reason'] ?? '';
    
    $stmt = $conn->prepare("UPDATE overtime_requests SET status = 'denied', approved_by = ?, approved_date = ?, notes = ? WHERE id = ?");
    $stmt->bind_param("issi", $denied_by, $denied_date, $reason, $request_id);
    
    if ($stmt->execute()) {
        $_SESSION['success_message'] = "Overtime request denied";
    } else {
        $_SESSION['error_message'] = "Failed to deny overtime request";
    }
    
    $stmt->close();
    header('Location: payroll.php');
    exit();
}

function processPayroll() {
    global $conn;
    
    $pay_period_start = $_POST['pay_period_start'];
    $pay_period_end = $_POST['pay_period_end'];
    $processed_date = date('Y-m-d');
    $processed_by = $_SESSION['user_id'];
    
    // Get all employees
    $stmt = $conn->prepare("SELECT * FROM employees WHERE status = 'active'");
    $stmt->execute();
    $employees = $stmt->get_result();
    
    $conn->begin_transaction();
    
    try {
        while ($employee = $employees->fetch_assoc()) {
            $payroll_data = calculateEmployeePayroll($employee['id'], $pay_period_start, $pay_period_end);
            
            $insert_stmt = $conn->prepare("INSERT INTO payroll_history (employee_id, pay_period_start, pay_period_end, regular_hours, overtime_hours, hourly_rate, regular_pay, overtime_pay, gross_pay, taxes, deductions, net_pay, processed_date, processed_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')");
            
            $insert_stmt->bind_param("issddddddddsii", 
                $employee['id'],
                $pay_period_start,
                $pay_period_end,
                $payroll_data['regular_hours'],
                $payroll_data['overtime_hours'],
                $payroll_data['hourly_rate'],
                $payroll_data['regular_pay'],
                $payroll_data['overtime_pay'],
                $payroll_data['gross_pay'],
                $payroll_data['taxes'],
                $payroll_data['deductions'],
                $payroll_data['net_pay'],
                $processed_date,
                $processed_by
            );
            
            $insert_stmt->execute();
            $insert_stmt->close();
        }
        
        $conn->commit();
        $_SESSION['success_message'] = "Payroll processed successfully";
    } catch (Exception $e) {
        $conn->rollback();
        $_SESSION['error_message'] = "Failed to process payroll: " . $e->getMessage();
    }
    
    $stmt->close();
    header('Location: payroll.php');
    exit();
}

function calculateEmployeePayroll($employee_id, $start_date, $end_date) {
    global $conn;
    
    // Get employee details
    $stmt = $conn->prepare("SELECT * FROM employees WHERE id = ?");
    $stmt->bind_param("i", $employee_id);
    $stmt->execute();
    $employee = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    $hourly_rate = $employee['hourlyRate'] ?? 25.00;
    
    // Calculate hours worked from attendance
    $stmt = $conn->prepare("SELECT 
        SUM(CASE WHEN hours_worked <= 8 THEN hours_worked ELSE 8 END) as regular_hours,
        SUM(CASE WHEN hours_worked > 8 THEN hours_worked - 8 ELSE 0 END) as overtime_hours
        FROM attendance 
        WHERE employee_id = ? AND date BETWEEN ? AND ? AND status = 'present'");
    $stmt->bind_param("iss", $employee_id, $start_date, $end_date);
    $stmt->execute();
    $hours_data = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    $regular_hours = $hours_data['regular_hours'] ?? 80; // Default 2 weeks
    $overtime_hours = $hours_data['overtime_hours'] ?? 0;
    
    // Calculate pay
    $regular_pay = $regular_hours * $hourly_rate;
    $overtime_pay = $overtime_hours * $hourly_rate * 1.5;
    $gross_pay = $regular_pay + $overtime_pay;
    
    // Calculate taxes and deductions
    $tax_rate = 0.20; // 20%
    $taxes = $gross_pay * $tax_rate;
    $deductions = 0; // Additional deductions can be added here
    $net_pay = $gross_pay - $taxes - $deductions;
    
    return [
        'regular_hours' => $regular_hours,
        'overtime_hours' => $overtime_hours,
        'hourly_rate' => $hourly_rate,
        'regular_pay' => $regular_pay,
        'overtime_pay' => $overtime_pay,
        'gross_pay' => $gross_pay,
        'taxes' => $taxes,
        'deductions' => $deductions,
        'net_pay' => $net_pay
    ];
}

// Get current pay period
function getCurrentPayPeriod() {
    $today = new DateTime();
    $start_of_year = new DateTime($today->format('Y') . '-01-01');
    $days_since_start = $today->diff($start_of_year)->days;
    $pay_period_number = floor($days_since_start / 14);
    
    $pay_period_start = clone $start_of_year;
    $pay_period_start->add(new DateInterval('P' . ($pay_period_number * 14) . 'D'));
    
    $pay_period_end = clone $pay_period_start;
    $pay_period_end->add(new DateInterval('P13D'));
    
    return [
        'start' => $pay_period_start->format('Y-m-d'),
        'end' => $pay_period_end->format('Y-m-d')
    ];
}

$current_period = getCurrentPayPeriod();

// Fetch payroll overview data
$stmt = $conn->prepare("SELECT 
    COUNT(*) as total_employees,
    SUM(CASE WHEN ph.gross_pay IS NOT NULL THEN ph.gross_pay ELSE (e.hourlyRate * 80) END) as total_gross_pay,
    SUM(CASE WHEN ph.net_pay IS NOT NULL THEN ph.net_pay ELSE (e.hourlyRate * 80 * 0.8) END) as total_net_pay,
    SUM(CASE WHEN ph.taxes IS NOT NULL THEN ph.taxes ELSE (e.hourlyRate * 80 * 0.2) END) as total_taxes,
    SUM(CASE WHEN ph.regular_hours IS NOT NULL THEN ph.regular_hours ELSE 80 END) as total_regular_hours,
    SUM(CASE WHEN ph.overtime_hours IS NOT NULL THEN ph.overtime_hours ELSE 0 END) as total_overtime_hours
    FROM employees e 
    LEFT JOIN payroll_history ph ON e.id = ph.employee_id 
        AND ph.pay_period_start = ? AND ph.pay_period_end = ?
    WHERE e.status = 'active'");
$stmt->bind_param("ss", $current_period['start'], $current_period['end']);
$stmt->execute();
$payroll_overview = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Fetch employees with wages
$stmt = $conn->prepare("SELECT id, firstName, position, department, hourlyRate FROM employees WHERE status = 'active' ORDER BY firstName");
$stmt->execute();
$employees = $stmt->get_result();

// Fetch overtime requests
$stmt = $conn->prepare("SELECT e.firstName as employee_name 
    FROM overtime_requests ot
    JOIN employees e ON ot.employee_id = e.id 
    ORDER BY ot.approved_date DESC LIMIT 10");
$stmt->execute();
$overtime_requests = $stmt->get_result();

// Fetch payroll history
$stmt = $conn->prepare("SELECT ph.*, e.firstName as employee_name 
    FROM payroll_history ph 
    JOIN employees e ON ph.employee_id = e.id 
    ORDER BY ph.pay_period_start DESC LIMIT 20");
$stmt->execute();
$payroll_history = $stmt->get_result();

// Calculate average wage
$stmt = $conn->prepare("SELECT AVG(hourlyRate) as avg_wage FROM employees WHERE status = 'active'");
$stmt->execute();
$avg_wage_result = $stmt->get_result()->fetch_assoc();
$average_wage = $avg_wage_result['avg_wage'] ?? 0;
$stmt->close();

include 'header.php';
?>

<main class="main-content" id="main-content">
    <!-- Page Header -->
    <header class="page-header">
        <div class="page-title-section">
            <h1 class="page-title">Payroll Management</h1>
            <p class="page-subtitle">Manage employee wages, overtime, and payroll processing</p>
        </div>
        <div class="page-actions">
            <button class="btn btn-outline payroll-refresh-btn" onclick="location.reload()">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Refresh Data
            </button>
            <button class="btn btn-primary process-payroll-btn" onclick="showProcessPayrollModal()">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Process Payroll
            </button>
        </div>
    </header>

    <!-- Success/Error Messages -->
    <?php if (isset($_SESSION['success_message'])): ?>
        <div class="alert alert-success">
            <?php echo htmlspecialchars($_SESSION['success_message']); unset($_SESSION['success_message']); ?>
        </div>
    <?php endif; ?>
    
    <?php if (isset($_SESSION['error_message'])): ?>
        <div class="alert alert-error">
            <?php echo htmlspecialchars($_SESSION['error_message']); unset($_SESSION['error_message']); ?>
        </div>
    <?php endif; ?>

    <!-- Main Content Area -->
    <div class="content-area">
        <!-- Main Content Grid -->
        <div class="tiles-grid grid-payroll-2">
            <!-- Payroll Overview Tile -->
            <div class="tile payroll-overview-tile">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Payroll Overview</h3>
                        <p class="tile-subtitle">Current pay period summary</p>
                    </div>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <div class="payroll-summary">
                        <div class="summary-header">
                            <h4>Current Pay Period</h4>
                            <p class="pay-period-dates">
                                <?php echo date('M j, Y', strtotime($current_period['start'])); ?> - 
                                <?php echo date('M j, Y', strtotime($current_period['end'])); ?>
                            </p>
                        </div>
                        
                        <div class="summary-stats">
                            <div class="stat-item">
                                <div class="stat-value">₱<?php echo number_format($payroll_overview['total_gross_pay'], 2); ?></div>
                                <div class="stat-label">Gross Pay</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">₱<?php echo number_format($payroll_overview['total_net_pay'], 2); ?></div>
                                <div class="stat-label">Net Pay</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">₱<?php echo number_format($payroll_overview['total_taxes'], 2); ?></div>
                                <div class="stat-label">Total Taxes</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value"><?php echo number_format($payroll_overview['total_regular_hours'], 1); ?>h</div>
                                <div class="stat-label">Regular Hours</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value"><?php echo number_format($payroll_overview['total_overtime_hours'], 1); ?>h</div>
                                <div class="stat-label">Overtime Hours</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value"><?php echo $payroll_overview['total_employees']; ?></div>
                                <div class="stat-label">Employees</div>
                            </div>
                        </div>

                        <div class="summary-actions">
                            <button class="btn btn-primary process-payroll-btn" onclick="showProcessPayrollModal()">
                                Process Payroll
                            </button>
                            <button class="btn btn-secondary export-payroll-btn" onclick="exportPayrollData()">
                                Export Data
                            </button>
                            <button class="btn btn-outline payroll-refresh-btn" onclick="location.reload()">
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Employee Wages Tile -->
            <div class="tile employee-wages-tile">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Employee Wages</h3>
                        <p class="tile-subtitle">Manage hourly rates and salaries</p>
                    </div>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="m22 2-5 10-5-4-5 10"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <div class="wages-header">
                        <h4>Employee Wages</h4>
                        <div class="wages-summary">
                            <span>Average Rate: ₱<?php echo number_format($average_wage, 2); ?>/hr</span>
                        </div>
                    </div>
                    <div class="wages-list">
                        <?php while ($employee = $employees->fetch_assoc()): ?>
                            <div class="wage-item" data-employee-id="<?php echo $employee['id']; ?>">
                                <div class="employee-info">
                                    <div class="employee-name"><?php echo htmlspecialchars($employee['firstName']); ?></div>
                                    <div class="employee-role"><?php echo htmlspecialchars($employee['position']); ?> - <?php echo htmlspecialchars($employee['department']); ?></div>
                                </div>
                                <div class="wage-details">
                                    <div class="hourly-rate">₱<?php echo number_format($employee['hourlyRate'], 2); ?>/hr</div>
                                    <div class="period-earnings">
                                        ₱<?php echo number_format($employee['hourlyRate'] * 80, 2); ?> this period
                                    </div>
                                </div>
                                <div class="wage-actions">
                                    <button class="btn btn-sm btn-outline edit-wage-btn" 
                                            onclick="showEditWageModal(<?php echo $employee['id']; ?>, '<?php echo htmlspecialchars($employee['firstName']); ?>', <?php echo $employee['hourlyRate']; ?>)">
                                        Edit Wage
                                    </button>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                </div>
            </div>

            <!-- Overtime Requests Tile -->
            <div class="tile overtime-requests-tile">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Overtime Requests</h3>
                        <p class="tile-subtitle">Review and approve overtime</p>
                    </div>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <div class="overtime-header">
                        <h4>Overtime Requests</h4>
                        <div class="overtime-summary">
                            <?php
                            $pending_count = 0;
                            $overtime_requests->data_seek(0);
                            while ($request = $overtime_requests->fetch_assoc()) {
                                if ($request['status'] === 'pending') $pending_count++;
                            }
                            ?>
                            <span class="pending-count"><?php echo $pending_count; ?> pending</span>
                        </div>
                    </div>
                    
                    <div class="overtime-content">
                        <?php 
                        $overtime_requests->data_seek(0);
                        $has_requests = false;
                        while ($request = $overtime_requests->fetch_assoc()): 
                            $has_requests = true;
                            $status_class = 'status-' . $request['status'];
                        ?>
                            <div class="overtime-request <?php echo $status_class; ?>" data-request-id="<?php echo $request['id']; ?>">
                                <div class="request-info">
                                    <div class="employee-name"><?php echo htmlspecialchars($request['employee_name']); ?></div>
                                    <div class="request-details">
                                        <span class="request-date"><?php echo date('M j, Y', strtotime($request['request_date'])); ?></span>
                                        <span class="request-hours"><?php echo $request['hours']; ?> hours</span>
                                        <span class="request-reason"><?php echo htmlspecialchars($request['reason']); ?></span>
                                    </div>
                                </div>
                                <div class="request-status">
                                    <span class="status-badge status-<?php echo $request['status']; ?>"><?php echo ucfirst($request['status']); ?></span>
                                    <?php if ($request['approved_date']): ?>
                                        <div class="approval-date">
                                            <?php echo date('M j, Y', strtotime($request['approved_date'])); ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                <?php if ($request['status'] === 'pending'): ?>
                                    <div class="request-actions">
                                        <form method="POST" style="display: inline;">
                                            <input type="hidden" name="action" value="approve_overtime">
                                            <input type="hidden" name="request_id" value="<?php echo $request['id']; ?>">
                                            <button type="submit" class="btn btn-sm btn-success">Approve</button>
                                        </form>
                                        <button class="btn btn-sm btn-danger" 
                                                onclick="showDenyOvertimeModal(<?php echo $request['id']; ?>, '<?php echo htmlspecialchars($request['employee_name']); ?>')">
                                            Deny
                                        </button>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endwhile; ?>
                        
                        <?php if (!$has_requests): ?>
                            <div class="no-requests">
                                <p>No overtime requests found</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Payroll History Tile -->
            <div class="tile payroll-history-tile">
                <div class="tile-header">
                    <div>
                        <h3 class="tile-title">Payroll History</h3>
                        <p class="tile-subtitle">View past payroll records</p>
                    </div>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <div class="history-header">
                        <h4>Payroll History</h4>
                        <div class="history-controls">
                            <select class="pay-period-select" onchange="filterPayrollHistory(this.value)">
                                <option value="current">Current Period</option>
                                <option value="last">Last Period</option>
                                <option value="last-3">Last 3 Periods</option>
                                <option value="all">All Periods</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="history-list">
                        <?php 
                        $has_history = false;
                        while ($record = $payroll_history->fetch_assoc()): 
                            $has_history = true;
                        ?>
                            <div class="history-item" data-record-id="<?php echo $record['id']; ?>">
                                <div class="history-info">
                                    <div class="employee-name"><?php echo htmlspecialchars($record['employee_name']); ?></div>
                                    <div class="pay-period">
                                        <?php echo date('M j', strtotime($record['pay_period_start'])); ?> - 
                                        <?php echo date('M j, Y', strtotime($record['pay_period_end'])); ?>
                                    </div>
                                </div>
                                <div class="history-details">
                                    <div class="hours-worked">
                                        <span class="regular-hours"><?php echo number_format($record['regular_hours'], 1); ?>h regular</span>
                                        <?php if ($record['overtime_hours'] > 0): ?>
                                            <span class="overtime-hours"><?php echo number_format($record['overtime_hours'], 1); ?>h overtime</span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="pay-amounts">
                                        <div class="gross-pay">₱<?php echo number_format($record['gross_pay'], 2); ?> gross</div>
                                        <div class="net-pay">₱<?php echo number_format($record['net_pay'], 2); ?> net</div>
                                    </div>
                                </div>
                                <div class="history-status">
                                    <span class="status-badge status-<?php echo $record['status']; ?>"><?php echo ucfirst($record['status']); ?></span>
                                </div>
                            </div>
                        <?php endwhile; ?>
                        
                        <?php if (!$has_history): ?>
                            <div class="no-history">
                                <p>No payroll history found</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>

<!-- Modals -->
<div id="modal-container"></div>

<!-- Edit Wage Modal -->
<div id="editWageModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="editWageTitle">Edit Employee Wage</h3>
            <button class="modal-close" onclick="closeModal('editWageModal')">&times;</button>
        </div>
        <form method="POST" class="modal-body">
            <input type="hidden" name="action" value="update_wage">
            <input type="hidden" name="employee_id" id="editWageEmployeeId">
            
            <div class="form-group">
                <label for="hourly_rate">Hourly Rate (₱)</label>
                <input type="number" name="hourly_rate" id="editWageRate" step="0.01" min="0" required>
            </div>
            
            <div class="form-group">
                <label for="notes">Notes (optional)</label>
                <textarea name="notes" id="editWageNotes" rows="3" placeholder="Reason for wage change..."></textarea>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('editWageModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Wage</button>
            </div>
        </form>
    </div>
</div>

<!-- Deny Overtime Modal -->
<div id="denyOvertimeModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="denyOvertimeTitle">Deny Overtime Request</h3>
            <button class="modal-close" onclick="closeModal('denyOvertimeModal')">&times;</button>
        </div>
        <form method="POST" class="modal-body">
            <input type="hidden" name="action" value="deny_overtime">
            <input type="hidden" name="request_id" id="denyOvertimeRequestId">
            
            <div class="form-group">
                <label for="reason">Reason for denial</label>
                <textarea name="reason" id="denyOvertimeReason" rows="4" placeholder="Please provide a reason for denying this request..." required></textarea>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('denyOvertimeModal')">Cancel</button>
                <button type="submit" class="btn btn-danger">Deny Request</button>
            </div>
        </form>
    </div>
</div>

<!-- Process Payroll Modal -->
<div id="processPayrollModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Process Payroll</h3>
            <button class="modal-close" onclick="closeModal('processPayrollModal')">&times;</button>
        </div>
        <form method="POST" class="modal-body">
            <input type="hidden" name="action" value="process_payroll">
            <input type="hidden" name="pay_period_start" value="<?php echo $current_period['start']; ?>">
            <input type="hidden" name="pay_period_end" value="<?php echo $current_period['end']; ?>">
            
            <div class="process-payroll-summary">
                <h4>Pay Period: <?php echo date('M j', strtotime($current_period['start'])); ?> - <?php echo date('M j, Y', strtotime($current_period['end'])); ?></h4>
                
                <div class="payroll-totals">
                    <div class="total-item">
                        <span class="label">Total Gross Pay:</span>
                        <span class="value">₱<?php echo number_format($payroll_overview['total_gross_pay'], 2); ?></span>
                    </div>
                    <div class="total-item">
                        <span class="label">Total Net Pay:</span>
                        <span class="value">₱<?php echo number_format($payroll_overview['total_net_pay'], 2); ?></span>
                    </div>
                    <div class="total-item">
                        <span class="label">Employees:</span>
                        <span class="value"><?php echo $payroll_overview['total_employees']; ?></span>
                    </div>
                </div>
                
                <div class="process-warning">
                    <p><strong>Warning:</strong> Processing payroll will finalize all calculations for this pay period. This action cannot be undone.</p>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('processPayrollModal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Process Payroll</button>
            </div>
        </form>
    </div>
</div>

<script>
// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showEditWageModal(employeeId, employeeName, currentRate) {
    document.getElementById('editWageEmployeeId').value = employeeId;
    document.getElementById('editWageRate').value = currentRate;
    document.getElementById('editWageTitle').textContent = 'Edit Wage - ' + employeeName;
    document.getElementById('editWageNotes').value = '';
    showModal('editWageModal');
}

function showDenyOvertimeModal(requestId, employeeName) {
    document.getElementById('denyOvertimeRequestId').value = requestId;
    document.getElementById('denyOvertimeTitle').textContent = 'Deny Overtime Request - ' + employeeName;
    document.getElementById('denyOvertimeReason').value = '';
    showModal('denyOvertimeModal');
}

function showProcessPayrollModal() {
    showModal('processPayrollModal');
}

function exportPayrollData() {
    // Create CSV export
    const csvData = [
        ['Employee Name', 'Pay Period Start', 'Pay Period End', 'Regular Hours', 'Overtime Hours', 'Hourly Rate', 'Gross Pay', 'Net Pay'],
        <?php
        $employees->data_seek(0);
        $csv_rows = [];
        while ($employee = $employees->fetch_assoc()) {
            $gross_pay = $employee['hourlyRate'] * 80;
            $net_pay = $gross_pay * 0.8;
            $csv_rows[] = "['" . addslashes($employee['firstName']) . "', '" . $current_period['start'] . "', '" . $current_period['end'] . "', '80', '0', '" . $employee['hourlyRate'] . "', '" . $gross_pay . "', '" . $net_pay . "']";
        }
        echo implode(',', $csv_rows);
        ?>
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payroll_<?php echo $current_period['start']; ?>_<?php echo $current_period['end']; ?>.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function filterPayrollHistory(period) {
    // This would typically reload the page with filter parameters
    // For now, we'll just reload the page
    location.reload();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
</script>

<style>
/* Modal Styles */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    align-items: center;
    justify-content: center;
}

.modal-content {
    background-color: var(--bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    color: var(--text-primary);
}

.modal-body {
    padding: 1.5rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: var(--font-size-base);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
}

.process-payroll-summary h4 {
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.payroll-totals {
    margin-bottom: 1.5rem;
}

.total-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.total-item:last-child {
    border-bottom: none;
}

.total-item .label {
    color: var(--text-secondary);
}

.total-item .value {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
}

.process-warning {
    background-color: rgba(255, 149, 0, 0.1);
    border: 1px solid rgba(255, 149, 0, 0.3);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 1rem;
}

.process-warning p {
    margin: 0;
    color: #ff9500;
    font-size: var(--font-size-sm);
}

/* Alert Styles */
.alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
}

.alert-success {
    background-color: rgba(52, 199, 89, 0.1);
    border: 1px solid rgba(52, 199, 89, 0.3);
    color: #34c759;
}

.alert-error {
    background-color: rgba(255, 59, 48, 0.1);
    border: 1px solid rgba(255, 59, 48, 0.3);
    color: #ff3b30;
}

/* Existing payroll-specific styles from the original HTML */
.payroll-summary {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.summary-header h4 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.pay-period-dates {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: 0;
}

.summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
}

.stat-item {
    text-align: center;
    padding: 1rem;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
}

.stat-value {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--accent-primary);
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.summary-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.wages-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.wages-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
}

.wage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: all var(--transition-fast);
}

.wage-item:hover {
    background-color: var(--bg-tertiary);
}

.employee-info {
    flex: 1;
}

.employee-name {
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.employee-role {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.wage-details {
    text-align: center;
    margin: 0 1rem;
}

.hourly-rate {
    font-weight: var(--font-weight-semibold);
    color: var(--accent-primary);
    margin-bottom: 0.25rem;
}

.period-earnings {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.overtime-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.pending-count {
    background-color: var(--accent-light);
    color: var(--accent-primary);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
}

.overtime-content {
    max-height: 350px;
    overflow-y: auto;
}

.overtime-request {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    margin-bottom: 0.5rem;
    transition: all var(--transition-fast);
}

.overtime-request:hover {
    background-color: var(--bg-tertiary);
}

.overtime-request.status-pending {
    border-left: 3px solid #ff9500;
}

.overtime-request.status-approved {
    border-left: 3px solid #34c759;
}

.overtime-request.status-denied {
    border-left: 3px solid #ff3b30;
}

.request-info {
    flex: 1;
}

.request-details {
    display: flex;
    gap: 0.75rem;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.request-status {
    text-align: center;
    margin: 0 1rem;
}

.status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
}

.status-badge.status-pending {
    background-color: rgba(255, 149, 0, 0.1);
    color: #ff9500;
}

.status-badge.status-approved {
    background-color: rgba(52, 199, 89, 0.1);
    color: #34c759;
}

.status-badge.status-denied {
    background-color: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
}

.status-badge.status-processed {
    background-color: rgba(0, 122, 255, 0.1);
    color: #007aff;
}

.request-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 350px;
    overflow-y: auto;
}

.history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: all var(--transition-fast);
}

.history-item:hover {
    background-color: var(--bg-tertiary);
}

.history-details {
    text-align: center;
    margin: 0 1rem;
}

.hours-worked {
    display: flex;
    gap: 0.5rem;
    font-size: var(--font-size-sm);
    margin-bottom: 0.25rem;
}

.regular-hours {
    color: var(--text-secondary);
}

.overtime-hours {
    color: var(--accent-primary);
}

.pay-amounts {
    display: flex;
    gap: 0.75rem;
    font-size: var(--font-size-sm);
}

.gross-pay {
    color: var(--text-secondary);
}

.net-pay {
    color: var(--accent-primary);
    font-weight: var(--font-weight-medium);
}

.no-requests,
.no-history {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .summary-stats {
        grid-template-columns: repeat(2, 1fr);
    }

    .summary-actions {
        flex-direction: column;
    }

    .wage-item,
    .overtime-request,
    .history-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .wage-details,
    .request-status,
    .history-details {
        margin: 0;
        text-align: left;
    }

    .request-actions {
        align-self: stretch;
    }

    .request-actions .btn {
        flex: 1;
    }
}
</style>

<?php include 'footer.php'; ?>
