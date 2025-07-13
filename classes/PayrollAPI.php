<?php
/**
 * Payroll Management API
 * Handles all payroll-related operations
 */

require_once '../config/database.php';

class PayrollAPI {
    private $db;
    
    public function __construct() {
        $this->db = getDatabase();
    }
    
    /**
     * Get payroll records
     */
    public function getPayrollData($filters = []) {
        try {
            $sql = "SELECT 
                        pr.*,
                        e.employee_code,
                        e.full_name as employee_name,
                        e.department,
                        e.hourly_rate as current_hourly_rate
                    FROM payroll_records pr
                    JOIN employees e ON pr.employee_id = e.id
                    WHERE 1=1";
            $params = [];
            
            // Apply filters
            if (!empty($filters['employeeId'])) {
                $sql .= " AND e.employee_code = ?";
                $params[] = $filters['employeeId'];
            }
            
            if (!empty($filters['startDate'])) {
                $sql .= " AND pr.pay_period_start >= ?";
                $params[] = $filters['startDate'];
            }
            
            if (!empty($filters['endDate'])) {
                $sql .= " AND pr.pay_period_end <= ?";
                $params[] = $filters['endDate'];
            }
            
            if (!empty($filters['status'])) {
                $sql .= " AND pr.status = ?";
                $params[] = $filters['status'];
            }
            
            $sql .= " ORDER BY pr.pay_period_start DESC, pr.created_at DESC";
            
            $stmt = $this->db->query($sql, $params);
            $records = $stmt->fetchAll();
            
            // Format response
            foreach ($records as &$record) {
                $record['id'] = 'pay_' . $record['id'];
                $record['employeeId'] = $record['employee_code'];
                $record['employeeName'] = $record['employee_name'];
                $record['periodStart'] = $record['pay_period_start'];
                $record['periodEnd'] = $record['pay_period_end'];
                $record['regularHours'] = floatval($record['regular_hours']);
                $record['overtimeHours'] = floatval($record['overtime_hours']);
                $record['regularPay'] = floatval($record['regular_pay']);
                $record['overtimePay'] = floatval($record['overtime_pay']);
                $record['grossPay'] = floatval($record['gross_pay']);
                $record['taxAmount'] = floatval($record['tax_amount']);
                $record['netPay'] = floatval($record['net_pay']);
                $record['payDate'] = $record['pay_date'];
                $record['currency'] = 'PHP';
                $record['currencySymbol'] = '₱';
                
                // Additional deduction details
                $record['deductions'] = [
                    'tax' => floatval($record['tax_amount']),
                    'sss' => floatval($record['sss_contribution']),
                    'philhealth' => floatval($record['philhealth_contribution']),
                    'pagibig' => floatval($record['pagibig_contribution']),
                    'other' => floatval($record['other_deductions']),
                    'total' => floatval($record['tax_amount']) + floatval($record['sss_contribution']) + 
                              floatval($record['philhealth_contribution']) + floatval($record['pagibig_contribution']) + 
                              floatval($record['other_deductions'])
                ];
            }
            
            return $records;
        } catch (Exception $e) {
            throw new Exception("Failed to fetch payroll data: " . $e->getMessage());
        }
    }
    
    /**
     * Calculate payroll for an employee
     */
    public function calculatePayroll($data) {
        try {
            // Validate required fields
            $required = ['employeeId', 'startDate', 'endDate'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }
            
            // Get employee data
            $empStmt = $this->db->query(
                "SELECT id, employee_code, full_name, hourly_rate FROM employees WHERE employee_code = ?",
                [$data['employeeId']]
            );
            $employee = $empStmt->fetch();
            if (!$employee) {
                throw new Exception("Employee not found");
            }
            
            // Get attendance records for the period
            $attStmt = $this->db->query(
                "SELECT 
                    SUM(hours_worked) as total_regular_hours,
                    SUM(overtime_hours) as total_overtime_hours,
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days
                 FROM attendance_records 
                 WHERE employee_id = ? AND record_date BETWEEN ? AND ?",
                [$employee['id'], $data['startDate'], $data['endDate']]
            );
            $attendance = $attStmt->fetch();
            
            $regularHours = floatval($attendance['total_regular_hours'] ?? 0);
            $overtimeHours = floatval($attendance['total_overtime_hours'] ?? 0);
            $hourlyRate = floatval($employee['hourly_rate']);
            $overtimeRate = floatval(getSystemSetting('overtime_rate_multiplier', 1.5));
            
            // Calculate pay
            $regularPay = $regularHours * $hourlyRate;
            $overtimePay = $overtimeHours * $hourlyRate * $overtimeRate;
            $grossPay = $regularPay + $overtimePay;
            
            // Calculate deductions
            $taxRate = floatval(getSystemSetting('tax_rate', 0.20));
            $sssRate = floatval(getSystemSetting('sss_rate', 0.045));
            $philhealthRate = floatval(getSystemSetting('philhealth_rate', 0.025));
            $pagibigRate = floatval(getSystemSetting('pagibig_rate', 0.02));
            
            $taxAmount = $grossPay * $taxRate;
            $sssContribution = $grossPay * $sssRate;
            $philhealthContribution = $grossPay * $philhealthRate;
            $pagibigContribution = $grossPay * $pagibigRate;
            $otherDeductions = floatval($data['otherDeductions'] ?? 0);
            
            $totalDeductions = $taxAmount + $sssContribution + $philhealthContribution + $pagibigContribution + $otherDeductions;
            $netPay = $grossPay - $totalDeductions;
            
            // Create payroll record if not just calculating
            if (!empty($data['save']) && $data['save'] === true) {
                // Check for existing record
                $existingStmt = $this->db->query(
                    "SELECT id FROM payroll_records WHERE employee_id = ? AND pay_period_start = ? AND pay_period_end = ?",
                    [$employee['id'], $data['startDate'], $data['endDate']]
                );
                if ($existingStmt->fetch()) {
                    throw new Exception("Payroll record already exists for this period");
                }
                
                // Insert payroll record
                $insertSql = "INSERT INTO payroll_records (
                    employee_id, pay_period_start, pay_period_end, regular_hours, overtime_hours,
                    regular_pay, overtime_pay, gross_pay, tax_amount, sss_contribution,
                    philhealth_contribution, pagibig_contribution, other_deductions, net_pay,
                    status, calculated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'calculated', ?)";
                
                $insertParams = [
                    $employee['id'], $data['startDate'], $data['endDate'], $regularHours, $overtimeHours,
                    $regularPay, $overtimePay, $grossPay, $taxAmount, $sssContribution,
                    $philhealthContribution, $pagibigContribution, $otherDeductions, $netPay,
                    getCurrentUser()['sub'] ?? null
                ];
                
                $this->db->query($insertSql, $insertParams);
                $payrollId = $this->db->lastInsertId();
                
                // Log audit
                logAudit(getCurrentUser()['sub'] ?? null, 'CALCULATE_PAYROLL', 'payroll_records', $payrollId, null, $data);
            }
            
            return [
                'employeeId' => $employee['employee_code'],
                'employeeName' => $employee['full_name'],
                'periodStart' => $data['startDate'],
                'periodEnd' => $data['endDate'],
                'hourlyRate' => $hourlyRate,
                'regularHours' => $regularHours,
                'overtimeHours' => $overtimeHours,
                'regularPay' => round($regularPay, 2),
                'overtimePay' => round($overtimePay, 2),
                'grossPay' => round($grossPay, 2),
                'deductions' => [
                    'tax' => round($taxAmount, 2),
                    'sss' => round($sssContribution, 2),
                    'philhealth' => round($philhealthContribution, 2),
                    'pagibig' => round($pagibigContribution, 2),
                    'other' => round($otherDeductions, 2),
                    'total' => round($totalDeductions, 2)
                ],
                'netPay' => round($netPay, 2),
                'daysWorked' => intval($attendance['total_days'] ?? 0),
                'daysLate' => intval($attendance['late_days'] ?? 0),
                'currency' => 'PHP',
                'currencySymbol' => '₱',
                'calculatedAt' => date('c'),
                'calculatedBy' => getCurrentUser()['fullName'] ?? 'System'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Payroll calculation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Approve payroll record
     */
    public function approvePayroll($payrollId) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['role'], ['admin', 'manager'])) {
                throw new Exception("Unauthorized: Admin or Manager access required");
            }
            
            $payrollId = str_replace('pay_', '', $payrollId);
            
            // Get current record
            $stmt = $this->db->query("SELECT * FROM payroll_records WHERE id = ?", [$payrollId]);
            $record = $stmt->fetch();
            if (!$record) {
                throw new Exception("Payroll record not found");
            }
            
            if ($record['status'] !== 'calculated') {
                throw new Exception("Only calculated payroll records can be approved");
            }
            
            // Update status
            $this->db->query(
                "UPDATE payroll_records SET status = 'approved', approved_by = (SELECT id FROM employees WHERE employee_code = ?) WHERE id = ?",
                [$currentUser['sub'], $payrollId]
            );
            
            // Log audit
            logAudit($currentUser['sub'], 'APPROVE_PAYROLL', 'payroll_records', $payrollId, null, ['approved_by' => $currentUser['sub']]);
            
            return [
                'success' => true,
                'message' => 'Payroll approved successfully'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Payroll approval failed: " . $e->getMessage());
        }
    }
    
    /**
     * Process payment (mark as paid)
     */
    public function processPayment($payrollId) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || $currentUser['role'] !== 'admin') {
                throw new Exception("Unauthorized: Admin access required");
            }
            
            $payrollId = str_replace('pay_', '', $payrollId);
            
            // Get current record
            $stmt = $this->db->query("SELECT * FROM payroll_records WHERE id = ?", [$payrollId]);
            $record = $stmt->fetch();
            if (!$record) {
                throw new Exception("Payroll record not found");
            }
            
            if ($record['status'] !== 'approved') {
                throw new Exception("Only approved payroll records can be paid");
            }
            
            // Update status and pay date
            $this->db->query(
                "UPDATE payroll_records SET status = 'paid', pay_date = CURDATE() WHERE id = ?",
                [$payrollId]
            );
            
            // Log audit
            logAudit($currentUser['sub'], 'PROCESS_PAYMENT', 'payroll_records', $payrollId, null, ['paid_by' => $currentUser['sub']]);
            
            return [
                'success' => true,
                'message' => 'Payment processed successfully'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Payment processing failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get payroll history
     */
    public function getPayrollHistory($filters = []) {
        // Use the same method as getPayrollData for now
        return $this->getPayrollData($filters);
    }
    
    /**
     * Get next payday information
     */
    public function getNextPayday() {
        try {
            $frequency = getSystemSetting('payroll_frequency', 'biweekly');
            
            $today = new DateTime();
            $nextPayday = clone $today;
            $lastPayday = clone $today;
            
            switch ($frequency) {
                case 'weekly':
                    // Weekly on Friday
                    $dayToFriday = (5 - $nextPayday->format('N') + 7) % 7; // 5 is Friday in ISO-8601
                    if ($dayToFriday == 0) $dayToFriday = 7; // If today is Friday, next Friday
                    $nextPayday->modify("+{$dayToFriday} days");
                    $lastPayday->modify('-7 days');
                    break;
                    
                case 'biweekly':
                    // Biweekly - 15th and last day of month
                    $currentDay = (int)$nextPayday->format('j');
                    $lastDayOfMonth = (int)$nextPayday->format('t');
                    
                    if ($currentDay < 15) {
                        $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), 15);
                    } else if ($currentDay < $lastDayOfMonth) {
                        $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), $lastDayOfMonth);
                    } else {
                        // Move to 15th of next month
                        $nextPayday->modify('first day of next month');
                        $nextPayday->setDate($nextPayday->format('Y'), $nextPayday->format('n'), 15);
                    }
                    
                    // Calculate last payday
                    if ($currentDay <= 15) {
                        $lastPayday->modify('last day of last month');
                    } else {
                        $lastPayday->setDate($lastPayday->format('Y'), $lastPayday->format('n'), 15);
                    }
                    break;
                    
                case 'monthly':
                    // Monthly on the last day of month
                    $nextPayday->modify('last day of next month');
                    $lastPayday->modify('last day of last month');
                    break;
                    
                default:
                    // Default to biweekly
                    $nextPayday->modify('+14 days');
                    $lastPayday->modify('-14 days');
            }
            
            // Calculate remaining time
            $interval = $today->diff($nextPayday);
            $daysRemaining = $interval->days;
            $hoursRemaining = ($daysRemaining * 24) + $interval->h;
            
            return [
                'success' => true,
                'data' => [
                    'nextPayday' => $nextPayday->format('Y-m-d'),
                    'frequency' => $frequency,
                    'daysRemaining' => $daysRemaining,
                    'hoursRemaining' => $hoursRemaining,
                    'lastPayday' => $lastPayday->format('Y-m-d'),
                    'today' => $today->format('Y-m-d')
                ]
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to calculate next payday: " . $e->getMessage());
        }
    }
    
    /**
     * Get payroll summary/statistics
     */
    public function getPayrollSummary($filters = []) {
        try {
            $year = $filters['year'] ?? date('Y');
            $month = $filters['month'] ?? null;
            
            $sql = "SELECT 
                        COUNT(*) as total_records,
                        COUNT(DISTINCT employee_id) as employees_paid,
                        SUM(gross_pay) as total_gross_pay,
                        SUM(net_pay) as total_net_pay,
                        SUM(tax_amount) as total_tax,
                        SUM(regular_hours) as total_regular_hours,
                        SUM(overtime_hours) as total_overtime_hours,
                        AVG(gross_pay) as avg_gross_pay,
                        AVG(net_pay) as avg_net_pay
                    FROM payroll_records pr
                    WHERE YEAR(pr.pay_period_start) = ?";
            $params = [$year];
            
            if ($month) {
                $sql .= " AND MONTH(pr.pay_period_start) = ?";
                $params[] = $month;
            }
            
            $stmt = $this->db->query($sql, $params);
            $summary = $stmt->fetch();
            
            // Get status breakdown
            $statusSql = "SELECT status, COUNT(*) as count FROM payroll_records 
                         WHERE YEAR(pay_period_start) = ?";
            $statusParams = [$year];
            
            if ($month) {
                $statusSql .= " AND MONTH(pay_period_start) = ?";
                $statusParams[] = $month;
            }
            
            $statusSql .= " GROUP BY status";
            $statusStmt = $this->db->query($statusSql, $statusParams);
            $statusBreakdown = $statusStmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            return [
                'period' => $month ? "$year-$month" : $year,
                'totalRecords' => intval($summary['total_records']),
                'employeesPaid' => intval($summary['employees_paid']),
                'totalGrossPay' => round(floatval($summary['total_gross_pay']), 2),
                'totalNetPay' => round(floatval($summary['total_net_pay']), 2),
                'totalTax' => round(floatval($summary['total_tax']), 2),
                'totalRegularHours' => round(floatval($summary['total_regular_hours']), 2),
                'totalOvertimeHours' => round(floatval($summary['total_overtime_hours']), 2),
                'averageGrossPay' => round(floatval($summary['avg_gross_pay']), 2),
                'averageNetPay' => round(floatval($summary['avg_net_pay']), 2),
                'statusBreakdown' => [
                    'calculated' => intval($statusBreakdown['calculated'] ?? 0),
                    'approved' => intval($statusBreakdown['approved'] ?? 0),
                    'paid' => intval($statusBreakdown['paid'] ?? 0),
                    'cancelled' => intval($statusBreakdown['cancelled'] ?? 0)
                ],
                'currency' => 'PHP',
                'currencySymbol' => '₱'
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get payroll summary: " . $e->getMessage());
        }
    }
    
    /**
     * Bulk calculate payroll for all employees
     */
    public function bulkCalculatePayroll($data) {
        try {
            $currentUser = getCurrentUser();
            if (!$currentUser || !in_array($currentUser['role'], ['admin', 'manager'])) {
                throw new Exception("Unauthorized: Admin or Manager access required");
            }
            
            $required = ['startDate', 'endDate'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }
            
            // Get all active employees
            $empStmt = $this->db->query("SELECT employee_code FROM employees WHERE status = 'active'");
            $employees = $empStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $results = [];
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($employees as $employeeCode) {
                try {
                    $payrollData = [
                        'employeeId' => $employeeCode,
                        'startDate' => $data['startDate'],
                        'endDate' => $data['endDate'],
                        'save' => true
                    ];
                    
                    $result = $this->calculatePayroll($payrollData);
                    $results[] = [
                        'employeeId' => $employeeCode,
                        'success' => true,
                        'data' => $result
                    ];
                    $successCount++;
                } catch (Exception $e) {
                    $results[] = [
                        'employeeId' => $employeeCode,
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                    $errorCount++;
                }
            }
            
            // Log bulk operation
            logAudit($currentUser['sub'], 'BULK_CALCULATE_PAYROLL', null, null, null, [
                'period' => $data['startDate'] . ' to ' . $data['endDate'],
                'employees_processed' => count($employees),
                'success_count' => $successCount,
                'error_count' => $errorCount
            ]);
            
            return [
                'success' => true,
                'message' => "Bulk payroll calculation completed: $successCount successful, $errorCount failed",
                'summary' => [
                    'total' => count($employees),
                    'successful' => $successCount,
                    'failed' => $errorCount
                ],
                'results' => $results
            ];
            
        } catch (Exception $e) {
            throw new Exception("Bulk payroll calculation failed: " . $e->getMessage());
        }
    }
}
