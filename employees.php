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
$employees = [];
$departments = [];
$managers = [];
$stats = [
    'total' => 0,
    'active' => 0,
    'departments' => 0,
    'newThisMonth' => 0
];

// Handle POST requests for CRUD operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add':
            $result = addEmployee($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'edit':
            $result = editEmployee($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'delete':
            $result = deleteEmployee($conn, $_POST['employee_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
    }
}

// Get filter parameters
$departmentFilter = $_GET['department'] ?? '';
$statusFilter = $_GET['status'] ?? '';
$roleFilter = $_GET['role'] ?? '';
$searchFilter = $_GET['search'] ?? '';

// Build WHERE clause for filters
$whereConditions = [];
$params = [];
$types = '';

if (!empty($departmentFilter)) {
    $whereConditions[] = "department = ?";
    $params[] = $departmentFilter;
    $types .= 's';
}

if (!empty($statusFilter)) {
    $whereConditions[] = "status = ?";
    $params[] = $statusFilter;
    $types .= 's';
}

if (!empty($roleFilter)) {
    $whereConditions[] = "role = ?";
    $params[] = $roleFilter;
    $types .= 's';
}

if (!empty($searchFilter)) {
    $whereConditions[] = "(firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR employeeCode LIKE ? OR department LIKE ? OR position LIKE ?)";
    $searchTerm = '%' . $searchFilter . '%';
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    $types .= 'ssssss';
}

$whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

// Fetch employees with filters
$sql = "SELECT * FROM employees $whereClause ORDER BY lastName, firstName";
$stmt = mysqli_prepare($conn, $sql);

if (!empty($params)) {
    mysqli_stmt_bind_param($stmt, $types, ...$params);
}

mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

while ($row = mysqli_fetch_assoc($result)) {
    $employees[] = $row;
}

// Fetch departments for filter dropdown
$deptSql = "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department";
$deptResult = mysqli_query($conn, $deptSql);
while ($row = mysqli_fetch_assoc($deptResult)) {
    $departments[] = $row['department'];
}

// Fetch managers for form dropdown
$managerSql = "SELECT id, firstName, lastName FROM employees WHERE role IN ('admin', 'manager') ORDER BY firstName, lastName";
$managerResult = mysqli_query($conn, $managerSql);
while ($row = mysqli_fetch_assoc($managerResult)) {
    $managers[] = $row;
}

// Calculate statistics
$statsSql = "SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    COUNT(DISTINCT department) as departments,
    SUM(CASE WHEN hireDate >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) as newThisMonth
    FROM employees";
$statsResult = mysqli_query($conn, $statsSql);
$stats = mysqli_fetch_assoc($statsResult);

// Functions for CRUD operations
function addEmployee($conn, $data) {
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'department', 'position', 'hireDate', 'role', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return ['message' => ucfirst($field) . ' is required', 'type' => 'error'];
        }
    }
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        return ['message' => 'Invalid email format', 'type' => 'error'];
    }
    
    // Check for duplicate email
    $checkSql = "SELECT id FROM employees WHERE email = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 's', $data['email']);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) > 0) {
        return ['message' => 'Email already exists', 'type' => 'error'];
    }
    
    // Generate employee code
    $employeeCode = generateEmployeeCode($conn);
    
    // Generate username and password
    $username = strtolower($data['firstName'] . '.' . $data['lastName']);
    $password = 'password123'; // Default password
    
    // Prepare schedule data
    $schedule = json_encode([
        'monday' => ['active' => isset($data['mondayActive']), 'start' => $data['mondayStart'] ?? '09:00', 'end' => $data['mondayEnd'] ?? '17:00'],
        'tuesday' => ['active' => isset($data['tuesdayActive']), 'start' => $data['tuesdayStart'] ?? '09:00', 'end' => $data['tuesdayEnd'] ?? '17:00'],
        'wednesday' => ['active' => isset($data['wednesdayActive']), 'start' => $data['wednesdayStart'] ?? '09:00', 'end' => $data['wednesdayEnd'] ?? '17:00'],
        'thursday' => ['active' => isset($data['thursdayActive']), 'start' => $data['thursdayStart'] ?? '09:00', 'end' => $data['thursdayEnd'] ?? '17:00'],
        'friday' => ['active' => isset($data['fridayActive']), 'start' => $data['fridayStart'] ?? '09:00', 'end' => $data['fridayEnd'] ?? '17:00'],
        'saturday' => ['active' => isset($data['saturdayActive']), 'start' => $data['saturdayStart'] ?? '09:00', 'end' => $data['saturdayEnd'] ?? '17:00'],
        'sunday' => ['active' => isset($data['sundayActive']), 'start' => $data['sundayStart'] ?? '09:00', 'end' => $data['sundayEnd'] ?? '17:00']
    ]);
    
    $sql = "INSERT INTO employees (employeeCode, firstName, lastName, email, phone, department, position, manager, hireDate, salary, role, status, username, password, schedule, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'sssssssssdsssss', 
        $employeeCode,
        $data['firstName'],
        $data['lastName'],
        $data['email'],
        $data['phone'] ?? '',
        $data['department'],
        $data['position'],
        $data['manager'] ?? '',
        $data['hireDate'],
        $data['salary'] ?? 0,
        $data['role'],
        $data['status'],
        $username,
        $password,
        $schedule
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Employee added successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error adding employee: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function editEmployee($conn, $data) {
    $employeeId = $data['employee_id'];
    
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'department', 'position', 'hireDate', 'role', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return ['message' => ucfirst($field) . ' is required', 'type' => 'error'];
        }
    }
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        return ['message' => 'Invalid email format', 'type' => 'error'];
    }
    
    // Check for duplicate email (excluding current employee)
    $checkSql = "SELECT id FROM employees WHERE email = ? AND id != ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'si', $data['email'], $employeeId);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) > 0) {
        return ['message' => 'Email already exists', 'type' => 'error'];
    }
    
    // Prepare schedule data
    $schedule = json_encode([
        'monday' => ['active' => isset($data['mondayActive']), 'start' => $data['mondayStart'] ?? '09:00', 'end' => $data['mondayEnd'] ?? '17:00'],
        'tuesday' => ['active' => isset($data['tuesdayActive']), 'start' => $data['tuesdayStart'] ?? '09:00', 'end' => $data['tuesdayEnd'] ?? '17:00'],
        'wednesday' => ['active' => isset($data['wednesdayActive']), 'start' => $data['wednesdayStart'] ?? '09:00', 'end' => $data['wednesdayEnd'] ?? '17:00'],
        'thursday' => ['active' => isset($data['thursdayActive']), 'start' => $data['thursdayStart'] ?? '09:00', 'end' => $data['thursdayEnd'] ?? '17:00'],
        'friday' => ['active' => isset($data['fridayActive']), 'start' => $data['fridayStart'] ?? '09:00', 'end' => $data['fridayEnd'] ?? '17:00'],
        'saturday' => ['active' => isset($data['saturdayActive']), 'start' => $data['saturdayStart'] ?? '09:00', 'end' => $data['saturdayEnd'] ?? '17:00'],
        'sunday' => ['active' => isset($data['sundayActive']), 'start' => $data['sundayStart'] ?? '09:00', 'end' => $data['sundayEnd'] ?? '17:00']
    ]);
    
    $sql = "UPDATE employees SET firstName = ?, lastName = ?, email = ?, phone = ?, department = ?, position = ?, manager = ?, hireDate = ?, salary = ?, role = ?, status = ?, schedule = ?, updatedAt = NOW() WHERE id = ?";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'ssssssssdssi',
        $data['firstName'],
        $data['lastName'],
        $data['email'],
        $data['phone'] ?? '',
        $data['department'],
        $data['position'],
        $data['manager'] ?? '',
        $data['hireDate'],
        $data['salary'] ?? 0,
        $data['role'],
        $data['status'],
        $schedule,
        $employeeId
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Employee updated successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error updating employee: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function deleteEmployee($conn, $employeeId) {
    // Check if employee exists
    $checkSql = "SELECT firstName, lastName FROM employees WHERE id = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'i', $employeeId);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) === 0) {
        return ['message' => 'Employee not found', 'type' => 'error'];
    }
    
    $employee = mysqli_fetch_assoc($checkResult);
    $employeeName = $employee['firstName'] . ' ' . $employee['lastName'];
    
    // Delete related attendance records first
    $deleteAttendanceSql = "DELETE FROM attendance WHERE employee_id = ?";
    $deleteAttendanceStmt = mysqli_prepare($conn, $deleteAttendanceSql);
    mysqli_stmt_bind_param($deleteAttendanceStmt, 'i', $employeeId);
    mysqli_stmt_execute($deleteAttendanceStmt);
    
    // Delete employee
    $deleteSql = "DELETE FROM employees WHERE id = ?";
    $deleteStmt = mysqli_prepare($conn, $deleteSql);
    mysqli_stmt_bind_param($deleteStmt, 'i', $employeeId);
    
    if (mysqli_stmt_execute($deleteStmt)) {
        return ['message' => $employeeName . ' has been successfully deleted from the system', 'type' => 'success'];
    } else {
        return ['message' => 'Error deleting employee: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function generateEmployeeCode($conn) {
    $sql = "SELECT employeeCode FROM employees WHERE employeeCode LIKE 'emp_%' ORDER BY employeeCode DESC LIMIT 1";
    $result = mysqli_query($conn, $sql);
    
    if (mysqli_num_rows($result) > 0) {
        $row = mysqli_fetch_assoc($result);
        $lastCode = $row['employeeCode'];
        $number = intval(substr($lastCode, 4)) + 1;
    } else {
        $number = 1;
    }
    
    return 'emp_' . str_pad($number, 3, '0', STR_PAD_LEFT);
}

function getStatusIcon($status) {
    $icons = [
        'active' => '✅',
        'inactive' => '⏸️',
        'suspended' => '🚫'
    ];
    return $icons[$status] ?? '❓';
}

// Get employee for editing if edit parameter is present
$editEmployee = null;
if (isset($_GET['edit'])) {
    $editId = intval($_GET['edit']);
    $editSql = "SELECT * FROM employees WHERE id = ?";
    $editStmt = mysqli_prepare($conn, $editSql);
    mysqli_stmt_bind_param($editStmt, 'i', $editId);
    mysqli_stmt_execute($editStmt);
    $editResult = mysqli_stmt_get_result($editStmt);
    
    if (mysqli_num_rows($editResult) > 0) {
        $editEmployee = mysqli_fetch_assoc($editResult);
    }
}

// Get employee for viewing if view parameter is present
$viewEmployee = null;
if (isset($_GET['view'])) {
    $viewId = intval($_GET['view']);
    $viewSql = "SELECT * FROM employees WHERE id = ?";
    $viewStmt = mysqli_prepare($conn, $viewSql);
    mysqli_stmt_bind_param($viewStmt, 'i', $viewId);
    mysqli_stmt_execute($viewStmt);
    $viewResult = mysqli_stmt_get_result($viewStmt);
    
    if (mysqli_num_rows($viewResult) > 0) {
        $viewEmployee = mysqli_fetch_assoc($viewResult);
    }
}
// Include header
include 'header.php';
?>

            <!-- Header -->
            <header class="page-header">
                <div class="header-top">
                    <div class="header-title">
                        <h1>Employee Management</h1>
                        <p>Manage employee profiles, information, and system access</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-outline" onclick="exportData()" title="Export employee data">
                            <span class="btn-icon">📥</span>
                            <span class="btn-text">Export</span>
                        </button>
                        <button class="btn btn-secondary" onclick="location.reload()" title="Refresh data">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Refresh</span>
                        </button>
                        <button class="btn btn-primary" onclick="openModal()">
                            <span class="btn-icon">👤➕</span>
                            <span class="btn-text">Add Employee</span>
                        </button>
                    </div>
                </div>
                
                <!-- Filters and Search -->
                <form method="GET" class="header-filters">
                    <div class="filter-group">
                        <label for="department" class="filter-label">Department:</label>
                        <select name="department" id="department" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Departments</option>
                            <?php foreach ($departments as $dept): ?>
                                <option value="<?php echo htmlspecialchars($dept); ?>" <?php echo $departmentFilter === $dept ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($dept); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="status" class="filter-label">Status:</label>
                        <select name="status" id="status" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Status</option>
                            <option value="active" <?php echo $statusFilter === 'active' ? 'selected' : ''; ?>>Active</option>
                            <option value="inactive" <?php echo $statusFilter === 'inactive' ? 'selected' : ''; ?>>Inactive</option>
                            <option value="suspended" <?php echo $statusFilter === 'suspended' ? 'selected' : ''; ?>>Suspended</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="role" class="filter-label">Role:</label>
                        <select name="role" id="role" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Roles</option>
                            <option value="admin" <?php echo $roleFilter === 'admin' ? 'selected' : ''; ?>>Admin</option>
                            <option value="manager" <?php echo $roleFilter === 'manager' ? 'selected' : ''; ?>>Manager</option>
                            <option value="employee" <?php echo $roleFilter === 'employee' ? 'selected' : ''; ?>>Employee</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="search" class="filter-label">Search:</label>
                        <input type="text" name="search" id="search" class="filter-input" placeholder="Search employees..." value="<?php echo htmlspecialchars($searchFilter); ?>" onchange="this.form.submit()">
                    </div>
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
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['total']; ?></div>
                            <div class="stat-label">Total Employees</div>
                        </div>
                    </div>
                    <div class="stat-card stat-active">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['active']; ?></div>
                            <div class="stat-label">Active</div>
                        </div>
                    </div>
                    <div class="stat-card stat-departments">
                        <div class="stat-icon">🏢</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['departments']; ?></div>
                            <div class="stat-label">Departments</div>
                        </div>
                    </div>
                    <div class="stat-card stat-new">
                        <div class="stat-icon">🆕</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['newThisMonth']; ?></div>
                            <div class="stat-label">New This Month</div>
                        </div>
                    </div>
                </div>

                <!-- Employees Table -->
                <div class="card">
                    <div class="card-header">
                        <h3>Employee Directory</h3>
                    </div>
                    <div class="card-content">
                        <?php if (empty($employees)): ?>
                            <div class="empty-state">
                                <div class="empty-icon">👥</div>
                                <h3>No employees found</h3>
                                <p>No employees match the selected filters. Try adjusting your search criteria.</p>
                                <button class="btn btn-primary" onclick="openModal()">
                                    <span class="btn-icon">👤➕</span>
                                    <span class="btn-text">Add First Employee</span>
                                </button>
                            </div>
                        <?php else: ?>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Employee ID</th>
                                            <th>Department</th>
                                            <th>Position</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($employees as $employee): ?>
                                            <tr>
                                                <td>
                                                    <div class="employee-info">
                                                        <div class="employee-name"><?php echo htmlspecialchars($employee['firstName'] . ' ' . $employee['lastName']); ?></div>
                                                        <div class="employee-email"><?php echo htmlspecialchars($employee['email']); ?></div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="employee-code"><?php echo htmlspecialchars($employee['employeeCode']); ?></span>
                                                </td>
                                                <td><?php echo htmlspecialchars($employee['department']); ?></td>
                                                <td><?php echo htmlspecialchars($employee['position']); ?></td>
                                                <td><?php echo htmlspecialchars($employee['email']); ?></td>
                                                <td>
                                                    <span class="status-badge status-<?php echo $employee['status']; ?>">
                                                        <?php echo getStatusIcon($employee['status']); ?> <?php echo ucfirst($employee['status']); ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-sm btn-outline" onclick="openModal(<?php echo $employee['id']; ?>)" title="Edit Employee">
                                                            <span class="btn-icon">✏️</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline" onclick="viewEmployee(<?php echo $employee['id']; ?>)" title="View Details">
                                                            <span class="btn-icon">👁️</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-danger" onclick="deleteEmployee(<?php echo $employee['id']; ?>, '<?php echo htmlspecialchars($employee['firstName'] . ' ' . $employee['lastName']); ?>')" title="Delete Employee">
                                                            <span class="btn-icon">🗑️</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

    <!-- Employee Modal -->
    <div class="modal-overlay hidden" id="employeeModal">
        <div class="modal large">
            <div class="modal-header">
                <h3 id="modalTitle">Add Employee</h3>
                <button class="modal-close" onclick="closeModal()" aria-label="Close modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-content">
                <form id="employeeForm" method="POST" class="form">
                    <input type="hidden" name="action" id="formAction" value="add">
                    <input type="hidden" name="employee_id" id="employeeId">
                    
                    <!-- Personal Information -->
                    <div class="form-section">
                        <h4>Personal Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="firstName" class="form-label">First Name *</label>
                                <input type="text" name="firstName" id="firstName" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label for="lastName" class="form-label">Last Name *</label>
                                <input type="text" name="lastName" id="lastName" class="form-input" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="email" class="form-label">Email Address *</label>
                                <input type="email" name="email" id="email" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label for="phone" class="form-label">Phone Number</label>
                                <input type="tel" name="phone" id="phone" class="form-input">
                            </div>
                        </div>
                    </div>

                    <!-- Employment Information -->
                    <div class="form-section">
                        <h4>Employment Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="department" class="form-label">Department *</label>
                                <select name="department" id="departmentSelect" class="form-input" required>
                                    <option value="">Select Department</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Sales">Sales</option>
                                    <option value="HR">Human Resources</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Operations">Operations</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="position" class="form-label">Position/Title *</label>
                                <input type="text" name="position" id="position" class="form-input" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="manager" class="form-label">Manager</label>
                                <select name="manager" id="manager" class="form-input">
                                    <option value="">Select Manager</option>
                                    <?php foreach ($managers as $manager): ?>
                                        <option value="<?php echo htmlspecialchars($manager['firstName'] . ' ' . $manager['lastName']); ?>">
                                            <?php echo htmlspecialchars($manager['firstName'] . ' ' . $manager['lastName']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="hireDate" class="form-label">Hire Date *</label>
                                <input type="date" name="hireDate" id="hireDate" class="form-input" required value="<?php echo date('Y-m-d'); ?>">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="salary" class="form-label">Salary</label>
                                <input type="number" name="salary" id="salary" class="form-input" step="0.01" min="0">
                            </div>
                        </div>
                    </div>

                    <!-- System Access -->
                    <div class="form-section">
                        <h4>System Access</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="role" class="form-label">System Role *</label>
                                <select name="role" id="roleSelect" class="form-input" required>
                                    <option value="">Select Role</option>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="status" class="form-label">Status *</label>
                                <select name="status" id="statusSelect" class="form-input" required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Work Schedule -->
                    <div class="form-section">
                        <h4>Work Schedule</h4>
                        <div class="schedule-grid">
                            <?php 
                            $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                            $dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                            for ($i = 0; $i < count($days); $i++): 
                                $day = $days[$i];
                                $label = $dayLabels[$i];
                                $checked = in_array($day, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) ? 'checked' : '';
                            ?>
                                <div class="schedule-day">
                                    <label class="checkbox-container">
                                        <input type="checkbox" name="<?php echo $day; ?>Active" id="<?php echo $day; ?>Active" <?php echo $checked; ?>>
                                        <span class="checkbox-checkmark"></span>
                                        <span class="checkbox-label"><?php echo $label; ?></span>
                                    </label>
                                    <div class="time-inputs">
                                        <input type="time" name="<?php echo $day; ?>Start" id="<?php echo $day; ?>Start" value="09:00" class="form-input">
                                        <span>to</span>
                                        <input type="time" name="<?php echo $day; ?>End" id="<?php echo $day; ?>End" value="17:00" class="form-input">
                                    </div>
                                </div>
                            <?php endfor; ?>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span class="btn-text">Save Employee</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- View Employee Modal -->
    <?php if ($viewEmployee): ?>
        <div class="modal-overlay active" id="viewEmployeeModal">
            <div class="modal large">
                <div class="modal-header">
                    <h3>Employee Details</h3>
                    <button class="modal-close" onclick="closeViewModal()" aria-label="Close modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="employee-details">
                        <!-- Personal Information -->
                        <div class="detail-section">
                            <h4>Personal Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Full Name</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['firstName'] . ' ' . $viewEmployee['lastName']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Employee ID</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['employeeCode']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Email Address</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['email']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Phone Number</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['phone'] ?: 'N/A'); ?></div>
                                </div>
                            </div>
                        </div>

                        <!-- Employment Information -->
                        <div class="detail-section">
                            <h4>Employment Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Department</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['department']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Position</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['position']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Manager</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewEmployee['manager'] ?: 'N/A'); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Hire Date</label>
                                    <div class="detail-value"><?php echo date('F j, Y', strtotime($viewEmployee['hireDate'])); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Salary</label>
                                    <div class="detail-value"><?php echo $viewEmployee['salary'] ? '₱' . number_format($viewEmployee['salary'], 2) : 'N/A'; ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">System Role</label>
                                    <div class="detail-value"><?php echo ucfirst($viewEmployee['role']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Status</label>
                                    <div class="detail-value">
                                        <span class="status-badge status-<?php echo $viewEmployee['status']; ?>">
                                            <?php echo getStatusIcon($viewEmployee['status']); ?> <?php echo ucfirst($viewEmployee['status']); ?>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Work Schedule -->
                        <div class="detail-section">
                            <h4>Work Schedule</h4>
                            <div class="detail-value">
                                <?php 
                                $schedule = json_decode($viewEmployee['schedule'], true);
                                if ($schedule):
                                    foreach ($schedule as $day => $daySchedule):
                                        if ($daySchedule['active']):
                                ?>
                                    <div class="schedule-item">
                                        <strong><?php echo ucfirst($day); ?>:</strong> 
                                        <?php echo $daySchedule['start']; ?> - <?php echo $daySchedule['end']; ?>
                                    </div>
                                <?php 
                                        else:
                                ?>
                                    <div class="schedule-item">
                                        <strong><?php echo ucfirst($day); ?>:</strong> Not scheduled
                                    </div>
                                <?php 
                                        endif;
                                    endforeach;
                                else:
                                ?>
                                    <div>No schedule information available</div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" onclick="closeViewModal()">
                            <span class="btn-text">Close</span>
                        </button>
                        <button type="button" class="btn btn-primary" onclick="editFromView(<?php echo $viewEmployee['id']; ?>)">
                            <span class="btn-icon">✏️</span>
                            <span class="btn-text">Edit Employee</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <!-- Scripts -->
    <script>
        // Modal functions
        function openModal(employeeId = null) {
            const modal = document.getElementById('employeeModal');
            const form = document.getElementById('employeeForm');
            const title = document.getElementById('modalTitle');
            const formAction = document.getElementById('formAction');
            const employeeIdField = document.getElementById('employeeId');
            
            if (employeeId) {
                // Edit mode
                title.textContent = 'Edit Employee';
                formAction.value = 'edit';
                employeeIdField.value = employeeId;
                
                // Load employee data via AJAX or redirect
                window.location.href = `employees.php?edit=${employeeId}`;
                return;
            } else {
                // Add mode
                title.textContent = 'Add Employee';
                formAction.value = 'add';
                employeeIdField.value = '';
                form.reset();
                
                // Set default values
                document.getElementById('hireDate').value = new Date().toISOString().split('T')[0];
                document.getElementById('statusSelect').value = 'active';
                document.getElementById('roleSelect').value = 'employee';
                
                // Set default schedule
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                    document.getElementById(day + 'Active').checked = true;
                    document.getElementById(day + 'Start').value = '09:00';
                    document.getElementById(day + 'End').value = '17:00';
                });
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeModal() {
            const modal = document.getElementById('employeeModal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        function viewEmployee(employeeId) {
            window.location.href = `employees.php?view=${employeeId}`;
        }
        
        function closeViewModal() {
            window.location.href = 'employees.php';
        }
        
        function editFromView(employeeId) {
            window.location.href = `employees.php?edit=${employeeId}`;
        }
        
        function deleteEmployee(employeeId, employeeName) {
            if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="employee_id" value="${employeeId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }
        
        function exportData() {
            // Create CSV content
            const employees = <?php echo json_encode($employees); ?>;
            const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'Position', 'Manager', 'Hire Date', 'Salary', 'Role', 'Status'];
            
            let csvContent = headers.join(',') + '\n';
            
            employees.forEach(emp => {
                const row = [
                    emp.employeeCode,
                    emp.firstName,
                    emp.lastName,
                    emp.email,
                    emp.phone || '',
                    emp.department,
                    emp.position,
                    emp.manager || '',
                    emp.hireDate,
                    emp.salary || '',
                    emp.role,
                    emp.status
                ].map(field => `"${field}"`);
                
                csvContent += row.join(',') + '\n';
            });
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        // Auto-open modal if edit parameter is present
        <?php if ($editEmployee): ?>
            document.addEventListener('DOMContentLoaded', function() {
                openEditModal(<?php echo json_encode($editEmployee); ?>);
            });
            
            function openEditModal(employee) {
                const modal = document.getElementById('employeeModal');
                const title = document.getElementById('modalTitle');
                const formAction = document.getElementById('formAction');
                const employeeIdField = document.getElementById('employeeId');
                
                title.textContent = 'Edit Employee';
                formAction.value = 'edit';
                employeeIdField.value = employee.id;
                
                // Populate form fields
                document.getElementById('firstName').value = employee.firstName;
                document.getElementById('lastName').value = employee.lastName;
                document.getElementById('email').value = employee.email;
                document.getElementById('phone').value = employee.phone || '';
                document.getElementById('departmentSelect').value = employee.department;
                document.getElementById('position').value = employee.position;
                document.getElementById('manager').value = employee.manager || '';
                document.getElementById('hireDate').value = employee.hireDate;
                document.getElementById('salary').value = employee.salary || '';
                document.getElementById('roleSelect').value = employee.role;
                document.getElementById('statusSelect').value = employee.status;
                
                // Populate schedule
                if (employee.schedule) {
                    const schedule = JSON.parse(employee.schedule);
                    Object.keys(schedule).forEach(day => {
                        const daySchedule = schedule[day];
                        const activeEl = document.getElementById(day + 'Active');
                        const startEl = document.getElementById(day + 'Start');
                        const endEl = document.getElementById(day + 'End');
                        
                        if (activeEl) activeEl.checked = daySchedule.active;
                        if (startEl) startEl.value = daySchedule.start;
                        if (endEl) endEl.value = daySchedule.end;
                    });
                }
                
                modal.classList.remove('hidden');
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        <?php endif; ?>
        
        // Close modal when clicking outside
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal-overlay')) {
                closeModal();
                closeViewModal();
            }
        });
    </script>

    <!-- Additional Styles -->
    <style>
        /* Stats Grid Layout */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
            min-height: auto;
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
        .stat-active { border-left: 4px solid #22c55e; }
        .stat-departments { border-left: 4px solid #f59e0b; }
        .stat-new { border-left: 4px solid #8b5cf6; }

        /* Table Styles */
        .table-container {
            overflow-x: auto;
            border-radius: 8px;
            border: 1px solid var(--border-color, #e5e7eb);
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .table th {
            background: var(--bg-secondary, #f9fafb);
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            color: var(--text-primary, #111827);
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            white-space: nowrap;
        }

        .table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            vertical-align: top;
        }

        .table tbody tr:hover {
            background: var(--bg-secondary, #f9fafb);
        }

        .table tbody tr:last-child td {
            border-bottom: none;
        }

        /* Card Styles */
        .card {
            background: var(--bg-primary, #ffffff);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px;
            overflow: hidden;
        }

        .card-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            background: var(--bg-secondary, #f9fafb);
        }

        .card-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary, #111827);
        }

        .card-content {
            padding: 0;
        }

        /* Action Buttons in Table */
        .action-buttons {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .action-buttons .btn {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            min-width: auto;
        }

        /* Small button styles for table actions */
        .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            min-width: auto;
            gap: 0.25rem;
        }

        .btn-sm .btn-icon {
            font-size: 0.875rem;
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

        /* Employee Info in Table */
        .employee-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .employee-name {
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .employee-email {
            font-size: 0.75rem;
            color: var(--text-tertiary, #9ca3af);
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

        .status-badge.status-active {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }

        .status-badge.status-inactive {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
        }

        .status-badge.status-suspended {
            background: #fecaca;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        /* Header Filters */
        .header-filters {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: end;
            margin-top: 1rem;
            padding: 1rem;
            background: var(--bg-secondary, #f9fafb);
            border-radius: 8px;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .filter-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
        }

        .filter-select,
        .filter-input {
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 4px;
            background: var(--bg-primary, #ffffff);
            color: var(--text-primary, #111827);
            min-width: 120px;
            font-size: 0.875rem;
        }

        .filter-select:focus,
        .filter-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Modal fixes */
        .modal.large {
            max-width: 800px;
            width: 90vw;
        }

        /* Modal overlay fixes */
        .modal-overlay {
            position: fixed !important;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }

        .modal-overlay.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
            pointer-events: all;
        }

        .modal {
            background: var(--bg-primary, #ffffff);
            border-radius: 8px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            transform: scale(0.9) translateY(20px);
            transition: all 0.3s ease-out;
            position: relative;
            display: flex;
            flex-direction: column;
        }

        .modal-overlay.active .modal {
            transform: scale(1) translateY(0);
        }

        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary, #111827);
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--text-secondary, #6b7280);
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .modal-close:hover {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-primary, #111827);
        }

        .modal-content {
            padding: 1.5rem;
            flex: 1;
            overflow-y: auto;
        }

        .modal-actions {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            background: var(--bg-secondary, #f9fafb);
        }

        /* Form styles for modal */
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

        .form-input:required:invalid {
            border-color: #ef4444;
        }

        .form-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color, #e5e7eb);
        }

        /* Button styles */
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

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Schedule grid styling */
        .schedule-grid {
            display: grid;
            gap: 1rem;
        }

        .schedule-day {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            background: var(--bg-secondary, #f9fafb);
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            min-width: 100px;
        }

        .checkbox-checkmark {
            width: 18px;
            height: 18px;
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 3px;
            position: relative;
            transition: all 0.2s ease;
        }

        .checkbox-container input[type="checkbox"] {
            display: none;
        }

        .checkbox-container input[type="checkbox"]:checked + .checkbox-checkmark {
            background: #3b82f6;
            border-color: #3b82f6;
        }

        .checkbox-container input[type="checkbox"]:checked + .checkbox-checkmark::after {
            content: '✓';
            position: absolute;
            top: -2px;
            left: 2px;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }

        .checkbox-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .time-inputs {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
        }

        .time-inputs input[type="time"] {
            padding: 0.5rem;
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 4px;
            background: var(--bg-primary, #ffffff);
            color: var(--text-primary, #111827);
            font-size: 0.875rem;
        }

        .time-inputs span {
            font-size: 0.875rem;
            color: var(--text-secondary, #6b7280);
        }

        /* Detail section styling for view modal */
        .detail-section {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .detail-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .detail-section h4 {
            margin-bottom: 1rem;
            color: var(--text-primary, #111827);
            font-weight: 600;
        }

        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .detail-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .detail-value {
            font-size: 0.875rem;
            color: var(--text-primary, #111827);
            font-weight: 500;
        }

        /* Schedule item styling for view modal */
        .schedule-item {
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border-color, #e5e7eb);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .schedule-item:last-child {
            border-bottom: none;
        }

        /* Empty state styling */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-secondary, #6b7280);
        }

        .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        .empty-state h3 {
            margin-bottom: 0.5rem;
            color: var(--text-primary, #111827);
        }

        .empty-state p {
            margin-bottom: 1.5rem;
        }
    </style>

<?php include 'footer.php'; ?>
