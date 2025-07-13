<?php
/**
 * Employee Management API
 * Handles all employee-related operations
 */

require_once '../config/database.php';

class EmployeeAPI {
    private $db;
    
    public function __construct() {
        $this->db = getDatabase();
    }
    
    /**
     * Get all employees
     */
    public function getEmployees($filters = []) {
        try {
            $sql = "SELECT e.*, d.name as department_name 
                    FROM employees e 
                    LEFT JOIN departments d ON e.department = d.name 
                    WHERE 1=1";
            $params = [];
            
            // Apply filters
            if (!empty($filters['status'])) {
                $sql .= " AND e.status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['department'])) {
                $sql .= " AND e.department = ?";
                $params[] = $filters['department'];
            }
            
            if (!empty($filters['role'])) {
                $sql .= " AND e.role = ?";
                $params[] = $filters['role'];
            }
            
            if (!empty($filters['search'])) {
                $sql .= " AND (e.full_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            $sql .= " ORDER BY e.created_at DESC";
            
            $stmt = $this->db->query($sql, $params);
            $employees = $stmt->fetchAll();
            
            // Format response
            foreach ($employees as &$employee) {
                $employee['id'] = $employee['employee_code']; // For frontend compatibility
                unset($employee['password_hash']); // Never send password hash
                $employee['wage'] = floatval($employee['hourly_rate']);
                $employee['overtimeRate'] = floatval($employee['overtime_rate']);
                $employee['dateHired'] = $employee['date_hired'];
                $employee['fullName'] = $employee['full_name'];
                $employee['firstName'] = $employee['first_name'];
                $employee['lastName'] = $employee['last_name'];
                $employee['employeeId'] = $employee['employee_code'];
            }
            
            return $employees;
        } catch (Exception $e) {
            throw new Exception("Failed to fetch employees: " . $e->getMessage());
        }
    }
    
    /**
     * Get employee by ID
     */
    public function getEmployee($employeeCode) {
        try {
            $sql = "SELECT e.*, d.name as department_name 
                    FROM employees e 
                    LEFT JOIN departments d ON e.department = d.name 
                    WHERE e.employee_code = ?";
            
            $stmt = $this->db->query($sql, [$employeeCode]);
            $employee = $stmt->fetch();
            
            if (!$employee) {
                throw new Exception("Employee not found");
            }
            
            unset($employee['password_hash']);
            $employee['id'] = $employee['employee_code'];
            $employee['wage'] = floatval($employee['hourly_rate']);
            $employee['overtimeRate'] = floatval($employee['overtime_rate']);
            $employee['dateHired'] = $employee['date_hired'];
            $employee['fullName'] = $employee['full_name'];
            $employee['firstName'] = $employee['first_name'];
            $employee['lastName'] = $employee['last_name'];
            $employee['employeeId'] = $employee['employee_code'];
            
            return $employee;
        } catch (Exception $e) {
            throw new Exception("Failed to fetch employee: " . $e->getMessage());
        }
    }
    
    /**
     * Add new employee
     */
    public function addEmployee($data) {
        try {
            // Validate required fields
            $required = ['username', 'password', 'full_name', 'email', 'department', 'position', 'hourly_rate'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }
            
            // Validate email
            if (!isValidEmail($data['email'])) {
                throw new Exception("Invalid email format");
            }
            
            // Check for duplicate username/email
            $checkSql = "SELECT id FROM employees WHERE username = ? OR email = ?";
            $stmt = $this->db->query($checkSql, [$data['username'], $data['email']]);
            if ($stmt->fetch()) {
                throw new Exception("Username or email already exists");
            }
            
            $this->db->beginTransaction();
            
            // Insert employee
            $sql = "INSERT INTO employees (
                username, password_hash, role, full_name, first_name, last_name, 
                email, phone, department, position, date_hired, hourly_rate, 
                overtime_rate, status, address, emergency_contact, emergency_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $data['username'],
                hashPassword($data['password']),
                $data['role'] ?? 'employee',
                $data['full_name'],
                $data['first_name'] ?? null,
                $data['last_name'] ?? null,
                $data['email'],
                $data['phone'] ?? null,
                $data['department'],
                $data['position'],
                $data['date_hired'] ?? date('Y-m-d'),
                $data['hourly_rate'],
                $data['overtime_rate'] ?? 1.5,
                $data['status'] ?? 'active',
                $data['address'] ?? null,
                $data['emergency_contact'] ?? null,
                $data['emergency_phone'] ?? null
            ];
            
            $stmt = $this->db->query($sql, $params);
            $employeeId = $this->db->lastInsertId();
            
            // Generate and update employee code
            $employeeCode = generateEmployeeCode($employeeId);
            $this->db->query("UPDATE employees SET employee_code = ? WHERE id = ?", [$employeeCode, $employeeId]);
            
            $this->db->commit();
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'CREATE_EMPLOYEE', 'employees', $employeeId, null, $data);
            
            // Return the created employee
            return $this->getEmployee($employeeCode);
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception("Failed to create employee: " . $e->getMessage());
        }
    }
    
    /**
     * Update employee
     */
    public function updateEmployee($employeeCode, $data) {
        try {
            // Get current employee data for audit
            $currentEmployee = $this->getEmployee($employeeCode);
            
            // Build update query dynamically
            $updateFields = [];
            $params = [];
            
            $allowedFields = [
                'full_name', 'first_name', 'last_name', 'email', 'phone', 
                'department', 'position', 'hourly_rate', 'overtime_rate', 
                'status', 'address', 'emergency_contact', 'emergency_phone'
            ];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("No valid fields to update");
            }
            
            // Handle password update separately
            if (!empty($data['password'])) {
                $updateFields[] = "password_hash = ?";
                $params[] = hashPassword($data['password']);
            }
            
            $params[] = $employeeCode;
            
            $sql = "UPDATE employees SET " . implode(', ', $updateFields) . " WHERE employee_code = ?";
            $stmt = $this->db->query($sql, $params);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Employee not found or no changes made");
            }
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'UPDATE_EMPLOYEE', 'employees', $currentEmployee['id'], $currentEmployee, $data);
            
            return $this->getEmployee($employeeCode);
            
        } catch (Exception $e) {
            throw new Exception("Failed to update employee: " . $e->getMessage());
        }
    }
    
    /**
     * Delete employee
     */
    public function deleteEmployee($employeeCode) {
        try {
            // Get current employee data for audit
            $currentEmployee = $this->getEmployee($employeeCode);
            
            // Soft delete by updating status
            $sql = "UPDATE employees SET status = 'terminated' WHERE employee_code = ?";
            $stmt = $this->db->query($sql, [$employeeCode]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Employee not found");
            }
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'DELETE_EMPLOYEE', 'employees', $currentEmployee['id'], $currentEmployee, null);
            
            return ['success' => true, 'message' => "Employee deleted successfully"];
            
        } catch (Exception $e) {
            throw new Exception("Failed to delete employee: " . $e->getMessage());
        }
    }
    
    /**
     * Update employee wage
     */
    public function updateEmployeeWage($employeeCode, $data) {
        try {
            if (empty($data['hourly_rate'])) {
                throw new Exception("Hourly rate is required");
            }
            
            $currentEmployee = $this->getEmployee($employeeCode);
            $oldRate = $currentEmployee['hourly_rate'];
            
            $sql = "UPDATE employees SET hourly_rate = ? WHERE employee_code = ?";
            $stmt = $this->db->query($sql, [$data['hourly_rate'], $employeeCode]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Employee not found");
            }
            
            // Log wage change
            $wageChangeData = [
                'employee_code' => $employeeCode,
                'old_rate' => $oldRate,
                'new_rate' => $data['hourly_rate'],
                'reason' => $data['reason'] ?? '',
                'changed_by' => getCurrentUser()['sub'] ?? null,
                'changed_at' => date('Y-m-d H:i:s')
            ];
            
            logAudit(getCurrentUser()['sub'] ?? null, 'UPDATE_WAGE', 'employees', $currentEmployee['id'], ['hourly_rate' => $oldRate], ['hourly_rate' => $data['hourly_rate']]);
            
            return [
                'success' => true,
                'employee' => $this->getEmployee($employeeCode),
                'wage_change' => $wageChangeData
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to update employee wage: " . $e->getMessage());
        }
    }
    
    /**
     * Get employee performance data
     */
    public function getEmployeePerformance($filters = []) {
        try {
            $sql = "SELECT 
                        e.employee_code as employeeId,
                        e.full_name as name,
                        e.department,
                        COALESCE(AVG(CASE WHEN ar.status = 'present' THEN 100 ELSE 0 END), 0) as attendanceRate,
                        COALESCE(AVG(CASE WHEN ar.status IN ('present', 'late') AND ar.clock_in <= '09:15:00' THEN 100 ELSE 0 END), 0) as punctualityRate,
                        85 as productivity, -- Placeholder for actual productivity calculation
                        COUNT(DISTINCT ar.record_date) as daysWorked,
                        MAX(ar.updated_at) as lastUpdated
                    FROM employees e
                    LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                        AND ar.record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    WHERE e.status = 'active'";
            
            $params = [];
            
            if (!empty($filters['employeeId'])) {
                $sql .= " AND e.employee_code = ?";
                $params[] = $filters['employeeId'];
            }
            
            $sql .= " GROUP BY e.id ORDER BY e.full_name";
            
            $stmt = $this->db->query($sql, $params);
            $performance = $stmt->fetchAll();
            
            // Format data
            foreach ($performance as &$perf) {
                $perf['attendanceRate'] = round($perf['attendanceRate'], 1);
                $perf['punctualityRate'] = round($perf['punctualityRate'], 1);
                $perf['productivity'] = intval($perf['productivity']);
                $perf['recentProjects'] = rand(1, 5); // Placeholder
                $perf['lastUpdated'] = date('c');
            }
            
            return $performance;
            
        } catch (Exception $e) {
            throw new Exception("Failed to fetch employee performance: " . $e->getMessage());
        }
    }
    
    /**
     * Get employees by department
     */
    public function getEmployeesByDepartment($department) {
        try {
            $filters = ['department' => $department, 'status' => 'active'];
            return $this->getEmployees($filters);
        } catch (Exception $e) {
            throw new Exception("Failed to fetch employees by department: " . $e->getMessage());
        }
    }
    
    /**
     * Get departments
     */
    public function getDepartments() {
        try {
            $sql = "SELECT DISTINCT name FROM departments ORDER BY name";
            $stmt = $this->db->query($sql);
            return array_column($stmt->fetchAll(), 'name');
        } catch (Exception $e) {
            throw new Exception("Failed to fetch departments: " . $e->getMessage());
        }
    }
}
