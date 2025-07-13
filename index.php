<?php
session_start();

// Check if user is logged in
if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    // User is logged in, redirect based on role
    $role = $_SESSION['role'];
    
    if ($role === 'admin' || $role === 'manager') {
        header('Location: dashboard.php');
        exit();
    } else {
        header('Location: employee.php');
        exit();
    }
} else {
    // User is not logged in, redirect to login
    header("Location: /IM2/login.php");
    exit();
}
?>
