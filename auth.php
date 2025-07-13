<?php
// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']);
}

// Check if user has admin role
function isAdmin() {
    return isLoggedIn() && $_SESSION['role'] === 'admin';
}

// Check if user has employee role
function isEmployee() {
    return isLoggedIn() && $_SESSION['role'] === 'employee';
}

// Require authentication - redirect to login if not logged in
function requireAuth() {
    if (!isLoggedIn()) {
        header('Location: /IM2/login.php');
        exit();
    }
}

// Require admin access - redirect to dashboard if not admin
function requireAdmin() {
    requireAuth();
    if (!isAdmin()) {
        header('Location: dashboard.php');
        exit();
    }
}

// Require employee access (for employee-specific pages)
function requireEmployee() {
    requireAuth();
    if (!isEmployee()) {
        header('Location: dashboard.php');
        exit();
    }
}

// Get current user ID
function getCurrentUserId() {
    return isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
}

// Get current user role
function getCurrentUserRole() {
    return isset($_SESSION['role']) ? $_SESSION['role'] : null;
}

// Get current user full name

// Get current username
function getCurrentUsername() {
    return isset($_SESSION['username']) ? $_SESSION['username'] : null;
}

// Check if current user can view specific employee data
function canViewEmployee($employeeId) {
    if (isAdmin()) {
        return true; // Admin can view all employees
    }
    
    if (isEmployee()) {
        return getCurrentUserId() == $employeeId; // Employee can only view their own data
    }
    
    return false;
}

// Check if current user can edit specific employee data
function canEditEmployee($employeeId) {
    if (isAdmin()) {
        return true; // Admin can edit all employees
    }
    
    if (isEmployee()) {
        return getCurrentUserId() == $employeeId; // Employee can only edit their own basic data
    }
    
    return false;
}

// Redirect based on user role
function redirectByRole() {
    if (isAdmin()) {
        header('Location: dashboard.php');
    } elseif (isEmployee()) {
        header('Location: employee.php?id=' . getCurrentUserId());
    } else {
        header('Location: /IM2/login.php');
    }
    exit();
}
?>
