<?php
require_once 'auth.php';
require_once 'db.php';

// Check if user is admin
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header('Location: dashboard.php');
    exit();
}

$success_message = '';
$error_message = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'save_general':
            $company_name = trim($_POST['company_name'] ?? '');
            $address = trim($_POST['address'] ?? '');
            $phone = trim($_POST['phone'] ?? '');
            $timezone = $_POST['timezone'] ?? 'Asia/Manila';
            $date_format = $_POST['date_format'] ?? 'MM/DD/YYYY';
            $time_format = $_POST['time_format'] ?? '12';
            $currency = $_POST['currency'] ?? 'PHP';
            
            if (empty($company_name)) {
                $error_message = 'Company name is required.';
            } else {
                $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
                
                $settings = [
                    'company_name' => $company_name,
                    'company_address' => $address,
                    'company_phone' => $phone,
                    'timezone' => $timezone,
                    'date_format' => $date_format,
                    'time_format' => $time_format,
                    'currency' => $currency
                ];
                
                foreach ($settings as $key => $value) {
                    mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                    mysqli_stmt_execute($stmt);
                }
                
                mysqli_stmt_close($stmt);
                $success_message = 'General settings saved successfully.';
            }
            break;
            
        case 'save_payroll':
            $pay_period = $_POST['pay_period'] ?? 'biweekly';
            $payday = $_POST['payday'] ?? 'friday';
            $start_date = $_POST['start_date'] ?? '';
            $overtime_rate = floatval($_POST['overtime_rate'] ?? 1.5);
            $overtime_threshold = intval($_POST['overtime_threshold'] ?? 40);
            $rounding_rules = $_POST['rounding_rules'] ?? 'nearest_quarter';
            $auto_calculate = isset($_POST['auto_calculate']) ? 1 : 0;
            $auto_approve_regular = isset($_POST['auto_approve_regular']) ? 1 : 0;
            $require_overtime_approval = isset($_POST['require_overtime_approval']) ? 1 : 0;
            $cutoff_time = $_POST['cutoff_time'] ?? '17:00';
            
            if ($overtime_rate < 1 || $overtime_rate > 3) {
                $error_message = 'Overtime rate must be between 1.0 and 3.0.';
            } elseif ($overtime_threshold < 30 || $overtime_threshold > 60) {
                $error_message = 'Overtime threshold must be between 30 and 60 hours.';
            } else {
                $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
                
                $settings = [
                    'pay_period' => $pay_period,
                    'payday' => $payday,
                    'pay_start_date' => $start_date,
                    'overtime_rate' => $overtime_rate,
                    'overtime_threshold' => $overtime_threshold,
                    'rounding_rules' => $rounding_rules,
                    'auto_calculate' => $auto_calculate,
                    'auto_approve_regular' => $auto_approve_regular,
                    'require_overtime_approval' => $require_overtime_approval,
                    'cutoff_time' => $cutoff_time
                ];
                
                foreach ($settings as $key => $value) {
                    mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                    mysqli_stmt_execute($stmt);
                }
                
                mysqli_stmt_close($stmt);
                $success_message = 'Payroll settings saved successfully.';
            }
            break;
            
        case 'save_attendance':
            $clock_in_grace = intval($_POST['clock_in_grace'] ?? 5);
            $clock_out_grace = intval($_POST['clock_out_grace'] ?? 5);
            $require_location = isset($_POST['require_location']) ? 1 : 0;
            $lunch_break_duration = intval($_POST['lunch_break_duration'] ?? 30);
            $short_break_duration = intval($_POST['short_break_duration'] ?? 15);
            $auto_deduct_lunch = isset($_POST['auto_deduct_lunch']) ? 1 : 0;
            $auto_clock_out = isset($_POST['auto_clock_out']) ? 1 : 0;
            $auto_clock_out_time = $_POST['auto_clock_out_time'] ?? '18:00';
            $require_notes = isset($_POST['require_notes']) ? 1 : 0;
            $tardy_threshold = intval($_POST['tardy_threshold'] ?? 10);
            $absence_threshold = intval($_POST['absence_threshold'] ?? 4);
            $send_tardy_alerts = isset($_POST['send_tardy_alerts']) ? 1 : 0;
            
            $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
            
            $settings = [
                'clock_in_grace' => $clock_in_grace,
                'clock_out_grace' => $clock_out_grace,
                'require_location' => $require_location,
                'lunch_break_duration' => $lunch_break_duration,
                'short_break_duration' => $short_break_duration,
                'auto_deduct_lunch' => $auto_deduct_lunch,
                'auto_clock_out' => $auto_clock_out,
                'auto_clock_out_time' => $auto_clock_out_time,
                'require_notes' => $require_notes,
                'tardy_threshold' => $tardy_threshold,
                'absence_threshold' => $absence_threshold,
                'send_tardy_alerts' => $send_tardy_alerts
            ];
            
            foreach ($settings as $key => $value) {
                mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                mysqli_stmt_execute($stmt);
            }
            
            mysqli_stmt_close($stmt);
            $success_message = 'Attendance settings saved successfully.';
            break;
            
        case 'save_notifications':
            $email_notifications = isset($_POST['email_notifications']) ? 1 : 0;
            $smtp_server = trim($_POST['smtp_server'] ?? '');
            $smtp_port = intval($_POST['smtp_port'] ?? 587);
            $from_email = trim($_POST['from_email'] ?? '');
            $tardy_alerts = isset($_POST['tardy_alerts']) ? 1 : 0;
            $overtime_alerts = isset($_POST['overtime_alerts']) ? 1 : 0;
            $payroll_reminders = isset($_POST['payroll_reminders']) ? 1 : 0;
            $system_updates = isset($_POST['system_updates']) ? 1 : 0;
            $absence_alerts = isset($_POST['absence_alerts']) ? 1 : 0;
            
            $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
            
            $settings = [
                'email_notifications' => $email_notifications,
                'smtp_server' => $smtp_server,
                'smtp_port' => $smtp_port,
                'from_email' => $from_email,
                'tardy_alerts' => $tardy_alerts,
                'overtime_alerts' => $overtime_alerts,
                'payroll_reminders' => $payroll_reminders,
                'system_updates' => $system_updates,
                'absence_alerts' => $absence_alerts
            ];
            
            foreach ($settings as $key => $value) {
                mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                mysqli_stmt_execute($stmt);
            }
            
            mysqli_stmt_close($stmt);
            $success_message = 'Notification settings saved successfully.';
            break;
            
        case 'save_security':
            $session_timeout = intval($_POST['session_timeout'] ?? 480);
            $allow_remember_me = isset($_POST['allow_remember_me']) ? 1 : 0;
            $max_login_attempts = intval($_POST['max_login_attempts'] ?? 5);
            $password_min_length = intval($_POST['password_min_length'] ?? 6);
            $require_uppercase = isset($_POST['require_uppercase']) ? 1 : 0;
            $require_numbers = isset($_POST['require_numbers']) ? 1 : 0;
            $require_special = isset($_POST['require_special']) ? 1 : 0;
            $require_password_change = isset($_POST['require_password_change']) ? 1 : 0;
            $password_change_interval = intval($_POST['password_change_interval'] ?? 90);
            $two_factor_auth = isset($_POST['two_factor_auth']) ? 1 : 0;
            $require_2fa_admin = isset($_POST['require_2fa_admin']) ? 1 : 0;
            $two_factor_method = $_POST['two_factor_method'] ?? 'email';
            $auto_backup = isset($_POST['auto_backup']) ? 1 : 0;
            $backup_frequency = $_POST['backup_frequency'] ?? 'daily';
            
            if ($session_timeout < 30 || $session_timeout > 1440) {
                $error_message = 'Session timeout must be between 30 and 1440 minutes.';
            } elseif ($password_min_length < 4 || $password_min_length > 20) {
                $error_message = 'Password minimum length must be between 4 and 20 characters.';
            } else {
                $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
                
                $settings = [
                    'session_timeout' => $session_timeout,
                    'allow_remember_me' => $allow_remember_me,
                    'max_login_attempts' => $max_login_attempts,
                    'password_min_length' => $password_min_length,
                    'require_uppercase' => $require_uppercase,
                    'require_numbers' => $require_numbers,
                    'require_special' => $require_special,
                    'require_password_change' => $require_password_change,
                    'password_change_interval' => $password_change_interval,
                    'two_factor_auth' => $two_factor_auth,
                    'require_2fa_admin' => $require_2fa_admin,
                    'two_factor_method' => $two_factor_method,
                    'auto_backup' => $auto_backup,
                    'backup_frequency' => $backup_frequency
                ];
                
                foreach ($settings as $key => $value) {
                    mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                    mysqli_stmt_execute($stmt);
                }
                
                mysqli_stmt_close($stmt);
                $success_message = 'Security settings saved successfully.';
            }
            break;
            
        case 'save_theme':
            $default_theme = $_POST['default_theme'] ?? 'light';
            $allow_user_themes = isset($_POST['allow_user_themes']) ? 1 : 0;
            $high_contrast = isset($_POST['high_contrast']) ? 1 : 0;
            $accent_color = $_POST['accent_color'] ?? '#ff9500';
            $secondary_color = $_POST['secondary_color'] ?? '#007aff';
            $success_color = $_POST['success_color'] ?? '#34c759';
            $warning_color = $_POST['warning_color'] ?? '#ff9500';
            $danger_color = $_POST['danger_color'] ?? '#ff3b30';
            
            $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
            
            $settings = [
                'default_theme' => $default_theme,
                'allow_user_themes' => $allow_user_themes,
                'high_contrast' => $high_contrast,
                'accent_color' => $accent_color,
                'secondary_color' => $secondary_color,
                'success_color' => $success_color,
                'warning_color' => $warning_color,
                'danger_color' => $danger_color
            ];
            
            foreach ($settings as $key => $value) {
                mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                mysqli_stmt_execute($stmt);
            }
            
            mysqli_stmt_close($stmt);
            $success_message = 'Theme settings saved successfully.';
            break;
            
        case 'save_users':
            $default_role = $_POST['default_role'] ?? 'employee';
            $default_hourly_rate = floatval($_POST['default_hourly_rate'] ?? 15.00);
            $require_email_verification = isset($_POST['require_email_verification']) ? 1 : 0;
            $auto_generate_passwords = isset($_POST['auto_generate_passwords']) ? 1 : 0;
            $lockout_attempts = intval($_POST['lockout_attempts'] ?? 5);
            $lockout_duration = intval($_POST['lockout_duration'] ?? 30);
            $auto_deactivate_inactive = isset($_POST['auto_deactivate_inactive']) ? 1 : 0;
            $inactive_threshold = intval($_POST['inactive_threshold'] ?? 90);
            
            $stmt = mysqli_prepare($conn, "UPDATE settings SET setting_value = ? WHERE setting_key = ?");
            
            $settings = [
                'default_role' => $default_role,
                'default_hourly_rate' => $default_hourly_rate,
                'require_email_verification' => $require_email_verification,
                'auto_generate_passwords' => $auto_generate_passwords,
                'lockout_attempts' => $lockout_attempts,
                'lockout_duration' => $lockout_duration,
                'auto_deactivate_inactive' => $auto_deactivate_inactive,
                'inactive_threshold' => $inactive_threshold
            ];
            
            foreach ($settings as $key => $value) {
                mysqli_stmt_bind_param($stmt, "ss", $value, $key);
                mysqli_stmt_execute($stmt);
            }
            
            mysqli_stmt_close($stmt);
            $success_message = 'User settings saved successfully.';
            break;
    }
}

// Fetch current settings
$settings = [];
$result = mysqli_query($conn, "SELECT setting_key, setting_value FROM settings");
while ($row = mysqli_fetch_assoc($result)) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

// Set default values if not found
$defaults = [
    'company_name' => 'Bricks Company',
    'company_address' => '',
    'company_phone' => '',
    'timezone' => 'Asia/Manila',
    'date_format' => 'MM/DD/YYYY',
    'time_format' => '12',
    'currency' => 'PHP',
    'pay_period' => 'biweekly',
    'payday' => 'friday',
    'pay_start_date' => '',
    'overtime_rate' => '1.5',
    'overtime_threshold' => '40',
    'rounding_rules' => 'nearest_quarter',
    'auto_calculate' => '1',
    'auto_approve_regular' => '0',
    'require_overtime_approval' => '1',
    'cutoff_time' => '17:00',
    'clock_in_grace' => '5',
    'clock_out_grace' => '5',
    'require_location' => '0',
    'lunch_break_duration' => '30',
    'short_break_duration' => '15',
    'auto_deduct_lunch' => '1',
    'auto_clock_out' => '0',
    'auto_clock_out_time' => '18:00',
    'require_notes' => '0',
    'tardy_threshold' => '10',
    'absence_threshold' => '4',
    'send_tardy_alerts' => '1',
    'email_notifications' => '1',
    'smtp_server' => '',
    'smtp_port' => '587',
    'from_email' => '',
    'tardy_alerts' => '1',
    'overtime_alerts' => '1',
    'payroll_reminders' => '1',
    'system_updates' => '0',
    'absence_alerts' => '1',
    'session_timeout' => '480',
    'allow_remember_me' => '1',
    'max_login_attempts' => '5',
    'password_min_length' => '6',
    'require_uppercase' => '0',
    'require_numbers' => '0',
    'require_special' => '0',
    'require_password_change' => '0',
    'password_change_interval' => '90',
    'two_factor_auth' => '0',
    'require_2fa_admin' => '0',
    'two_factor_method' => 'email',
    'auto_backup' => '1',
    'backup_frequency' => 'daily',
    'default_theme' => 'light',
    'allow_user_themes' => '1',
    'high_contrast' => '0',
    'accent_color' => '#ff9500',
    'secondary_color' => '#007aff',
    'success_color' => '#34c759',
    'warning_color' => '#ff9500',
    'danger_color' => '#ff3b30',
    'default_role' => 'employee',
    'default_hourly_rate' => '15.00',
    'require_email_verification' => '0',
    'auto_generate_passwords' => '1',
    'lockout_attempts' => '5',
    'lockout_duration' => '30',
    'auto_deactivate_inactive' => '0',
    'inactive_threshold' => '90'
];

foreach ($defaults as $key => $value) {
    if (!isset($settings[$key])) {
        $settings[$key] = $value;
    }
}

// Get user statistics
$user_stats = [
    'total' => 0,
    'active' => 0,
    'inactive' => 0,
    'admins' => 0
];

$result = mysqli_query($conn, "SELECT COUNT(*) as total FROM employees");
$row = mysqli_fetch_assoc($result);
$user_stats['total'] = $row['total'];

$result = mysqli_query($conn, "SELECT COUNT(*) as active FROM employees WHERE status = 'active'");
$row = mysqli_fetch_assoc($result);
$user_stats['active'] = $row['active'];

$result = mysqli_query($conn, "SELECT COUNT(*) as inactive FROM employees WHERE status = 'inactive'");
$row = mysqli_fetch_assoc($result);
$user_stats['inactive'] = $row['inactive'];

$result = mysqli_query($conn, "SELECT COUNT(*) as admins FROM employees WHERE role = 'admin'");
$row = mysqli_fetch_assoc($result);
$user_stats['admins'] = $row['admins'];

include 'header.php';
?>

<!-- Page Header -->
<header class="page-header">
    <div class="header-content">
        <div class="header-title">
            <h1>Settings</h1>
            <p>Configure system preferences and manage user accounts</p>
        </div>
        <div class="header-actions">
            <button class="btn btn-outline" id="export-settings-btn" title="Export Settings" aria-label="Export system settings">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
            </button>
            <button class="btn btn-outline" id="import-settings-btn" title="Import Settings" aria-label="Import system settings">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17,8 12,3 7,8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Import
            </button>
        </div>
    </div>
</header>

<?php if ($success_message): ?>
    <div class="alert alert-success"><?php echo htmlspecialchars($success_message); ?></div>
<?php endif; ?>

<?php if ($error_message): ?>
    <div class="alert alert-danger"><?php echo htmlspecialchars($error_message); ?></div>
<?php endif; ?>

<!-- Settings Navigation Tabs -->
<nav class="settings-tabs">
    <button class="settings-tab active" data-tab="general">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 4l-1.5 1.5M5 20l1.5-1.5L5 17"></path>
        </svg>
        General
    </button>
    <button class="settings-tab" data-tab="payroll">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        Payroll
    </button>
    <button class="settings-tab" data-tab="attendance">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
        Attendance
    </button>
    <button class="settings-tab" data-tab="notifications">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        Notifications
    </button>
    <button class="settings-tab" data-tab="security">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        Security
    </button>
    <button class="settings-tab" data-tab="theme">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
        Theme
    </button>
    <button class="settings-tab" data-tab="users">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        Users
    </button>
</nav>

<!-- Settings Content -->
<div class="settings-container">
    <!-- General Settings -->
    <div class="settings-content active" id="general-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Company Information</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9,22 9,12 15,12 15,22"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_general">
                        <div class="form-group">
                            <label for="company-name" class="form-label">Company Name</label>
                            <input type="text" id="company-name" name="company_name" class="form-input" value="<?php echo htmlspecialchars($settings['company_name']); ?>" required>
                        </div>
                        <div class="form-group">
                            <label for="company-address" class="form-label">Address</label>
                            <textarea id="company-address" name="address" class="form-textarea" rows="3" placeholder="Enter company address"><?php echo htmlspecialchars($settings['company_address']); ?></textarea>
                        </div>
                        <div class="form-group">
                            <label for="company-phone" class="form-label">Phone Number</label>
                            <input type="tel" id="company-phone" name="phone" class="form-input" placeholder="(555) 123-4567" value="<?php echo htmlspecialchars($settings['company_phone']); ?>">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Company Info</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Regional Settings</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_general">
                        <div class="form-group">
                            <label for="timezone" class="form-label">Timezone</label>
                            <select id="timezone" name="timezone" class="form-select">
                                <option value="Asia/Manila" <?php echo $settings['timezone'] === 'Asia/Manila' ? 'selected' : ''; ?>>Asia/Manila (Philippine Time)</option>
                                <option value="America/New_York" <?php echo $settings['timezone'] === 'America/New_York' ? 'selected' : ''; ?>>Eastern Time (ET)</option>
                                <option value="America/Chicago" <?php echo $settings['timezone'] === 'America/Chicago' ? 'selected' : ''; ?>>Central Time (CT)</option>
                                <option value="America/Denver" <?php echo $settings['timezone'] === 'America/Denver' ? 'selected' : ''; ?>>Mountain Time (MT)</option>
                                <option value="America/Los_Angeles" <?php echo $settings['timezone'] === 'America/Los_Angeles' ? 'selected' : ''; ?>>Pacific Time (PT)</option>
                                <option value="America/Toronto" <?php echo $settings['timezone'] === 'America/Toronto' ? 'selected' : ''; ?>>Toronto</option>
                                <option value="Europe/London" <?php echo $settings['timezone'] === 'Europe/London' ? 'selected' : ''; ?>>London</option>
                                <option value="Europe/Paris" <?php echo $settings['timezone'] === 'Europe/Paris' ? 'selected' : ''; ?>>Paris</option>
                                <option value="Asia/Tokyo" <?php echo $settings['timezone'] === 'Asia/Tokyo' ? 'selected' : ''; ?>>Tokyo</option>
                                <option value="Asia/Singapore" <?php echo $settings['timezone'] === 'Asia/Singapore' ? 'selected' : ''; ?>>Singapore</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="date-format" class="form-label">Date Format</label>
                            <select id="date-format" name="date_format" class="form-select">
                                <option value="MM/DD/YYYY" <?php echo $settings['date_format'] === 'MM/DD/YYYY' ? 'selected' : ''; ?>>MM/DD/YYYY</option>
                                <option value="DD/MM/YYYY" <?php echo $settings['date_format'] === 'DD/MM/YYYY' ? 'selected' : ''; ?>>DD/MM/YYYY</option>
                                <option value="YYYY-MM-DD" <?php echo $settings['date_format'] === 'YYYY-MM-DD' ? 'selected' : ''; ?>>YYYY-MM-DD</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="time-format" class="form-label">Time Format</label>
                            <select id="time-format" name="time_format" class="form-select">
                                <option value="12" <?php echo $settings['time_format'] === '12' ? 'selected' : ''; ?>>12 Hour</option>
                                <option value="24" <?php echo $settings['time_format'] === '24' ? 'selected' : ''; ?>>24 Hour</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="currency" class="form-label">Currency</label>
                            <select id="currency" name="currency" class="form-select">
                                <option value="PHP" <?php echo $settings['currency'] === 'PHP' ? 'selected' : ''; ?>>PHP (₱)</option>
                                <option value="USD" <?php echo $settings['currency'] === 'USD' ? 'selected' : ''; ?>>USD ($)</option>
                                <option value="EUR" <?php echo $settings['currency'] === 'EUR' ? 'selected' : ''; ?>>EUR (€)</option>
                                <option value="GBP" <?php echo $settings['currency'] === 'GBP' ? 'selected' : ''; ?>>GBP (£)</option>
                                <option value="CAD" <?php echo $settings['currency'] === 'CAD' ? 'selected' : ''; ?>>CAD ($)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Regional Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Payroll Settings -->
    <div class="settings-content" id="payroll-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Pay Period Configuration</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_payroll">
                        <div class="form-group">
                            <label for="pay-period" class="form-label">Pay Period</label>
                            <select id="pay-period" name="pay_period" class="form-select">
                                <option value="weekly" <?php echo $settings['pay_period'] === 'weekly' ? 'selected' : ''; ?>>Weekly</option>
                                <option value="biweekly" <?php echo $settings['pay_period'] === 'biweekly' ? 'selected' : ''; ?>>Bi-weekly</option>
                                <option value="monthly" <?php echo $settings['pay_period'] === 'monthly' ? 'selected' : ''; ?>>Monthly</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="payday" class="form-label">Payday</label>
                            <select id="payday" name="payday" class="form-select">
                                <option value="monday" <?php echo $settings['payday'] === 'monday' ? 'selected' : ''; ?>>Monday</option>
                                <option value="tuesday" <?php echo $settings['payday'] === 'tuesday' ? 'selected' : ''; ?>>Tuesday</option>
                                <option value="wednesday" <?php echo $settings['payday'] === 'wednesday' ? 'selected' : ''; ?>>Wednesday</option>
                                <option value="thursday" <?php echo $settings['payday'] === 'thursday' ? 'selected' : ''; ?>>Thursday</option>
                                <option value="friday" <?php echo $settings['payday'] === 'friday' ? 'selected' : ''; ?>>Friday</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pay-start-date" class="form-label">Pay Period Start Date</label>
                            <input type="date" id="pay-start-date" name="start_date" class="form-input" value="<?php echo htmlspecialchars($settings['pay_start_date']); ?>">
                            <small class="form-help">First day of the current pay period cycle</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Pay Period</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Overtime Configuration</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_payroll">
                        <div class="form-group">
                            <label for="overtime-rate" class="form-label">Overtime Rate Multiplier</label>
                            <input type="number" id="overtime-rate" name="overtime_rate" class="form-input" value="<?php echo htmlspecialchars($settings['overtime_rate']); ?>" min="1" max="3" step="0.1" required>
                            <small class="form-help">Standard rate multiplier for overtime hours</small>
                        </div>
                        <div class="form-group">
                            <label for="overtime-threshold" class="form-label">Overtime Threshold (hours/week)</label>
                            <input type="number" id="overtime-threshold" name="overtime_threshold" class="form-input" value="<?php echo htmlspecialchars($settings['overtime_threshold']); ?>" min="30" max="60" required>
                            <small class="form-help">Hours per week before overtime applies</small>
                        </div>
                        <div class="form-group">
                            <label for="rounding-rules" class="form-label">Time Rounding Rules</label>
                            <select id="rounding-rules" name="rounding_rules" class="form-select">
                                <option value="none" <?php echo $settings['rounding_rules'] === 'none' ? 'selected' : ''; ?>>No Rounding</option>
                                <option value="nearest_minute" <?php echo $settings['rounding_rules'] === 'nearest_minute' ? 'selected' : ''; ?>>Nearest Minute</option>
                                <option value="nearest_quarter" <?php echo $settings['rounding_rules'] === 'nearest_quarter' ? 'selected' : ''; ?>>Nearest 15 Minutes</option>
                                <option value="nearest_half" <?php echo $settings['rounding_rules'] === 'nearest_half' ? 'selected' : ''; ?>>Nearest 30 Minutes</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Overtime Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile tile-large">
                <div class="tile-header">
                    <h3 class="tile-title">Payroll Automation</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_payroll">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-calculate" name="auto_calculate" <?php echo $settings['auto_calculate'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto-calculate payroll
                            </label>
                            <small class="form-help">Automatically calculate payroll at end of pay period</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-approve-regular" name="auto_approve_regular" <?php echo $settings['auto_approve_regular'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto-approve regular hours
                            </label>
                            <small class="form-help">Automatically approve regular time entries</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-overtime-approval" name="require_overtime_approval" <?php echo $settings['require_overtime_approval'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require overtime approval
                            </label>
                            <small class="form-help">Overtime hours must be approved before payroll</small>
                        </div>
                        <div class="form-group">
                            <label for="payroll-cutoff" class="form-label">Payroll Cutoff Time</label>
                            <input type="time" id="payroll-cutoff" name="cutoff_time" class="form-input" value="<?php echo htmlspecialchars($settings['cutoff_time']); ?>">
                            <small class="form-help">Time entries after this time go to next pay period</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Automation Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Attendance Settings -->
    <div class="settings-content" id="attendance-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Clock In/Out Settings</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_attendance">
                        <div class="form-group">
                            <label for="clock-in-grace" class="form-label">Clock In Grace Period (minutes)</label>
                            <input type="number" id="clock-in-grace" name="clock_in_grace" class="form-input" value="<?php echo htmlspecialchars($settings['clock_in_grace']); ?>" min="0" max="30">
                            <small class="form-help">Minutes after scheduled start time before marked as tardy</small>
                        </div>
                        <div class="form-group">
                            <label for="clock-out-grace" class="form-label">Clock Out Grace Period (minutes)</label>
                            <input type="number" id="clock-out-grace" name="clock_out_grace" class="form-input" value="<?php echo htmlspecialchars($settings['clock_out_grace']); ?>" min="0" max="30">
                            <small class="form-help">Minutes before scheduled end time allowed for early clock out</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-location" name="require_location" <?php echo $settings['require_location'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require location verification
                            </label>
                            <small class="form-help">Employees must be at approved locations to clock in/out</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Clock Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Break Settings</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_attendance">
                        <div class="form-group">
                            <label for="lunch-break-duration" class="form-label">Default Lunch Break (minutes)</label>
                            <input type="number" id="lunch-break-duration" name="lunch_break_duration" class="form-input" value="<?php echo htmlspecialchars($settings['lunch_break_duration']); ?>" min="15" max="120">
                        </div>
                        <div class="form-group">
                            <label for="short-break-duration" class="form-label">Short Break Duration (minutes)</label>
                            <input type="number" id="short-break-duration" name="short_break_duration" class="form-input" value="<?php echo htmlspecialchars($settings['short_break_duration']); ?>" min="5" max="30">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-deduct-lunch" name="auto_deduct_lunch" <?php echo $settings['auto_deduct_lunch'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto-deduct lunch break
                            </label>
                            <small class="form-help">Automatically deduct lunch time from total hours</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Break Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Automation Settings</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_attendance">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-clock-out" name="auto_clock_out" <?php echo $settings['auto_clock_out'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto clock out employees
                            </label>
                            <small class="form-help">Automatically clock out employees at specified time</small>
                        </div>
                        <div class="form-group">
                            <label for="auto-clock-out-time" class="form-label">Auto Clock Out Time</label>
                            <input type="time" id="auto-clock-out-time" name="auto_clock_out_time" class="form-input" value="<?php echo htmlspecialchars($settings['auto_clock_out_time']); ?>">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-notes" name="require_notes" <?php echo $settings['require_notes'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require notes for manual time adjustments
                            </label>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Automation Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Tardiness & Absence</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_attendance">
                        <div class="form-group">
                            <label for="tardy-threshold" class="form-label">Tardiness Threshold (minutes)</label>
                            <input type="number" id="tardy-threshold" name="tardy_threshold" class="form-input" value="<?php echo htmlspecialchars($settings['tardy_threshold']); ?>" min="1" max="60">
                            <small class="form-help">Minutes late before marked as tardy</small>
                        </div>
                        <div class="form-group">
                            <label for="absence-threshold" class="form-label">Absence Threshold (hours)</label>
                            <input type="number" id="absence-threshold" name="absence_threshold" class="form-input" value="<?php echo htmlspecialchars($settings['absence_threshold']); ?>" min="1" max="8">
                            <small class="form-help">Hours without clocking in before marked as absent</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="send-tardy-alerts" name="send_tardy_alerts" <?php echo $settings['send_tardy_alerts'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Send tardiness alerts
                            </label>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Tardiness Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Notifications Settings -->
    <div class="settings-content" id="notifications-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Email Notifications</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_notifications">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="email-notifications" name="email_notifications" <?php echo $settings['email_notifications'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Enable email notifications
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="smtp-server" class="form-label">SMTP Server</label>
                            <input type="text" id="smtp-server" name="smtp_server" class="form-input" placeholder="smtp.gmail.com" value="<?php echo htmlspecialchars($settings['smtp_server']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="smtp-port" class="form-label">SMTP Port</label>
                            <input type="number" id="smtp-port" name="smtp_port" class="form-input" value="<?php echo htmlspecialchars($settings['smtp_port']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="email-from" class="form-label">From Email</label>
                            <input type="email" id="email-from" name="from_email" class="form-input" placeholder="noreply@company.com" value="<?php echo htmlspecialchars($settings['from_email']); ?>">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Email Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Alert Types</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_notifications">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="tardy-alerts" name="tardy_alerts" <?php echo $settings['tardy_alerts'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Tardiness alerts
                            </label>
                            <small class="form-help">Notify when employees are late</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="overtime-alerts" name="overtime_alerts" <?php echo $settings['overtime_alerts'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Overtime alerts
                            </label>
                            <small class="form-help">Notify when employees approach overtime</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="payroll-reminders" name="payroll_reminders" <?php echo $settings['payroll_reminders'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Payroll reminders
                            </label>
                            <small class="form-help">Remind about upcoming payroll deadlines</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="system-updates" name="system_updates" <?php echo $settings['system_updates'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                System update notifications
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="absence-alerts" name="absence_alerts" <?php echo $settings['absence_alerts'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Absence alerts
                            </label>
                            <small class="form-help">Notify when employees don't clock in</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Alert Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Security Settings -->
    <div class="settings-content" id="security-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Session Management</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_security">
                        <div class="form-group">
                            <label for="session-timeout" class="form-label">Session Timeout (minutes)</label>
                            <input type="number" id="session-timeout" name="session_timeout" class="form-input" value="<?php echo htmlspecialchars($settings['session_timeout']); ?>" min="30" max="1440">
                            <small class="form-help">Automatically log out users after inactivity</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="remember-me" name="allow_remember_me" <?php echo $settings['allow_remember_me'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Allow "Remember Me" option
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="max-login-attempts" class="form-label">Max Login Attempts</label>
                            <input type="number" id="max-login-attempts" name="max_login_attempts" class="form-input" value="<?php echo htmlspecialchars($settings['max_login_attempts']); ?>" min="3" max="10">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Session Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Password Policy</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <circle cx="12" cy="16" r="1"></circle>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_security">
                        <div class="form-group">
                            <label for="password-min-length" class="form-label">Minimum Password Length</label>
                            <input type="number" id="password-min-length" name="password_min_length" class="form-input" value="<?php echo htmlspecialchars($settings['password_min_length']); ?>" min="4" max="20">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-uppercase" name="require_uppercase" <?php echo $settings['require_uppercase'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require uppercase letters
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-numbers" name="require_numbers" <?php echo $settings['require_numbers'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require numbers
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-special" name="require_special" <?php echo $settings['require_special'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require special characters
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-password-change" name="require_password_change" <?php echo $settings['require_password_change'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require periodic password changes
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="password-change-interval" class="form-label">Password Change Interval (days)</label>
                            <input type="number" id="password-change-interval" name="password_change_interval" class="form-input" value="<?php echo htmlspecialchars($settings['password_change_interval']); ?>" min="30" max="365">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Password Policy</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Two-Factor Authentication</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4"></path>
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                        <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
                        <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_security">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="two-factor-auth" name="two_factor_auth" <?php echo $settings['two_factor_auth'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Enable two-factor authentication
                            </label>
                            <small class="form-help">Require additional verification for login</small>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-2fa-admin" name="require_2fa_admin" <?php echo $settings['require_2fa_admin'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require 2FA for administrators
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="2fa-method" class="form-label">2FA Method</label>
                            <select id="2fa-method" name="two_factor_method" class="form-select">
                                <option value="email" <?php echo $settings['two_factor_method'] === 'email' ? 'selected' : ''; ?>>Email</option>
                                <option value="sms" <?php echo $settings['two_factor_method'] === 'sms' ? 'selected' : ''; ?>>SMS</option>
                                <option value="app" <?php echo $settings['two_factor_method'] === 'app' ? 'selected' : ''; ?>>Authenticator App</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save 2FA Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Data & Backup</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_security">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-backup" name="auto_backup" <?php echo $settings['auto_backup'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Enable automatic backups
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="backup-frequency" class="form-label">Backup Frequency</label>
                            <select id="backup-frequency" name="backup_frequency" class="form-select">
                                <option value="daily" <?php echo $settings['backup_frequency'] === 'daily' ? 'selected' : ''; ?>>Daily</option>
                                <option value="weekly" <?php echo $settings['backup_frequency'] === 'weekly' ? 'selected' : ''; ?>>Weekly</option>
                                <option value="monthly" <?php echo $settings['backup_frequency'] === 'monthly' ? 'selected' : ''; ?>>Monthly</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Backup Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Theme Settings -->
    <div class="settings-content" id="theme-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Default Theme</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_theme">
                        <div class="form-group">
                            <label for="default-theme" class="form-label">Default Theme</label>
                            <select id="default-theme" name="default_theme" class="form-select">
                                <option value="light" <?php echo $settings['default_theme'] === 'light' ? 'selected' : ''; ?>>Light</option>
                                <option value="dark" <?php echo $settings['default_theme'] === 'dark' ? 'selected' : ''; ?>>Dark</option>
                                <option value="auto" <?php echo $settings['default_theme'] === 'auto' ? 'selected' : ''; ?>>Auto (System)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="allow-user-themes" name="allow_user_themes" <?php echo $settings['allow_user_themes'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Allow users to change themes
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="high-contrast" name="high_contrast" <?php echo $settings['high_contrast'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                High contrast mode
                            </label>
                            <small class="form-help">Improve accessibility with higher contrast</small>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Theme Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Color Customization</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="13.5" cy="6.5" r=".5"></circle>
                        <circle cx="17.5" cy="10.5" r=".5"></circle>
                        <circle cx="8.5" cy="7.5" r=".5"></circle>
                        <circle cx="6.5" cy="12.5" r=".5"></circle>
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_theme">
                        <div class="form-group">
                            <label for="accent-color" class="form-label">Primary Accent Color</label>
                            <input type="color" id="accent-color" name="accent_color" class="form-input" value="<?php echo htmlspecialchars($settings['accent_color']); ?>">
                            <small class="form-help">Primary accent color for the interface</small>
                        </div>
                        <div class="form-group">
                            <label for="secondary-color" class="form-label">Secondary Color</label>
                            <input type="color" id="secondary-color" name="secondary_color" class="form-input" value="<?php echo htmlspecialchars($settings['secondary_color']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="success-color" class="form-label">Success Color</label>
                            <input type="color" id="success-color" name="success_color" class="form-input" value="<?php echo htmlspecialchars($settings['success_color']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="warning-color" class="form-label">Warning Color</label>
                            <input type="color" id="warning-color" name="warning_color" class="form-input" value="<?php echo htmlspecialchars($settings['warning_color']); ?>">
                        </div>
                        <div class="form-group">
                            <label for="danger-color" class="form-label">Danger Color</label>
                            <input type="color" id="danger-color" name="danger_color" class="form-input" value="<?php echo htmlspecialchars($settings['danger_color']); ?>">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Color Settings</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- User Management Settings -->
    <div class="settings-content" id="users-settings">
        <div class="tiles-grid grid-2">
            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">User Management</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <p>Manage employee accounts, roles, and permissions through the dedicated user management interface.</p>
                    
                    <div class="user-management-actions">
                        <a href="employees.php" class="btn btn-primary">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Manage Employees
                        </a>
                    </div>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">User Statistics</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                </div>
                <div class="tile-content">
                    <div id="user-stats" class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value"><?php echo $user_stats['total']; ?></div>
                            <div class="stat-label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?php echo $user_stats['active']; ?></div>
                            <div class="stat-label">Active Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?php echo $user_stats['inactive']; ?></div>
                            <div class="stat-label">Inactive Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?php echo $user_stats['admins']; ?></div>
                            <div class="stat-label">Administrators</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Default User Settings</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 4l-1.5 1.5M5 20l1.5-1.5L5 17"></path>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_users">
                        <div class="form-group">
                            <label for="default-role" class="form-label">Default Role for New Users</label>
                            <select id="default-role" name="default_role" class="form-select">
                                <option value="employee" <?php echo $settings['default_role'] === 'employee' ? 'selected' : ''; ?>>Employee</option>
                                <option value="admin" <?php echo $settings['default_role'] === 'admin' ? 'selected' : ''; ?>>Administrator</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="default-hourly-rate" class="form-label">Default Hourly Rate ($)</label>
                            <input type="number" id="default-hourly-rate" name="default_hourly_rate" class="form-input" value="<?php echo htmlspecialchars($settings['default_hourly_rate']); ?>" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require-email-verification" name="require_email_verification" <?php echo $settings['require_email_verification'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Require email verification for new accounts
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-generate-passwords" name="auto_generate_passwords" <?php echo $settings['auto_generate_passwords'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto-generate secure passwords
                            </label>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save User Settings</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="tile">
                <div class="tile-header">
                    <h3 class="tile-title">Account Policies</h3>
                    <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                </div>
                <div class="tile-content">
                    <form class="settings-form" method="POST">
                        <input type="hidden" name="action" value="save_users">
                        <div class="form-group">
                            <label for="account-lockout-attempts" class="form-label">Account Lockout After (failed attempts)</label>
                            <input type="number" id="account-lockout-attempts" name="lockout_attempts" class="form-input" value="<?php echo htmlspecialchars($settings['lockout_attempts']); ?>" min="3" max="10">
                        </div>
                        <div class="form-group">
                            <label for="account-lockout-duration" class="form-label">Lockout Duration (minutes)</label>
                            <input type="number" id="account-lockout-duration" name="lockout_duration" class="form-input" value="<?php echo htmlspecialchars($settings['lockout_duration']); ?>" min="5" max="1440">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="auto-deactivate-inactive" name="auto_deactivate_inactive" <?php echo $settings['auto_deactivate_inactive'] ? 'checked' : ''; ?>>
                                <span class="checkmark"></span>
                                Auto-deactivate inactive accounts
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="inactive-threshold" class="form-label">Inactive Threshold (days)</label>
                            <input type="number" id="inactive-threshold" name="inactive_threshold" class="form-input" value="<?php echo htmlspecialchars($settings['inactive_threshold']); ?>" min="30" max="365">
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Save Account Policies</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab + '-settings').classList.add('active');
        });
    });
    
    // Export/Import functionality (basic implementation)
    document.getElementById('export-settings-btn')?.addEventListener('click', function() {
        alert('Export functionality would be implemented here');
    });
    
    document.getElementById('import-settings-btn')?.addEventListener('click', function() {
        alert('Import functionality would be implemented here');
    });
});
</script>

<?php include 'footer.php'; ?>