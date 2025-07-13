<?php
/**
 * Database Configuration for Bricks Attendance System
 * 
 * This file contains the database connection settings for XAMPP/MySQL
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'bricks_attendance');
define('DB_USER', 'root');
define('DB_PASS', ''); // Default XAMPP MySQL password is empty

// Application configuration
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('JWT_EXPIRY', 3600 * 24); // 24 hours
define('TIMEZONE', 'Asia/Manila');
define('DEBUG_MODE', true); // Set to false in production

// Set timezone
date_default_timezone_set(TIMEZONE);

// Enable error reporting in debug mode
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

/**
 * Database Connection Class
 */
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
        }
    }
    
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    public function commit() {
        return $this->connection->commit();
    }
    
    public function rollback() {
        return $this->connection->rollback();
    }
}

/**
 * Utility Functions
 */

/**
 * Get database instance
 */
function getDatabase() {
    return Database::getInstance();
}

/**
 * Log audit trail
 */
function logAudit($employeeId, $action, $tableName = null, $recordId = null, $oldValues = null, $newValues = null) {
    try {
        $db = getDatabase();
        $sql = "INSERT INTO audit_log (employee_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $params = [
            $employeeId,
            $action,
            $tableName,
            $recordId,
            $oldValues ? json_encode($oldValues) : null,
            $newValues ? json_encode($newValues) : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ];
        
        $db->query($sql, $params);
    } catch (Exception $e) {
        // Log audit failures silently in production
        if (DEBUG_MODE) {
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
}

/**
 * Generate employee code
 */
function generateEmployeeCode($id) {
    return 'emp_' . str_pad($id, 3, '0', STR_PAD_LEFT);
}

/**
 * Calculate hours worked between two times
 */
function calculateHours($clockIn, $clockOut) {
    if (!$clockIn || !$clockOut) {
        return 0;
    }
    
    $start = new DateTime($clockIn);
    $end = new DateTime($clockOut);
    
    // Handle overnight shifts
    if ($end < $start) {
        $end->add(new DateInterval('P1D'));
    }
    
    $interval = $start->diff($end);
    return round($interval->h + ($interval->i / 60), 2);
}

/**
 * Get system setting
 */
function getSystemSetting($key, $default = null) {
    try {
        $db = getDatabase();
        $stmt = $db->query("SELECT setting_value FROM system_settings WHERE setting_key = ?", [$key]);
        $result = $stmt->fetch();
        return $result ? $result['setting_value'] : $default;
    } catch (Exception $e) {
        return $default;
    }
}

/**
 * Set system setting
 */
function setSystemSetting($key, $value, $description = null) {
    try {
        $db = getDatabase();
        $sql = "INSERT INTO system_settings (setting_key, setting_value, description) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = COALESCE(VALUES(description), description)";
        $db->query($sql, [$key, $value, $description]);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Generate JWT token
 */
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + JWT_EXPIRY;
    $payload = json_encode($payload);
    
    $headerEncoded = base64url_encode($header);
    $payloadEncoded = base64url_encode($payload);
    
    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    $signatureEncoded = base64url_encode($signature);
    
    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}

/**
 * Verify JWT token
 */
function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
    
    $signature = base64url_decode($signatureEncoded);
    $expectedSignature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    
    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }
    
    $payload = json_decode(base64url_decode($payloadEncoded), true);
    
    if ($payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

/**
 * Base64 URL encode
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64 URL decode
 */
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

/**
 * Hash password
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Sanitize input
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Generate unique ID
 */
function generateUniqueId($prefix = '') {
    return $prefix . uniqid() . '_' . mt_rand(1000, 9999);
}

/**
 * Format currency
 */
function formatCurrency($amount, $currency = 'PHP') {
    $symbol = $currency === 'PHP' ? '₱' : '$';
    return $symbol . number_format($amount, 2);
}

/**
 * Format date for display
 */
function formatDate($date, $format = 'Y-m-d') {
    if (!$date) return '';
    return date($format, strtotime($date));
}

/**
 * Format time for display
 */
function formatTime($time, $format = 'H:i') {
    if (!$time) return '';
    return date($format, strtotime($time));
}

/**
 * Get current user from session/token
 */
function getCurrentUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
        return null;
    }
    
    $token = substr($authHeader, 7);
    $payload = verifyJWT($token);
    
    if (!$payload) {
        return null;
    }
    
    return $payload;
}

/**
 * Check if user has permission
 */
function hasPermission($requiredRole = 'employee') {
    $user = getCurrentUser();
    if (!$user) {
        return false;
    }
    
    $roleHierarchy = ['employee' => 1, 'manager' => 2, 'admin' => 3];
    $userLevel = $roleHierarchy[$user['role']] ?? 0;
    $requiredLevel = $roleHierarchy[$requiredRole] ?? 0;
    
    return $userLevel >= $requiredLevel;
}

/**
 * Send JSON response
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Send error response
 */
function sendError($message, $statusCode = 400, $code = null) {
    sendResponse([
        'error' => true,
        'message' => $message,
        'code' => $code ?? $statusCode
    ], $statusCode);
}

/**
 * Send success response
 */
function sendSuccess($data = null, $message = 'Success') {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    sendResponse($response);
}
