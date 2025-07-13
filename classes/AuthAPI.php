<?php
/**
 * Authentication API
 * Handles user authentication and session management
 */

require_once '../config/database.php';

class AuthAPI {
    private $db;
    
    public function __construct() {
        $this->db = getDatabase();
    }
    
    /**
     * User login
     */
    public function login($username, $password, $rememberMe = false) {
        try {
            if (empty($username) || empty($password)) {
                throw new Exception("Username and password are required");
            }
            
            // Get user from database
            $sql = "SELECT e.*, d.name as department_name 
                    FROM employees e 
                    LEFT JOIN departments d ON e.department = d.name 
                    WHERE e.username = ? AND e.status = 'active'";
            
            $stmt = $this->db->query($sql, [$username]);
            $user = $stmt->fetch();
            
            if (!$user || !verifyPassword($password, $user['password_hash'])) {
                // Log failed login attempt
                logAudit(null, 'LOGIN_FAILED', null, null, null, ['username' => $username, 'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown']);
                throw new Exception("Invalid username or password");
            }
            
            // Create JWT token
            $payload = [
                'sub' => $user['employee_code'],
                'id' => $user['employee_code'],
                'employeeId' => $user['employee_code'],
                'username' => $user['username'],
                'role' => $user['role'],
                'fullName' => $user['full_name'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'email' => $user['email'],
                'department' => $user['department'],
                'position' => $user['position'],
                'iat' => time(),
                'exp' => time() + ($rememberMe ? JWT_EXPIRY * 7 : JWT_EXPIRY) // 7 days if remember me
            ];
            
            $token = generateJWT($payload);
            
            // Store session in database
            $sessionExpiry = date('Y-m-d H:i:s', $payload['exp']);
            $sessionSql = "INSERT INTO user_sessions (employee_id, session_token, expires_at, ip_address, user_agent) 
                          VALUES (?, ?, ?, ?, ?)";
            $this->db->query($sessionSql, [
                $user['id'],
                $token,
                $sessionExpiry,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
            
            // Log successful login
            logAudit($user['employee_code'], 'LOGIN_SUCCESS', null, null, null, [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
            // Update last login time (if we add this field to employees table)
            // $this->db->query("UPDATE employees SET last_login = NOW() WHERE id = ?", [$user['id']]);
            
            // Prepare user data (remove sensitive information)
            $userData = [
                'id' => $user['employee_code'],
                'employeeId' => $user['employee_code'],
                'username' => $user['username'],
                'role' => $user['role'],
                'fullName' => $user['full_name'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'email' => $user['email'],
                'department' => $user['department'],
                'position' => $user['position'],
                'status' => $user['status'],
                'hourlyRate' => floatval($user['hourly_rate'])
            ];
            
            return [
                'success' => true,
                'message' => 'Login successful',
                'token' => $token,
                'user' => $userData,
                'expiresAt' => $sessionExpiry
            ];
            
        } catch (Exception $e) {
            throw new Exception("Login failed: " . $e->getMessage());
        }
    }
    
    /**
     * User logout
     */
    public function logout($token = null) {
        try {
            // Get token from header if not provided
            if (!$token) {
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
                if (strpos($authHeader, 'Bearer ') === 0) {
                    $token = substr($authHeader, 7);
                }
            }
            
            if ($token) {
                // Verify token and get user info
                $payload = verifyJWT($token);
                if ($payload) {
                    // Remove session from database
                    $this->db->query("DELETE FROM user_sessions WHERE session_token = ?", [$token]);
                    
                    // Log logout
                    logAudit($payload['sub'], 'LOGOUT', null, null, null, [
                        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                    ]);
                }
            }
            
            return [
                'success' => true,
                'message' => 'Logged out successfully'
            ];
            
        } catch (Exception $e) {
            // Even if logout fails, return success to client
            return [
                'success' => true,
                'message' => 'Logged out successfully'
            ];
        }
    }
    
    /**
     * Refresh token
     */
    public function refreshToken($token) {
        try {
            $payload = verifyJWT($token);
            if (!$payload) {
                throw new Exception("Invalid token");
            }
            
            // Check if session exists in database
            $sessionStmt = $this->db->query(
                "SELECT s.*, e.* FROM user_sessions s 
                 JOIN employees e ON s.employee_id = e.id 
                 WHERE s.session_token = ? AND s.expires_at > NOW() AND e.status = 'active'",
                [$token]
            );
            $session = $sessionStmt->fetch();
            
            if (!$session) {
                throw new Exception("Session not found or expired");
            }
            
            // Generate new token
            $newPayload = [
                'sub' => $session['employee_code'],
                'id' => $session['employee_code'],
                'employeeId' => $session['employee_code'],
                'username' => $session['username'],
                'role' => $session['role'],
                'fullName' => $session['full_name'],
                'firstName' => $session['first_name'],
                'lastName' => $session['last_name'],
                'email' => $session['email'],
                'department' => $session['department'],
                'position' => $session['position'],
                'iat' => time(),
                'exp' => time() + JWT_EXPIRY
            ];
            
            $newToken = generateJWT($newPayload);
            
            // Update session in database
            $newExpiry = date('Y-m-d H:i:s', $newPayload['exp']);
            $this->db->query(
                "UPDATE user_sessions SET session_token = ?, expires_at = ? WHERE session_token = ?",
                [$newToken, $newExpiry, $token]
            );
            
            return [
                'success' => true,
                'token' => $newToken,
                'expiresAt' => $newExpiry
            ];
            
        } catch (Exception $e) {
            throw new Exception("Token refresh failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get current user info
     */
    public function getCurrentUser() {
        try {
            $user = getCurrentUser();
            if (!$user) {
                throw new Exception("Not authenticated");
            }
            
            // Get fresh user data from database
            $stmt = $this->db->query(
                "SELECT e.*, d.name as department_name 
                 FROM employees e 
                 LEFT JOIN departments d ON e.department = d.name 
                 WHERE e.employee_code = ? AND e.status = 'active'",
                [$user['sub']]
            );
            $userData = $stmt->fetch();
            
            if (!$userData) {
                throw new Exception("User not found or inactive");
            }
            
            return [
                'id' => $userData['employee_code'],
                'employeeId' => $userData['employee_code'],
                'username' => $userData['username'],
                'role' => $userData['role'],
                'fullName' => $userData['full_name'],
                'firstName' => $userData['first_name'],
                'lastName' => $userData['last_name'],
                'email' => $userData['email'],
                'department' => $userData['department'],
                'position' => $userData['position'],
                'status' => $userData['status'],
                'hourlyRate' => floatval($userData['hourly_rate'])
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get user info: " . $e->getMessage());
        }
    }
    
    /**
     * Change password
     */
    public function changePassword($currentPassword, $newPassword) {
        try {
            $user = getCurrentUser();
            if (!$user) {
                throw new Exception("Not authenticated");
            }
            
            // Get current user data
            $stmt = $this->db->query(
                "SELECT password_hash FROM employees WHERE employee_code = ?",
                [$user['sub']]
            );
            $userData = $stmt->fetch();
            
            if (!$userData) {
                throw new Exception("User not found");
            }
            
            // Verify current password
            if (!verifyPassword($currentPassword, $userData['password_hash'])) {
                throw new Exception("Current password is incorrect");
            }
            
            // Validate new password
            if (strlen($newPassword) < 6) {
                throw new Exception("New password must be at least 6 characters long");
            }
            
            // Update password
            $newPasswordHash = hashPassword($newPassword);
            $this->db->query(
                "UPDATE employees SET password_hash = ? WHERE employee_code = ?",
                [$newPasswordHash, $user['sub']]
            );
            
            // Log password change
            logAudit($user['sub'], 'PASSWORD_CHANGE', 'employees', null, null, [
                'changed_at' => date('Y-m-d H:i:s')
            ]);
            
            // Invalidate all sessions for this user (force re-login)
            $this->db->query(
                "DELETE FROM user_sessions WHERE employee_id = (SELECT id FROM employees WHERE employee_code = ?)",
                [$user['sub']]
            );
            
            return [
                'success' => true,
                'message' => 'Password changed successfully. Please log in again.'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Password change failed: " . $e->getMessage());
        }
    }
    
    /**
     * Reset password (admin function)
     */
    public function resetPassword($employeeCode, $newPassword) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['role'] !== 'admin') {
                throw new Exception("Unauthorized: Admin access required");
            }
            
            // Validate new password
            if (strlen($newPassword) < 6) {
                throw new Exception("New password must be at least 6 characters long");
            }
            
            // Check if target employee exists
            $stmt = $this->db->query(
                "SELECT id FROM employees WHERE employee_code = ? AND status = 'active'",
                [$employeeCode]
            );
            if (!$stmt->fetch()) {
                throw new Exception("Employee not found");
            }
            
            // Update password
            $newPasswordHash = hashPassword($newPassword);
            $this->db->query(
                "UPDATE employees SET password_hash = ? WHERE employee_code = ?",
                [$newPasswordHash, $employeeCode]
            );
            
            // Log password reset
            logAudit($currentUser['sub'], 'PASSWORD_RESET', 'employees', null, null, [
                'target_employee' => $employeeCode,
                'reset_by' => $currentUser['sub'],
                'reset_at' => date('Y-m-d H:i:s')
            ]);
            
            // Invalidate all sessions for the target user
            $this->db->query(
                "DELETE FROM user_sessions WHERE employee_id = (SELECT id FROM employees WHERE employee_code = ?)",
                [$employeeCode]
            );
            
            return [
                'success' => true,
                'message' => 'Password reset successfully'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Password reset failed: " . $e->getMessage());
        }
    }
    
    /**
     * Verify token and get user info
     */
    public function verifyToken($token) {
        try {
            $payload = verifyJWT($token);
            if (!$payload) {
                throw new Exception("Invalid token");
            }
            
            // Check if session exists in database
            $stmt = $this->db->query(
                "SELECT COUNT(*) as count FROM user_sessions 
                 WHERE session_token = ? AND expires_at > NOW()",
                [$token]
            );
            $result = $stmt->fetch();
            
            if (!$result || $result['count'] == 0) {
                throw new Exception("Session expired or not found");
            }
            
            return [
                'valid' => true,
                'user' => $payload
            ];
            
        } catch (Exception $e) {
            return [
                'valid' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get user sessions (admin function)
     */
    public function getUserSessions($employeeCode = null) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['role'] !== 'admin') {
                throw new Exception("Unauthorized: Admin access required");
            }
            
            $sql = "SELECT 
                        s.session_token,
                        s.expires_at,
                        s.ip_address,
                        s.user_agent,
                        s.created_at,
                        e.employee_code,
                        e.full_name,
                        e.username
                    FROM user_sessions s
                    JOIN employees e ON s.employee_id = e.id
                    WHERE s.expires_at > NOW()";
            $params = [];
            
            if ($employeeCode) {
                $sql .= " AND e.employee_code = ?";
                $params[] = $employeeCode;
            }
            
            $sql .= " ORDER BY s.created_at DESC";
            
            $stmt = $this->db->query($sql, $params);
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            throw new Exception("Failed to get user sessions: " . $e->getMessage());
        }
    }
    
    /**
     * Cleanup expired sessions
     */
    public function cleanupExpiredSessions() {
        try {
            $stmt = $this->db->query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
            $deletedCount = $stmt->rowCount();
            
            return [
                'success' => true,
                'message' => "Cleaned up $deletedCount expired sessions"
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to cleanup sessions: " . $e->getMessage());
        }
    }
}
