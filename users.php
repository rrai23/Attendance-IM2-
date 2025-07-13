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
$users = [];
$roles = ['admin', 'manager', 'employee'];
$stats = [
    'total' => 0,
    'active' => 0,
    'inactive' => 0,
    'admins' => 0,
    'managers' => 0,
    'employees' => 0
];

// Handle POST requests for CRUD operations
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add':
            $result = addUser($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'edit':
            $result = editUser($conn, $_POST);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'delete':
            $result = deleteUser($conn, $_POST['user_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
            
        case 'reset_password':
            $result = resetUserPassword($conn, $_POST['user_id']);
            $message = $result['message'];
            $messageType = $result['type'];
            break;
    }
}

// Get filter parameters
$roleFilter = $_GET['role'] ?? '';
$statusFilter = $_GET['status'] ?? '';
$searchFilter = $_GET['search'] ?? '';

// Build WHERE clause for filters
$whereConditions = [];
$params = [];
$types = '';

if (!empty($roleFilter)) {
    $whereConditions[] = "role = ?";
    $params[] = $roleFilter;
    $types .= 's';
}

if (!empty($statusFilter)) {
    $whereConditions[] = "status = ?";
    $params[] = $statusFilter;
    $types .= 's';
}

if (!empty($searchFilter)) {
    $whereConditions[] = "(firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR username LIKE ?)";
    $searchTerm = '%' . $searchFilter . '%';
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    $types .= 'ssss';
}

$whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

// Fetch users with filters
$sql = "SELECT * FROM employees $whereClause ORDER BY lastName, firstName";
$stmt = mysqli_prepare($conn, $sql);

if (!empty($params)) {
    mysqli_stmt_bind_param($stmt, $types, ...$params);
}

mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

while ($row = mysqli_fetch_assoc($result)) {
    $users[] = $row;
}

// Calculate statistics
$statsSql = "SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
    SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
    SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employees
    FROM employees";
$statsResult = mysqli_query($conn, $statsSql);
$stats = mysqli_fetch_assoc($statsResult);

// Functions for CRUD operations
function addUser($conn, $data) {
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'username', 'role', 'status'];
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
    
    // Check for duplicate username
    $checkUsernameSql = "SELECT id FROM employees WHERE username = ?";
    $checkUsernameStmt = mysqli_prepare($conn, $checkUsernameSql);
    mysqli_stmt_bind_param($checkUsernameStmt, 's', $data['username']);
    mysqli_stmt_execute($checkUsernameStmt);
    $checkUsernameResult = mysqli_stmt_get_result($checkUsernameStmt);
    
    if (mysqli_num_rows($checkUsernameResult) > 0) {
        return ['message' => 'Username already exists', 'type' => 'error'];
    }
    
    // Generate employee code
    $employeeCode = generateEmployeeCode($conn);
    
    // Set default password
    $password = password_hash($data['password'] ?? 'password123', PASSWORD_DEFAULT);
    
    $sql = "INSERT INTO employees (employeeCode, firstName, lastName, email, phone, department, position, hireDate, role, status, username, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'ssssssssssss', 
        $employeeCode,
        $data['firstName'],
        $data['lastName'],
        $data['email'],
        $data['phone'] ?? '',
        $data['department'] ?? '',
        $data['position'] ?? '',
        $data['hireDate'] ?? date('Y-m-d'),
        $data['role'],
        $data['status'],
        $data['username'],
        $password
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'User added successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error adding user: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function editUser($conn, $data) {
    $userId = $data['user_id'];
    
    // Validate required fields
    $required = ['firstName', 'lastName', 'email', 'username', 'role', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return ['message' => ucfirst($field) . ' is required', 'type' => 'error'];
        }
    }
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        return ['message' => 'Invalid email format', 'type' => 'error'];
    }
    
    // Check for duplicate email (excluding current user)
    $checkSql = "SELECT id FROM employees WHERE email = ? AND id != ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'si', $data['email'], $userId);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) > 0) {
        return ['message' => 'Email already exists', 'type' => 'error'];
    }
    
    // Check for duplicate username (excluding current user)
    $checkUsernameSql = "SELECT id FROM employees WHERE username = ? AND id != ?";
    $checkUsernameStmt = mysqli_prepare($conn, $checkUsernameSql);
    mysqli_stmt_bind_param($checkUsernameStmt, 'si', $data['username'], $userId);
    mysqli_stmt_execute($checkUsernameStmt);
    $checkUsernameResult = mysqli_stmt_get_result($checkUsernameStmt);
    
    if (mysqli_num_rows($checkUsernameResult) > 0) {
        return ['message' => 'Username already exists', 'type' => 'error'];
    }
    
    $sql = "UPDATE employees SET firstName = ?, lastName = ?, email = ?, phone = ?, department = ?, position = ?, role = ?, status = ?, username = ?, updatedAt = NOW() WHERE id = ?";
    
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'sssssssssi',
        $data['firstName'],
        $data['lastName'],
        $data['email'],
        $data['phone'] ?? '',
        $data['department'] ?? '',
        $data['position'] ?? '',
        $data['role'],
        $data['status'],
        $data['username'],
        $userId
    );
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'User updated successfully', 'type' => 'success'];
    } else {
        return ['message' => 'Error updating user: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function deleteUser($conn, $userId) {
    // Check if user exists
    $checkSql = "SELECT firstName, lastName FROM employees WHERE id = ?";
    $checkStmt = mysqli_prepare($conn, $checkSql);
    mysqli_stmt_bind_param($checkStmt, 'i', $userId);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    
    if (mysqli_num_rows($checkResult) === 0) {
        return ['message' => 'User not found', 'type' => 'error'];
    }
    
    $user = mysqli_fetch_assoc($checkResult);
    $userName = $user['firstName'] . ' ' . $user['lastName'];
    
    // Delete related attendance records first
    $deleteAttendanceSql = "DELETE FROM attendance WHERE employee_id = ?";
    $deleteAttendanceStmt = mysqli_prepare($conn, $deleteAttendanceSql);
    mysqli_stmt_bind_param($deleteAttendanceStmt, 'i', $userId);
    mysqli_stmt_execute($deleteAttendanceStmt);
    
    // Delete user
    $deleteSql = "DELETE FROM employees WHERE id = ?";
    $deleteStmt = mysqli_prepare($conn, $deleteSql);
    mysqli_stmt_bind_param($deleteStmt, 'i', $userId);
    
    if (mysqli_stmt_execute($deleteStmt)) {
        return ['message' => $userName . ' has been successfully deleted from the system', 'type' => 'success'];
    } else {
        return ['message' => 'Error deleting user: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function resetUserPassword($conn, $userId) {
    $newPassword = 'password123';
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    $sql = "UPDATE employees SET password = ?, updatedAt = NOW() WHERE id = ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, 'si', $hashedPassword, $userId);
    
    if (mysqli_stmt_execute($stmt)) {
        return ['message' => 'Password reset successfully. New password: ' . $newPassword, 'type' => 'success'];
    } else {
        return ['message' => 'Error resetting password: ' . mysqli_error($conn), 'type' => 'error'];
    }
}

function generateEmployeeCode($conn) {
    $sql = "SELECT employeeCode FROM employees WHERE employeeCode LIKE 'usr_%' ORDER BY employeeCode DESC LIMIT 1";
    $result = mysqli_query($conn, $sql);
    
    if (mysqli_num_rows($result) > 0) {
        $row = mysqli_fetch_assoc($result);
        $lastCode = $row['employeeCode'];
        $number = intval(substr($lastCode, 4)) + 1;
    } else {
        $number = 1;
    }
    
    return 'usr_' . str_pad($number, 3, '0', STR_PAD_LEFT);
}

function getStatusIcon($status) {
    $icons = [
        'active' => '✅',
        'inactive' => '⏸️',
        'suspended' => '🚫'
    ];
    return $icons[$status] ?? '❓';
}

function getRoleIcon($role) {
    $icons = [
        'admin' => '👑',
        'manager' => '👔',
        'employee' => '👤'
    ];
    return $icons[$role] ?? '👤';
}

// Get user for editing if edit parameter is present
$editUser = null;
if (isset($_GET['edit'])) {
    $editId = intval($_GET['edit']);
    $editSql = "SELECT * FROM employees WHERE id = ?";
    $editStmt = mysqli_prepare($conn, $editSql);
    mysqli_stmt_bind_param($editStmt, 'i', $editId);
    mysqli_stmt_execute($editStmt);
    $editResult = mysqli_stmt_get_result($editStmt);
    
    if (mysqli_num_rows($editResult) > 0) {
        $editUser = mysqli_fetch_assoc($editResult);
    }
}

// Get user for viewing if view parameter is present
$viewUser = null;
if (isset($_GET['view'])) {
    $viewId = intval($_GET['view']);
    $viewSql = "SELECT * FROM employees WHERE id = ?";
    $viewStmt = mysqli_prepare($conn, $viewSql);
    mysqli_stmt_bind_param($viewStmt, 'i', $viewId);
    mysqli_stmt_execute($viewStmt);
    $viewResult = mysqli_stmt_get_result($viewStmt);
    
    if (mysqli_num_rows($viewResult) > 0) {
        $viewUser = mysqli_fetch_assoc($viewResult);
    }
}
?>

<!DOCTYPE html>
<html lang="en" data-theme="light" class="page-users">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - Bricks Attendance System</title>
    <meta name="description" content="Admin panel for managing user accounts, roles, and permissions">
    <meta name="author" content="Bricks Attendance System">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Skip Navigation Links -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#sidebar" class="skip-link">Skip to navigation</a>

    <!-- Mobile Hamburger Menu Button -->
    <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    </button>

    <!-- App Container -->
    <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-brand">
                    <div class="brand-icon">🧱</div>
                    <div class="brand-text">
                        <h2>Bricks</h2>
                        <span>Attendance System</span>
                    </div>
                </div>
                <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
                    <span class="toggle-icon">‹</span>
                </button>
            </div>

            <div class="sidebar-user">
                <div class="user-avatar">
                    <span id="user-avatar-text"><?php echo strtoupper(substr($_SESSION['fullName'], 0, 1)); ?></span>
                </div>
                <div class="user-info">
                    <div class="user-name" id="user-name"><?php echo htmlspecialchars($_SESSION['fullName']); ?></div>
                    <div class="user-role" id="user-role"><?php echo ucfirst($_SESSION['role']); ?></div>
                </div>
                <div class="theme-selector">
                    <button class="theme-option active" data-theme="light" title="Light Mode">
                        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                    <button class="theme-option" data-theme="dark" title="Dark Mode">
                        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <nav class="sidebar-nav">
                <ul class="nav-list">
                    <li class="nav-item">
                        <a href="dashboard.php" class="nav-link" data-page="dashboard" title="Overview and statistics">
                            <span class="nav-icon">📊</span>
                            <span class="nav-text">Dashboard</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="employees.php" class="nav-link" data-page="employees" title="Employee management">
                            <span class="nav-icon">👥</span>
                            <span class="nav-text">Employees</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="users.php" class="nav-link active" data-page="users" title="User management">
                            <span class="nav-icon">👤</span>
                            <span class="nav-text">Users</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="attendance.php" class="nav-link" data-page="attendance" title="Manage employee attendance">
                            <span class="nav-icon">🕘</span>
                            <span class="nav-text">Attendance</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="analytics.php" class="nav-link" data-page="analytics" title="Detailed attendance analytics">
                            <span class="nav-icon">📈</span>
                            <span class="nav-text">Analytics</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="payroll.php" class="nav-link" data-page="payroll" title="Payroll management">
                            <span class="nav-icon">💰</span>
                            <span class="nav-text">Payroll</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="settings.php" class="nav-link" data-page="settings" title="System settings">
                            <span class="nav-icon">🔧</span>
                            <span class="nav-text">Settings</span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                </ul>
            </nav>

            <!-- Quick Actions Section -->
            <div class="sidebar-quick-actions">
                <div class="quick-actions-header">
                    <h4>Quick Actions</h4>
                </div>
                <div class="quick-actions-grid" role="group" aria-label="Quick action buttons">
                    <button class="quick-action-btn" onclick="openModal()" title="Add User (Alt+U)" aria-label="Add new user">
                        <span class="quick-action-icon">👤</span>
                        <span class="quick-action-text">Add User</span>
                    </button>
                    <button class="quick-action-btn" onclick="exportData()" title="Export Data (Alt+X)" aria-label="Export user data">
                        <span class="quick-action-icon">📤</span>
                        <span class="quick-action-text">Export</span>
                    </button>
                    <button class="quick-action-btn" onclick="location.href='employees.php'" title="Employees (Alt+E)" aria-label="Go to employees">
                        <span class="quick-action-icon">👥</span>
                        <span class="quick-action-text">Employees</span>
                    </button>
                </div>
            </div>

            <!-- Logout Section -->
            <div class="sidebar-logout">
                <a href="logout.php" class="logout-btn" title="Sign out (Alt+L)" aria-label="Sign out">
                    <span class="logout-icon">🚪</span>
                    <span class="logout-text">Logout</span>
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content" id="main-content">
            <!-- Header -->
            <header class="page-header">
                <div class="header-top">
                    <div class="header-title">
                        <h1>User Management</h1>
                        <p>Manage user accounts, roles, and permissions</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-outline" onclick="exportData()" title="Export user data">
                            <span class="btn-icon">📥</span>
                            <span class="btn-text">Export</span>
                        </button>
                        <button class="btn btn-secondary" onclick="location.reload()" title="Refresh data">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Refresh</span>
                        </button>
                        <button class="btn btn-primary" onclick="openModal()">
                            <span class="btn-icon">👤➕</span>
                            <span class="btn-text">Add User</span>
                        </button>
                    </div>
                </div>
                
                <!-- Filters and Search -->
                <form method="GET" class="header-filters">
                    <div class="filter-group">
                        <label for="role" class="filter-label">Role:</label>
                        <select name="role" id="role" class="filter-select" onchange="this.form.submit()">
                            <option value="">All Roles</option>
                            <?php foreach ($roles as $role): ?>
                                <option value="<?php echo htmlspecialchars($role); ?>" <?php echo $roleFilter === $role ? 'selected' : ''; ?>>
                                    <?php echo ucfirst($role); ?>
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
                        <label for="search" class="filter-label">Search:</label>
                        <input type="text" name="search" id="search" class="filter-input" placeholder="Search users..." value="<?php echo htmlspecialchars($searchFilter); ?>" onchange="this.form.submit()">
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
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div class="stat-card stat-active">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['active']; ?></div>
                            <div class="stat-label">Active</div>
                        </div>
                    </div>
                    <div class="stat-card stat-admins">
                        <div class="stat-icon">👑</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['admins']; ?></div>
                            <div class="stat-label">Administrators</div>
                        </div>
                    </div>
                    <div class="stat-card stat-managers">
                        <div class="stat-icon">👔</div>
                        <div class="stat-info">
                            <div class="stat-value"><?php echo $stats['managers']; ?></div>
                            <div class="stat-label">Managers</div>
                        </div>
                    </div>
                </div>

                <!-- Users Table -->
                <div class="card">
                    <div class="card-header">
                        <h3>User Directory</h3>
                    </div>
                    <div class="card-content">
                        <?php if (empty($users)): ?>
                            <div class="empty-state">
                                <div class="empty-icon">👤</div>
                                <h3>No users found</h3>
                                <p>No users match the selected filters. Try adjusting your search criteria.</p>
                                <button class="btn btn-primary" onclick="openModal()">
                                    <span class="btn-icon">👤➕</span>
                                    <span class="btn-text">Add First User</span>
                                </button>
                            </div>
                        <?php else: ?>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($users as $user): ?>
                                            <tr>
                                                <td>
                                                    <div class="user-info">
                                                        <div class="user-name"><?php echo htmlspecialchars($user['firstName'] . ' ' . $user['lastName']); ?></div>
                                                        <div class="user-code"><?php echo htmlspecialchars($user['employeeCode']); ?></div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="username"><?php echo htmlspecialchars($user['username']); ?></span>
                                                </td>
                                                <td>
                                                    <span class="role-badge role-<?php echo $user['role']; ?>">
                                                        <?php echo getRoleIcon($user['role']); ?> <?php echo ucfirst($user['role']); ?>
                                                    </span>
                                                </td>
                                                <td><?php echo htmlspecialchars($user['email']); ?></td>
                                                <td>
                                                    <span class="status-badge status-<?php echo $user['status']; ?>">
                                                        <?php echo getStatusIcon($user['status']); ?> <?php echo ucfirst($user['status']); ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn btn-sm btn-outline" onclick="openModal(<?php echo $user['id']; ?>)" title="Edit User">
                                                            <span class="btn-icon">✏️</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline" onclick="viewUser(<?php echo $user['id']; ?>)" title="View Details">
                                                            <span class="btn-icon">👁️</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-secondary" onclick="resetPassword(<?php echo $user['id']; ?>, '<?php echo htmlspecialchars($user['firstName'] . ' ' . $user['lastName']); ?>')" title="Reset Password">
                                                            <span class="btn-icon">🔑</span>
                                                        </button>
                                                        <button class="btn btn-sm btn-danger" onclick="deleteUser(<?php echo $user['id']; ?>, '<?php echo htmlspecialchars($user['firstName'] . ' ' . $user['lastName']); ?>')" title="Delete User">
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
        </main>
    </div>

    <!-- User Modal -->
    <div class="modal-overlay hidden" id="userModal">
        <div class="modal large">
            <div class="modal-header">
                <h3 id="modalTitle">Add User</h3>
                <button class="modal-close" onclick="closeModal()" aria-label="Close modal">
                    <span>&times;</span>
                </button>
            </div>
            <div class="modal-content">
                <form id="userForm" method="POST" class="form">
                    <input type="hidden" name="action" id="formAction" value="add">
                    <input type="hidden" name="user_id" id="userId">
                    
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

                    <!-- Account Information -->
                    <div class="form-section">
                        <h4>Account Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="username" class="form-label">Username *</label>
                                <input type="text" name="username" id="username" class="form-input" required>
                            </div>
                            <div class="form-group" id="passwordGroup">
                                <label for="password" class="form-label">Password *</label>
                                <input type="password" name="password" id="password" class="form-input">
                                <small class="form-help">Leave blank to keep current password (edit mode)</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="roleSelect" class="form-label">System Role *</label>
                                <select name="role" id="roleSelect" class="form-input" required>
                                    <option value="">Select Role</option>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="statusSelect" class="form-label">Status *</label>
                                <select name="status" id="statusSelect" class="form-input" required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Additional Information -->
                    <div class="form-section">
                        <h4>Additional Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="department" class="form-label">Department</label>
                                <select name="department" id="departmentSelect" class="form-input">
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
                                <label for="position" class="form-label">Position/Title</label>
                                <input type="text" name="position" id="position" class="form-input">
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span class="btn-text">Save User</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- View User Modal -->
    <?php if ($viewUser): ?>
        <div class="modal-overlay active" id="viewUserModal">
            <div class="modal large">
                <div class="modal-header">
                    <h3>User Details</h3>
                    <button class="modal-close" onclick="closeViewModal()" aria-label="Close modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="user-details">
                        <!-- Personal Information -->
                        <div class="detail-section">
                            <h4>Personal Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Full Name</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['firstName'] . ' ' . $viewUser['lastName']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">User ID</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['employeeCode']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Email Address</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['email']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Phone Number</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['phone'] ?: 'N/A'); ?></div>
                                </div>
                            </div>
                        </div>

                        <!-- Account Information -->
                        <div class="detail-section">
                            <h4>Account Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Username</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['username']); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">System Role</label>
                                    <div class="detail-value">
                                        <span class="role-badge role-<?php echo $viewUser['role']; ?>">
                                            <?php echo getRoleIcon($viewUser['role']); ?> <?php echo ucfirst($viewUser['role']); ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Status</label>
                                    <div class="detail-value">
                                        <span class="status-badge status-<?php echo $viewUser['status']; ?>">
                                            <?php echo getStatusIcon($viewUser['status']); ?> <?php echo ucfirst($viewUser['status']); ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Created</label>
                                    <div class="detail-value"><?php echo $viewUser['createdAt'] ? date('F j, Y', strtotime($viewUser['createdAt'])) : 'N/A'; ?></div>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Information -->
                        <div class="detail-section">
                            <h4>Additional Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label class="detail-label">Department</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['department'] ?: 'N/A'); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Position</label>
                                    <div class="detail-value"><?php echo htmlspecialchars($viewUser['position'] ?: 'N/A'); ?></div>
                                </div>
                                <div class="detail-item">
                                    <label class="detail-label">Last Updated</label>
                                    <div class="detail-value"><?php echo $viewUser['updatedAt'] ? date('F j, Y', strtotime($viewUser['updatedAt'])) : 'Never'; ?></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" onclick="closeViewModal()">
                            <span class="btn-text">Close</span>
                        </button>
                        <button type="button" class="btn btn-primary" onclick="editFromView(<?php echo $viewUser['id']; ?>)">
                            <span class="btn-icon">✏️</span>
                            <span class="btn-text">Edit User</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <!-- Scripts -->
    <script src="js/theme.js"></script>
    <script>
        // Modal functions
        function openModal(userId = null) {
            const modal = document.getElementById('userModal');
            const form = document.getElementById('userForm');
            const title = document.getElementById('modalTitle');
            const formAction = document.getElementById('formAction');
            const userIdField = document.getElementById('userId');
            const passwordGroup = document.getElementById('passwordGroup');
            
            if (userId) {
                // Edit mode
                title.textContent = 'Edit User';
                formAction.value = 'edit';
                userIdField.value = userId;
                passwordGroup.style.display = 'none';
                
                // Load user data via AJAX or redirect
                window.location.href = `users.php?edit=${userId}`;
                return;
            } else {
                // Add mode
                title.textContent = 'Add User';
                formAction.value = 'add';
                userIdField.value = '';
                passwordGroup.style.display = 'block';
                form.reset();
                
                // Set default values
                document.getElementById('statusSelect').value = 'active';
                document.getElementById('roleSelect').value = 'employee';
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeModal() {
            const modal = document.getElementById('userModal');
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        function viewUser(userId) {
            window.location.href = `users.php?view=${userId}`;
        }
        
        function closeViewModal() {
            window.location.href = 'users.php';
        }
        
        function editFromView(userId) {
            window.location.href = `users.php?edit=${userId}`;
        }
        
        function deleteUser(userId, userName) {
            if (confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="user_id" value="${userId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }
        
        function resetPassword(userId, userName) {
            if (confirm(`Are you sure you want to reset the password for ${userName}?`)) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="reset_password">
                    <input type="hidden" name="user_id" value="${userId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }
        
        function exportData() {
            // Create CSV content
            const users = <?php echo json_encode($users); ?>;
            const headers = ['User ID', 'First Name', 'Last Name', 'Username', 'Email', 'Phone', 'Role', 'Status', 'Department', 'Position'];
            
            let csvContent = headers.join(',') + '\n';
            
            users.forEach(user => {
                const row = [
                    user.employeeCode,
                    user.firstName,
                    user.lastName,
                    user.username,
                    user.email,
                    user.phone || '',
                    user.role,
                    user.status,
                    user.department || '',
                    user.position || ''
                ].map(field => `"${field}"`);
                
                csvContent += row.join(',') + '\n';
            });
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        // Auto-open modal if edit parameter is present
        <?php if ($editUser): ?>
            document.addEventListener('DOMContentLoaded', function() {
                openEditModal(<?php echo json_encode($editUser); ?>);
            });
            
            function openEditModal(user) {
                const modal = document.getElementById('userModal');
                const title = document.getElementById('modalTitle');
                const formAction = document.getElementById('formAction');
                const userIdField = document.getElementById('userId');
                const passwordGroup = document.getElementById('passwordGroup');
                
                title.textContent = 'Edit User';
                formAction.value = 'edit';
                userIdField.value = user.id;
                passwordGroup.style.display = 'none';
                
                // Populate form fields
                document.getElementById('firstName').value = user.firstName;
                document.getElementById('lastName').value = user.lastName;
                document.getElementById('email').value = user.email;
                document.getElementById('phone').value = user.phone || '';
                document.getElementById('username').value = user.username;
                document.getElementById('roleSelect').value = user.role;
                document.getElementById('statusSelect').value = user.status;
                document.getElementById('departmentSelect').value = user.department || '';
                document.getElementById('position').value = user.position || '';
                
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
        
        // Sidebar toggle functionality
        document.getElementById('sidebar-toggle')?.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });
        
        document.getElementById('mobile-menu-toggle')?.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('mobile-open');
        });
        
        // Auto-generate username from first and last name
        document.getElementById('firstName')?.addEventListener('input', generateUsername);
        document.getElementById('lastName')?.addEventListener('input', generateUsername);
        
        function generateUsername() {
            const firstName = document.getElementById('firstName').value.toLowerCase();
            const lastName = document.getElementById('lastName').value.toLowerCase();
            const usernameField = document.getElementById('username');
            
            if (firstName && lastName && !usernameField.value) {
                usernameField.value = firstName + '.' + lastName;
            }
        }
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
        .stat-admins { border-left: 4px solid #8b5cf6; }
        .stat-managers { border-left: 4px solid #f59e0b; }

        /* Role Badge */
        .role-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: capitalize;
        }

        .role-badge.role-admin {
            background: #f3e8ff;
            color: #7c3aed;
            border: 1px solid #c4b5fd;
        }

        .role-badge.role-manager {
            background: #fef3c7;
            color: #d97706;
            border: 1px solid #fde68a;
        }

        .role-badge.role-employee {
            background: #dbeafe;
            color: #2563eb;
            border: 1px solid #bfdbfe;
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

        /* User Info in Table */
        .user-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .user-name {
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .user-code {
            font-family: 'Courier New', monospace;
            background: var(--bg-tertiary, #f3f4f6);
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.75rem;
            display: inline-block;
            font-weight: 500;
        }

        .username {
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: var(--text-primary, #111827);
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

        .form-help {
            font-size: 0.75rem;
            color: var(--text-tertiary, #9ca3af);
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
</body>
</html>