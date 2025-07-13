<?php
session_start();

// If user is already logged in, redirect to appropriate page
if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    $redirectUrl = ($_SESSION['role'] === 'admin') ? 'dashboard.php' : 'employee.php';
    header("Location: $redirectUrl");
    exit();
}

$error_message = '';
$success_message = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];
    $rememberMe = isset($_POST['rememberMe']);
    
    // Validate inputs
    if (empty($username)) {
        $error_message = 'Username is required';
    } elseif (empty($password)) {
        $error_message = 'Password is required';
    } elseif (strlen($username) < 3) {
        $error_message = 'Username must be at least 3 characters';
    } elseif (strlen($password) < 3) {
        $error_message = 'Password must be at least 3 characters';
    } else {
        // Include database connection
        include("db.php");
     // Prepare query to fetch user by username
$stmt = $conn->prepare("SELECT * FROM employees WHERE username = ?");
$stmt->bind_param("s", $username);
if ($stmt->execute()) {
    $result = $stmt->get_result();
    if ($user = $result->fetch_assoc()) {
        if ($password == $user["password"]) {
            // Password is correct, set session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['firstName'] = $user['firstName'];
            $_SESSION['login_time'] = time();

            $session_duration = $rememberMe ? (7 * 24 * 60 * 60) : (8 * 60 * 60);
            $_SESSION['expires'] = time() + $session_duration;

            if ($rememberMe) {
                setcookie('remember_user', $username, time() + (7 * 24 * 60 * 60), '/');
            }

            mysqli_stmt_close($stmt);
            mysqli_close($conn);

            // Redirect
            $redirectUrl = ($user['role'] === 'admin') ? 'dashboard.php' : 'employee.php';
            header("Location: $redirectUrl");
            exit();
        } else {
            $error_message = 'Invalid username or password';
        }
    } else {
        $error_message = 'Invalid username or password';
    }

    mysqli_stmt_close($stmt);
} else {
    $error_message = 'Database error occurred. Please try again.';
}

        
        mysqli_close($conn);
    }
}

// Get remembered username if cookie exists
$remembered_username = $_COOKIE['remember_user'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Bricks Attendance System</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="page-login">
    <!-- Login Container -->
    <div class="login-container">
        <div class="login-card animate-slide-up">
            <!-- Theme Toggle for Login Page -->
            <div class="login-theme-toggle">
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

            <!-- Branding -->
            <div class="login-brand">
                <h1>Bricks Attendance</h1>
                <p>Employee Management System</p>
            </div>

            <!-- Login Form -->
            <form class="login-form" action = "login.php" method="POST" novalidate>
                <div class="form-group">
                    <label for="username" class="form-label">Username</label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        class="form-input" 
                        placeholder="Enter your username"
                        value="<?php echo htmlspecialchars($remembered_username); ?>"
                        required
                        autocomplete="username"
                        autofocus
                    >
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">Password</label>
                    <div class="password-input-container">
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            class="form-input" 
                            placeholder="Enter your password"
                            required
                            autocomplete="current-password"
                        >
                        <button 
                            type="button" 
                            class="password-toggle" 
                            id="passwordToggle"
                            aria-label="Toggle password visibility"
                            title="Show/hide password"
                        >
                            <span class="password-toggle-icon">👁️</span>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label class="checkbox-container">
                        <input type="checkbox" id="rememberMe" name="rememberMe" <?php echo $remembered_username ? 'checked' : ''; ?>>
                        <span class="checkbox-checkmark"></span>
                        <span class="checkbox-label">Remember me</span>
                    </label>
                </div>

                <!-- Login Button -->
                <button type="submit" class="btn btn-primary btn-lg">
                    <span class="btn-text">Sign In</span>
                </button>

                <!-- Error/Success Alert -->
                <?php if ($error_message): ?>
                <div class="alert alert-danger" role="alert">
                    <span><?php echo htmlspecialchars($error_message); ?></span>
                </div>
                <?php endif; ?>

                <?php if ($success_message): ?>
                <div class="alert alert-success" role="alert">
                    <span><?php echo htmlspecialchars($success_message); ?></span>
                </div>
                <?php endif; ?>
            </form>

            <!-- Login Footer -->
            <div class="login-footer">
                <p>Demo Credentials:</p>
                <div class="demo-credentials">
                    <div class="demo-credential" onclick="fillCredentials('admin', 'admin')">
                        <strong>Admin:</strong> admin / admin
                    </div>
                    <div class="demo-credential" onclick="fillCredentials('employee', 'employee')">
                        <strong>Employee:</strong> employee / employee
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script>
        // Password toggle functionality
        document.getElementById('passwordToggle').addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('.password-toggle-icon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.textContent = '🙈';
                this.setAttribute('aria-label', 'Hide password');
            } else {
                passwordInput.type = 'password';
                icon.textContent = '👁️';
                this.setAttribute('aria-label', 'Show password');
            }
        });

        // Demo credentials functionality
        function fillCredentials(username, password) {
            document.getElementById('username').value = username;
            document.getElementById('password').value = password;
            document.getElementById('username').focus();
        }

        // Theme toggle functionality
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', function() {
                const theme = this.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('brix-theme', theme);
                
                // Update button states
                document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Apply saved theme
        const savedTheme = localStorage.getItem('brix-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.querySelector(`[data-theme="${savedTheme}"]`).classList.add('active');
        document.querySelectorAll('.theme-option').forEach(btn => {
            if (btn.getAttribute('data-theme') !== savedTheme) {
                btn.classList.remove('active');
            }
        });

        // Form validation
        document.querySelector('.login-form').addEventListener('submit', function(e) {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username) {
                e.preventDefault();
                alert('Username is required');
                document.getElementById('username').focus();
                return;
            }
            
            if (!password) {
                e.preventDefault();
                alert('Password is required');
                document.getElementById('password').focus();
                return;
            }
            
            if (username.length < 3) {
                e.preventDefault();
                alert('Username must be at least 3 characters');
                document.getElementById('username').focus();
                return;
            }
            
            if (password.length < 3) {
                e.preventDefault();
                alert('Password must be at least 3 characters');
                document.getElementById('password').focus();
                return;
            }
        });

        // Auto-hide alerts after 5 seconds
        setTimeout(function() {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.style.opacity = '0';
                setTimeout(() => alert.style.display = 'none', 300);
            });
        }, 5000);

        // Add CSS for password toggle and other elements
        const style = document.createElement('style');
        style.textContent = `
            .password-input-container {
                position: relative;
            }
            
            .password-toggle {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .password-toggle:hover {
                background-color: var(--bg-tertiary, #f5f5f5);
            }
            
            .password-toggle-icon {
                font-size: 16px;
                opacity: 0.6;
            }
            
            .checkbox-container {
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
            }
            
            .checkbox-container input[type="checkbox"] {
                display: none;
            }
            
            .checkbox-checkmark {
                width: 18px;
                height: 18px;
                border: 2px solid var(--border-color, #ddd);
                border-radius: 4px;
                margin-right: 8px;
                position: relative;
                transition: all 0.2s;
            }
            
            .checkbox-container input[type="checkbox"]:checked + .checkbox-checkmark {
                background-color: var(--accent-primary, #007bff);
                border-color: var(--accent-primary, #007bff);
            }
            
            .checkbox-container input[type="checkbox"]:checked + .checkbox-checkmark::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            
            .checkbox-label {
                font-size: 14px;
                color: var(--text-secondary, #666);
            }
            
            .demo-credentials {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 12px;
            }
            
            .demo-credential {
                font-size: 12px;
                color: var(--text-tertiary, #999);
                padding: 8px 12px;
                background-color: var(--bg-tertiary, #f5f5f5);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .demo-credential:hover {
                background-color: var(--accent-light, #e3f2fd);
                color: var(--accent-primary, #007bff);
            }
            
            .alert {
                margin-top: 16px;
                padding: 12px 16px;
                border-radius: 4px;
                font-size: 14px;
                transition: opacity 0.3s;
            }
            
            .alert-danger {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .alert-success {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
        `;
        document.head.appendChild(style);
    </script>
</body>
</html>