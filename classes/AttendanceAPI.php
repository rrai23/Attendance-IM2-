<?php
/**
 * Attendance Management API
 * Handles all attendance-related operations
 */

require_once '../config/database.php';

class AttendanceAPI {
    private $db;
    
    public function __construct() {
        $this->db = getDatabase();
    }
    
    /**
     * Get attendance records
     */
    public function getAttendanceRecords($filters = []) {
        try {
            $sql = "SELECT 
                        ar.*,
                        e.employee_code,
                        e.full_name as employee_name,
                        e.department,
                        e.hourly_rate
                    FROM attendance_records ar
                    JOIN employees e ON ar.employee_id = e.id
                    WHERE 1=1";
            $params = [];
            
            // Apply filters
            if (!empty($filters['employeeId'])) {
                $sql .= " AND e.employee_code = ?";
                $params[] = $filters['employeeId'];
            }
            
            if (!empty($filters['startDate'])) {
                $sql .= " AND ar.record_date >= ?";
                $params[] = $filters['startDate'];
            }
            
            if (!empty($filters['endDate'])) {
                $sql .= " AND ar.record_date <= ?";
                $params[] = $filters['endDate'];
            }
            
            if (!empty($filters['status'])) {
                $sql .= " AND ar.status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['department'])) {
                $sql .= " AND e.department = ?";
                $params[] = $filters['department'];
            }
            
            $sql .= " ORDER BY ar.record_date DESC, ar.created_at DESC";
            
            // Add limit for pagination
            if (!empty($filters['limit'])) {
                $sql .= " LIMIT " . intval($filters['limit']);
                if (!empty($filters['offset'])) {
                    $sql .= " OFFSET " . intval($filters['offset']);
                }
            }
            
            $stmt = $this->db->query($sql, $params);
            $records = $stmt->fetchAll();
            
            // Format response
            foreach ($records as &$record) {
                $record['id'] = 'att_' . $record['id'];
                $record['employeeId'] = $record['employee_code'];
                $record['employeeName'] = $record['employee_name'];
                $record['date'] = $record['record_date'];
                $record['clockIn'] = $record['clock_in'];
                $record['clockOut'] = $record['clock_out'];
                $record['breakStart'] = $record['break_start'];
                $record['breakEnd'] = $record['break_end'];
                $record['hoursWorked'] = floatval($record['hours_worked']);
                $record['overtimeHours'] = floatval($record['overtime_hours']);
                $record['hourlyRate'] = floatval($record['hourly_rate']);
                
                // Calculate pay
                $regularPay = $record['hoursWorked'] * $record['hourlyRate'];
                $overtimePay = $record['overtimeHours'] * $record['hourlyRate'] * 1.5;
                $record['regularPay'] = round($regularPay, 2);
                $record['overtimePay'] = round($overtimePay, 2);
                $record['totalPay'] = round($regularPay + $overtimePay, 2);
                
                $record['createdAt'] = $record['created_at'];
                $record['updatedAt'] = $record['updated_at'];
            }
            
            return $records;
        } catch (Exception $e) {
            throw new Exception("Failed to fetch attendance records: " . $e->getMessage());
        }
    }
    
    /**
     * Add attendance record
     */
    public function addAttendanceRecord($data) {
        try {
            // Validate required fields
            $required = ['employeeId', 'date'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }
            
            // Get employee ID from employee code
            $empStmt = $this->db->query("SELECT id FROM employees WHERE employee_code = ?", [$data['employeeId']]);
            $employee = $empStmt->fetch();
            if (!$employee) {
                throw new Exception("Employee not found");
            }
            $employeeId = $employee['id'];
            
            // Check for duplicate record on same date
            $checkStmt = $this->db->query(
                "SELECT id FROM attendance_records WHERE employee_id = ? AND record_date = ?",
                [$employeeId, $data['date']]
            );
            if ($checkStmt->fetch()) {
                throw new Exception("Attendance record already exists for this date");
            }
            
            // Calculate hours if clock times are provided
            $hoursWorked = 0;
            $overtimeHours = 0;
            
            if (!empty($data['clockIn']) && !empty($data['clockOut'])) {
                $hoursWorked = calculateHours($data['clockIn'], $data['clockOut']);
                
                // Subtract break time if provided
                if (!empty($data['breakStart']) && !empty($data['breakEnd'])) {
                    $breakHours = calculateHours($data['breakStart'], $data['breakEnd']);
                    $hoursWorked -= $breakHours;
                }
                
                // Calculate overtime (over 8 hours)
                $standardHours = floatval(getSystemSetting('working_hours_per_day', 8));
                if ($hoursWorked > $standardHours) {
                    $overtimeHours = $hoursWorked - $standardHours;
                    $hoursWorked = $standardHours;
                }
            }
            
            // Determine status if not provided
            $status = $data['status'] ?? 'present';
            if (empty($data['status']) && !empty($data['clockIn'])) {
                $workStartTime = getSystemSetting('work_start_time', '09:00');
                $graceMinutes = intval(getSystemSetting('late_grace_period', 15));
                
                $clockInTime = new DateTime($data['clockIn']);
                $startTime = new DateTime($workStartTime);
                $startTime->add(new DateInterval('PT' . $graceMinutes . 'M'));
                
                $status = $clockInTime > $startTime ? 'late' : 'present';
            }
            
            $sql = "INSERT INTO attendance_records (
                employee_id, record_date, clock_in, clock_out, break_start, break_end,
                hours_worked, overtime_hours, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $employeeId,
                $data['date'],
                $data['clockIn'] ?? null,
                $data['clockOut'] ?? null,
                $data['breakStart'] ?? null,
                $data['breakEnd'] ?? null,
                $hoursWorked,
                $overtimeHours,
                $status,
                $data['notes'] ?? null
            ];
            
            $stmt = $this->db->query($sql, $params);
            $recordId = $this->db->lastInsertId();
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'CREATE_ATTENDANCE', 'attendance_records', $recordId, null, $data);
            
            // Return the created record
            return $this->getAttendanceRecord($recordId);
            
        } catch (Exception $e) {
            throw new Exception("Failed to create attendance record: " . $e->getMessage());
        }
    }
    
    /**
     * Update attendance record
     */
    public function updateAttendanceRecord($recordId, $data) {
        try {
            // Remove 'att_' prefix if present
            $recordId = str_replace('att_', '', $recordId);
            
            // Get current record for audit
            $currentRecord = $this->getAttendanceRecord($recordId);
            
            // Build update query dynamically
            $updateFields = [];
            $params = [];
            
            $allowedFields = [
                'record_date' => 'date',
                'clock_in' => 'clockIn',
                'clock_out' => 'clockOut',
                'break_start' => 'breakStart',
                'break_end' => 'breakEnd',
                'status' => 'status',
                'notes' => 'notes'
            ];
            
            foreach ($allowedFields as $dbField => $apiField) {
                if (isset($data[$apiField])) {
                    $updateFields[] = "$dbField = ?";
                    $params[] = $data[$apiField];
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("No valid fields to update");
            }
            
            // Recalculate hours if clock times were updated
            if (isset($data['clockIn']) || isset($data['clockOut'])) {
                $clockIn = $data['clockIn'] ?? $currentRecord['clockIn'];
                $clockOut = $data['clockOut'] ?? $currentRecord['clockOut'];
                
                if ($clockIn && $clockOut) {
                    $hoursWorked = calculateHours($clockIn, $clockOut);
                    
                    // Subtract break time
                    $breakStart = $data['breakStart'] ?? $currentRecord['breakStart'];
                    $breakEnd = $data['breakEnd'] ?? $currentRecord['breakEnd'];
                    
                    if ($breakStart && $breakEnd) {
                        $breakHours = calculateHours($breakStart, $breakEnd);
                        $hoursWorked -= $breakHours;
                    }
                    
                    // Calculate overtime
                    $standardHours = floatval(getSystemSetting('working_hours_per_day', 8));
                    $overtimeHours = max(0, $hoursWorked - $standardHours);
                    $hoursWorked = min($hoursWorked, $standardHours);
                    
                    $updateFields[] = "hours_worked = ?";
                    $updateFields[] = "overtime_hours = ?";
                    $params[] = $hoursWorked;
                    $params[] = $overtimeHours;
                }
            }
            
            $params[] = $recordId;
            
            $sql = "UPDATE attendance_records SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $this->db->query($sql, $params);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Attendance record not found or no changes made");
            }
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'UPDATE_ATTENDANCE', 'attendance_records', $recordId, $currentRecord, $data);
            
            return $this->getAttendanceRecord($recordId);
            
        } catch (Exception $e) {
            throw new Exception("Failed to update attendance record: " . $e->getMessage());
        }
    }
    
    /**
     * Get single attendance record
     */
    public function getAttendanceRecord($recordId) {
        try {
            $records = $this->getAttendanceRecords(['recordId' => $recordId]);
            if (empty($records)) {
                throw new Exception("Attendance record not found");
            }
            return $records[0];
        } catch (Exception $e) {
            throw new Exception("Failed to fetch attendance record: " . $e->getMessage());
        }
    }
    
    /**
     * Delete attendance record
     */
    public function deleteAttendanceRecord($recordId) {
        try {
            $recordId = str_replace('att_', '', $recordId);
            
            // Get current record for audit
            $currentRecord = $this->getAttendanceRecord($recordId);
            
            $sql = "DELETE FROM attendance_records WHERE id = ?";
            $stmt = $this->db->query($sql, [$recordId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Attendance record not found");
            }
            
            // Log audit
            logAudit(getCurrentUser()['sub'] ?? null, 'DELETE_ATTENDANCE', 'attendance_records', $recordId, $currentRecord, null);
            
            return ['success' => true, 'message' => 'Attendance record deleted successfully'];
            
        } catch (Exception $e) {
            throw new Exception("Failed to delete attendance record: " . $e->getMessage());
        }
    }
    
    /**
     * Get attendance statistics
     */
    public function getAttendanceStats($filters = []) {
        try {
            $date = $filters['date'] ?? date('Y-m-d');
            $startDate = $filters['startDate'] ?? $date;
            $endDate = $filters['endDate'] ?? $date;
            
            // Get total active employees
            $totalStmt = $this->db->query("SELECT COUNT(*) as total FROM employees WHERE status = 'active'");
            $totalEmployees = $totalStmt->fetch()['total'];
            
            // Get attendance stats for the date range
            $sql = "SELECT 
                        COUNT(DISTINCT ar.employee_id) as employees_with_records,
                        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
                        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
                        COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
                        COUNT(CASE WHEN ar.status = 'sick' THEN 1 END) as sick_count,
                        COUNT(CASE WHEN ar.status = 'vacation' THEN 1 END) as vacation_count,
                        AVG(ar.hours_worked) as avg_hours_worked,
                        SUM(ar.overtime_hours) as total_overtime_hours
                    FROM attendance_records ar
                    JOIN employees e ON ar.employee_id = e.id
                    WHERE ar.record_date BETWEEN ? AND ?
                      AND e.status = 'active'";
            
            $stmt = $this->db->query($sql, [$startDate, $endDate]);
            $stats = $stmt->fetch();
            
            $presentToday = $stats['present_count'] + $stats['late_count']; // Present includes late
            $absentToday = $totalEmployees - $presentToday;
            
            $attendanceRate = $totalEmployees > 0 ? round(($presentToday / $totalEmployees) * 100, 1) : 0;
            $tardyRate = $presentToday > 0 ? round(($stats['late_count'] / $presentToday) * 100, 1) : 0;
            
            // Get weekly trend (last 7 days)
            $trendSql = "SELECT 
                            DATE(ar.record_date) as date,
                            COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as present,
                            COUNT(DISTINCT e.id) as total_employees
                         FROM attendance_records ar
                         JOIN employees e ON ar.employee_id = e.id
                         WHERE ar.record_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                           AND e.status = 'active'
                         GROUP BY DATE(ar.record_date)
                         ORDER BY date";
            
            $trendStmt = $this->db->query($trendSql);
            $trendData = $trendStmt->fetchAll();
            
            $weeklyTrend = [];
            for ($i = 6; $i >= 0; $i--) {
                $checkDate = date('Y-m-d', strtotime("-$i days"));
                $found = false;
                foreach ($trendData as $trend) {
                    if ($trend['date'] === $checkDate) {
                        $rate = $trend['total_employees'] > 0 ? round(($trend['present'] / $totalEmployees) * 100) : 0;
                        $weeklyTrend[] = $rate;
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $weeklyTrend[] = 0;
                }
            }
            
            return [
                'date' => $date,
                'dateRange' => ['start' => $startDate, 'end' => $endDate],
                'totalEmployees' => intval($totalEmployees),
                'presentToday' => intval($presentToday),
                'absentToday' => intval($absentToday),
                'tardyToday' => intval($stats['late_count']),
                'sickToday' => intval($stats['sick_count']),
                'vacationToday' => intval($stats['vacation_count']),
                'attendanceRate' => $attendanceRate,
                'tardyRate' => $tardyRate,
                'averageHoursWorked' => round(floatval($stats['avg_hours_worked']), 2),
                'totalOvertimeHours' => round(floatval($stats['total_overtime_hours']), 2),
                'weeklyTrend' => $weeklyTrend,
                'lastUpdated' => date('c'),
                'departments' => [
                    'total' => intval($totalEmployees),
                    'with100Percent' => 0, // Placeholder
                    'withIssues' => 0 // Placeholder
                ],
                'overtime' => [
                    'requestsToday' => $this->getOvertimeRequestsCount(['date' => $date]),
                    'pendingApproval' => $this->getOvertimeRequestsCount(['status' => 'pending']),
                    'thisWeekTotal' => round(floatval($stats['total_overtime_hours']), 1)
                ],
                'today' => [
                    'total' => intval($totalEmployees),
                    'present' => intval($stats['present_count']),
                    'late' => intval($stats['late_count']),
                    'absent' => intval($absentToday),
                    'attendanceRate' => $attendanceRate
                ]
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to calculate attendance statistics: " . $e->getMessage());
        }
    }
    
    /**
     * Clock in/out operations
     */
    public function clockIn($employeeCode, $data = []) {
        try {
            $empStmt = $this->db->query("SELECT id FROM employees WHERE employee_code = ?", [$employeeCode]);
            $employee = $empStmt->fetch();
            if (!$employee) {
                throw new Exception("Employee not found");
            }
            
            $today = date('Y-m-d');
            $currentTime = $data['time'] ?? date('H:i:s');
            
            // Check if already clocked in today
            $checkStmt = $this->db->query(
                "SELECT id, clock_in FROM attendance_records WHERE employee_id = ? AND record_date = ?",
                [$employee['id'], $today]
            );
            $existingRecord = $checkStmt->fetch();
            
            if ($existingRecord && $existingRecord['clock_in']) {
                throw new Exception("Already clocked in today");
            }
            
            if ($existingRecord) {
                // Update existing record
                $sql = "UPDATE attendance_records SET clock_in = ?, status = 'present' WHERE id = ?";
                $this->db->query($sql, [$currentTime, $existingRecord['id']]);
                $recordId = $existingRecord['id'];
            } else {
                // Create new record
                $recordData = [
                    'employeeId' => $employeeCode,
                    'date' => $today,
                    'clockIn' => $currentTime,
                    'notes' => $data['notes'] ?? 'Clock in'
                ];
                $record = $this->addAttendanceRecord($recordData);
                $recordId = str_replace('att_', '', $record['id']);
            }
            
            return [
                'success' => true,
                'message' => 'Clocked in successfully',
                'time' => $currentTime,
                'record' => $this->getAttendanceRecord($recordId)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Clock in failed: " . $e->getMessage());
        }
    }
    
    public function clockOut($employeeCode, $data = []) {
        try {
            $empStmt = $this->db->query("SELECT id FROM employees WHERE employee_code = ?", [$employeeCode]);
            $employee = $empStmt->fetch();
            if (!$employee) {
                throw new Exception("Employee not found");
            }
            
            $today = date('Y-m-d');
            $currentTime = $data['time'] ?? date('H:i:s');
            
            // Find today's record
            $checkStmt = $this->db->query(
                "SELECT id, clock_in, clock_out FROM attendance_records WHERE employee_id = ? AND record_date = ?",
                [$employee['id'], $today]
            );
            $record = $checkStmt->fetch();
            
            if (!$record) {
                throw new Exception("No clock-in record found for today");
            }
            
            if ($record['clock_out']) {
                throw new Exception("Already clocked out today");
            }
            
            if (!$record['clock_in']) {
                throw new Exception("Must clock in before clocking out");
            }
            
            // Update record with clock out time
            $updateData = [
                'clockOut' => $currentTime,
                'notes' => $data['notes'] ?? 'Clock out'
            ];
            
            $updatedRecord = $this->updateAttendanceRecord($record['id'], $updateData);
            
            return [
                'success' => true,
                'message' => 'Clocked out successfully',
                'time' => $currentTime,
                'hoursWorked' => $updatedRecord['hoursWorked'],
                'record' => $updatedRecord
            ];
            
        } catch (Exception $e) {
            throw new Exception("Clock out failed: " . $e->getMessage());
        }
    }
    
    /**
     * Helper method to get overtime requests count
     */
    private function getOvertimeRequestsCount($filters = []) {
        try {
            $sql = "SELECT COUNT(*) as count FROM overtime_requests WHERE 1=1";
            $params = [];
            
            if (!empty($filters['date'])) {
                $sql .= " AND request_date = ?";
                $params[] = $filters['date'];
            }
            
            if (!empty($filters['status'])) {
                $sql .= " AND status = ?";
                $params[] = $filters['status'];
            }
            
            $stmt = $this->db->query($sql, $params);
            return intval($stmt->fetch()['count']);
        } catch (Exception $e) {
            return 0;
        }
    }
}
