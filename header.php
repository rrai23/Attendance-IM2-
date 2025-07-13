<?php
// Include authentication check
require_once 'auth.php';

// Get current page for active navigation highlighting
$current_page = basename($_SERVER['PHP_SELF'], '.php');

// Get user information from session
$user_name = $_SESSION['user_name'] ?? 'User';
$user_role = $_SESSION['role'] ?? 'employee';
$user_avatar = strtoupper(substr($user_name, 0, 1));

// Define role-based menu items
$admin_menu = [
    'dashboard' => ['icon' => '📊', 'title' => 'Dashboard', 'url' => 'dashboard.php'],
    'employees' => ['icon' => '👥', 'title' => 'Employees', 'url' => 'employees.php'],
    'attendance' => ['icon' => '🕐', 'title' => 'Attendance', 'url' => 'employee-management.php'],
    'analytics' => ['icon' => '📈', 'title' => 'Analytics', 'url' => 'analytics.php'],
    'payroll' => ['icon' => '💰', 'title' => 'Payroll', 'url' => 'payroll.php'],
    'settings' => ['icon' => '⚙️', 'title' => 'Settings', 'url' => 'settings.php']
];

$employee_menu = [
    'employee' => ['icon' => '👤', 'title' => 'My Profile', 'url' => 'employee.php?id=' . $_SESSION['user_id']]
];

// Select menu based on role
$menu_items = ($user_role === 'admin') ? $admin_menu : $employee_menu;

// Page titles
$page_titles = [
    'dashboard' => 'Dashboard - Bricks Attendance System',
    'employees' => 'Employee Management - Bricks Attendance System',
    'attendance' => 'Attendance Management - Bricks Attendance System',
    'analytics' => 'Analytics - Bricks Attendance System',
    'payroll' => 'Payroll Management - Bricks Attendance System',
    'settings' => 'Settings - Bricks Attendance System',
    'login' => 'Login - Bricks Attendance System'
];

$page_title = $page_titles[$current_page] ?? 'Bricks Attendance System';
?>
<!DOCTYPE html>
<html lang="en" data-theme="light" class="page-<?php echo htmlspecialchars($current_page); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($page_title); ?></title>
    <meta name="description" content="Bricks Attendance System - Employee attendance management and tracking">
    <meta name="author" content="Bricks Attendance System">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- Preload critical resources -->
    <link rel="preload" href="js/theme.js" as="script">
    <link rel="preload" href="js/sidebar.js" as="script">
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
                    <span id="user-avatar-text"><?php echo htmlspecialchars($user_avatar); ?></span>
                </div>
                <div class="user-info">
                    <div class="user-name" id="user-name"><?php echo htmlspecialchars($user_name); ?></div>
                    <div class="user-role" id="user-role"><?php echo htmlspecialchars(ucfirst($user_role)); ?></div>
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
                    <?php foreach ($menu_items as $page => $item): ?>
                    <li class="nav-item">
                        <a href="<?php echo htmlspecialchars($item['url']); ?>" 
                           class="nav-link <?php echo ($current_page === $page) ? 'active' : ''; ?>" 
                           data-page="<?php echo htmlspecialchars($page); ?>" 
                           title="<?php echo htmlspecialchars($item['title']); ?>">
                            <span class="nav-icon"><?php echo $item['icon']; ?></span>
                            <span class="nav-text"><?php echo htmlspecialchars($item['title']); ?></span>
                            <span class="nav-indicator"></span>
                        </a>
                    </li>
                    <?php endforeach; ?>
                    
                    <?php if ($user_role === 'admin'): ?>
                    <!-- Reports Dropdown for Admin -->
                    <li class="nav-item nav-item-dropdown" id="reportsDropdown">
                        <a href="#" class="nav-link nav-dropdown-toggle" 
                           title="Reports and documents"
                           role="button"
                           aria-haspopup="true"
                           aria-expanded="false"
                           tabindex="0">
                            <span class="nav-icon">📋</span>
                            <span class="nav-text">Reports</span>
                            <span class="nav-dropdown-arrow">▼</span>
                            <span class="nav-indicator"></span>
                        </a>
                        <ul class="nav-dropdown-menu">
                            <li><a href="reports/attendance.php" class="nav-dropdown-link">Attendance Reports</a></li>
                            <li><a href="reports/payroll.php" class="nav-dropdown-link">Payroll Reports</a></li>
                            <li><a href="reports/analytics.php" class="nav-dropdown-link">Analytics Reports</a></li>
                            <li><a href="reports/export.php" class="nav-dropdown-link">Export Data</a></li>
                        </ul>
                    </li>
                    
                    <!-- Tools Dropdown for Admin -->
                    <li class="nav-item nav-item-dropdown" id="toolsDropdown">
                        <a href="#" class="nav-link nav-dropdown-toggle" 
                           title="System tools"
                           role="button"
                           aria-haspopup="true"
                           aria-expanded="false"
                           tabindex="0">
                            <span class="nav-icon">🔧</span>
                            <span class="nav-text">Tools</span>
                            <span class="nav-dropdown-arrow">▼</span>
                            <span class="nav-indicator"></span>
                        </a>
                        <ul class="nav-dropdown-menu">
                            <li><a href="tools/backup.php" class="nav-dropdown-link">Backup & Restore</a></li>
                            <li><a href="tools/import.php" class="nav-dropdown-link">Import Data</a></li>
                            <li><a href="tools/logs.php" class="nav-dropdown-link">System Logs</a></li>
                            <li><a href="tools/maintenance.php" class="nav-dropdown-link">Maintenance</a></li>
                        </ul>
                    </li>
                    <?php endif; ?>
                </ul>
            </nav>

            <?php if ($user_role === 'admin'): ?>
            <!-- Quick Actions Section for Admin -->
            <div class="sidebar-quick-actions">
                <div class="quick-actions-header">
                    <h4>Quick Actions</h4>
                </div>
                <div class="quick-actions-grid" role="group" aria-label="Quick action buttons">
                    <button class="quick-action-btn" 
                            title="Clock In/Out (Alt+C)" 
                            id="quickClockBtn"
                            aria-label="Clock In or Clock Out"
                            data-shortcut="Alt+C">
                        <span class="quick-action-icon">🕐</span>
                        <span class="quick-action-text">Clock In/Out</span>
                    </button>
                    <button class="quick-action-btn" 
                            title="Add Employee (Alt+E)" 
                            id="quickAddEmployeeBtn"
                            aria-label="Add new employee"
                            data-shortcut="Alt+E">
                        <span class="quick-action-icon">👤</span>
                        <span class="quick-action-text">Add Employee</span>
                    </button>
                    <button class="quick-action-btn" 
                            title="Generate Report (Alt+R)" 
                            id="quickReportBtn"
                            aria-label="Generate attendance report"
                            data-shortcut="Alt+R">
                        <span class="quick-action-icon">📊</span>
                        <span class="quick-action-text">Report</span>
                    </button>
                    <button class="quick-action-btn" 
                            title="System Status (Alt+S)" 
                            id="quickStatusBtn"
                            aria-label="View system status"
                            data-shortcut="Alt+S">
                        <span class="quick-action-icon">❤️</span>
                        <span class="quick-action-text">Status</span>
                    </button>
                </div>
            </div>

            <!-- System Status Section for Admin -->
            <div class="sidebar-status">
                <div class="status-header">
                    <h4>System Status</h4>
                </div>
                <div class="status-indicators">
                    <div class="status-item">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Server Online</span>
                    </div>
                    <div class="status-item">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Database Connected</span>
                    </div>
                    <div class="status-item">
                        <span class="status-indicator status-online"></span>
                        <span class="status-text">Backup System</span>
                    </div>
                </div>
            </div>
            <?php else: ?>
            <!-- Quick Actions for Employee -->
            <div class="sidebar-quick-actions">
                <div class="quick-actions-header">
                    <h4>Quick Actions</h4>
                </div>
                <div class="quick-actions-grid" role="group" aria-label="Quick action buttons">
                    <button class="quick-action-btn" 
                            title="Clock In/Out (Alt+C)" 
                            id="quickClockBtn"
                            aria-label="Clock In or Clock Out"
                            data-shortcut="Alt+C">
                        <span class="quick-action-icon">🕐</span>
                        <span class="quick-action-text">Clock In/Out</span>
                    </button>
                    <button class="quick-action-btn" 
                            title="View My Attendance (Alt+A)" 
                            id="quickAttendanceBtn"
                            aria-label="View my attendance history"
                            data-shortcut="Alt+A">
                        <span class="quick-action-icon">📅</span>
                        <span class="quick-action-text">My Attendance</span>
                    </button>
                </div>
            </div>
            <?php endif; ?>

            <div class="sidebar-footer">
                <button class="logout-btn" id="logout-btn" title="Logout">
                    <span class="logout-icon">🚪</span>
                    <span class="logout-text">Logout</span>
                </button>
                <div class="sidebar-version">
                    <small>v1.0.0</small>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content" id="main-content">

    <!-- JavaScript for Theme and Sidebar -->
    <script>
        // Theme management
        document.addEventListener('DOMContentLoaded', function() {
            // Load saved theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            
            // Update theme selector
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.toggle('active', option.dataset.theme === savedTheme);
                
                option.addEventListener('click', function() {
                    const theme = this.dataset.theme;
                    document.documentElement.setAttribute('data-theme', theme);
                    localStorage.setItem('theme', theme);
                    
                    themeOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            // Mobile menu toggle
            const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
            const sidebar = document.getElementById('sidebar');
            
            if (mobileMenuToggle && sidebar) {
                mobileMenuToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('mobile-open');
                    const isOpen = sidebar.classList.contains('mobile-open');
                    this.setAttribute('aria-expanded', isOpen);
                });
            }

            // Sidebar toggle
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle && sidebar) {
                sidebarToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('collapsed');
                    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
                });
                
                // Load saved sidebar state
                const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                }
            }

            // Dropdown menus
            const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
            dropdownToggles.forEach(toggle => {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    const dropdown = this.parentElement;
                    const isOpen = dropdown.classList.contains('open');
                    
                    // Close all dropdowns
                    document.querySelectorAll('.nav-item-dropdown').forEach(item => {
                        item.classList.remove('open');
                        item.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', 'false');
                    });
                    
                    // Toggle current dropdown
                    if (!isOpen) {
                        dropdown.classList.add('open');
                        this.setAttribute('aria-expanded', 'true');
                    }
                });
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.nav-item-dropdown')) {
                    document.querySelectorAll('.nav-item-dropdown').forEach(item => {
                        item.classList.remove('open');
                        item.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', 'false');
                    });
                }
            });

            // Quick action buttons
            const quickClockBtn = document.getElementById('quickClockBtn');
            if (quickClockBtn) {
                quickClockBtn.addEventListener('click', function() {
                    // Handle clock in/out functionality
                    window.location.href = '<?php echo ($user_role === "admin") ? "/IM2/employee-management.php" : "/IM2/employee.php?id=" . $_SESSION["user_id"]; ?>';
                });
            }

            <?php if ($user_role === 'admin'): ?>
            const quickAddEmployeeBtn = document.getElementById('quickAddEmployeeBtn');
            if (quickAddEmployeeBtn) {
                quickAddEmployeeBtn.addEventListener('click', function() {
                    window.location.href = '/IM2/employees.php?action=add';
                });
            }

            const quickReportBtn = document.getElementById('quickReportBtn');
            if (quickReportBtn) {
                quickReportBtn.addEventListener('click', function() {
                    window.location.href = '/IM2/analytics.php';
                });
            }

            const quickStatusBtn = document.getElementById('quickStatusBtn');
            if (quickStatusBtn) {
                quickStatusBtn.addEventListener('click', function() {
                    window.location.href = '/IM2/settings.php';
                });
            }
            <?php else: ?>
            const quickAttendanceBtn = document.getElementById('quickAttendanceBtn');
            if (quickAttendanceBtn) {
                quickAttendanceBtn.addEventListener('click', function() {
                    window.location.href = '/IM2/employee.php?id=<?php echo $_SESSION["user_id"]; ?>';
                });
            }
            <?php endif; ?>

            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you want to logout?')) {
                        window.location.href = '/IM2/logout.php';
                    }
                });
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.altKey) {
                    switch(e.key.toLowerCase()) {
                        case 'c':
                            e.preventDefault();
                            document.getElementById('quickClockBtn')?.click();
                            break;
                        <?php if ($user_role === 'admin'): ?>
                        case 'e':
                            e.preventDefault();
                            document.getElementById('quickAddEmployeeBtn')?.click();
                            break;
                        case 'r':
                            e.preventDefault();
                            document.getElementById('quickReportBtn')?.click();
                            break;
                        case 's':
                            e.preventDefault();
                            document.getElementById('quickStatusBtn')?.click();
                            break;
                        <?php else: ?>
                        case 'a':
                            e.preventDefault();
                            document.getElementById('quickAttendanceBtn')?.click();
                            break;
                        <?php endif; ?>
                    }
                }
            });
        });
    </script>
