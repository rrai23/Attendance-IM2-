/**
 * Payroll Management Controller
 * Handles payroll overview, wage management, overtime calculations, and payroll history
 */

class PayrollController {
    constructor() {
        this.currentEmployee = null;
        this.payrollData = null;
        this.overtimeRequests = [];
        this.payrollHistory = [];
        this.employees = []; // Active employees for wages table
        this.allEmployees = []; // All employees for payroll history
        this.settings = null;
        this.isInitialized = false;
        
        // Payroll calculation constants
        this.TAX_RATE = 0.20; // 20% tax rate
        this.OVERTIME_MULTIPLIER = 1.5;
        this.STANDARD_WORK_HOURS = 40; // per week
        
        // Initialize asynchronously but don't auto-start
        // Initialization will be controlled by the page
        this.initPromise = null;
    }

    /**
     * Initialize the payroll controller
     */
    async init(progressCallback = null) {
        try {
            console.log('[PAYROLL] Starting initialization...');
            if (progressCallback) progressCallback('Loading employee data...');
            
            await this.loadInitialData();
            
            // Only setup DOM-dependent features if we're in a browser with DOM elements
            if (typeof document !== 'undefined') {
                console.log('[PAYROLL] Setting up DOM event listeners...');
                if (progressCallback) progressCallback('Setting up event listeners...');
                this.setupEventListeners();
                this.setupDataSyncListeners();
                
                console.log('[PAYROLL] Rendering UI components...');
                if (progressCallback) progressCallback('Rendering payroll overview...');
                this.renderPayrollOverview();
                
                if (progressCallback) progressCallback('Rendering employee wages...');
                this.renderEmployeeWages();
                
                if (progressCallback) progressCallback('Rendering overtime requests...');
                this.renderOvertimeRequests();
                
                if (progressCallback) progressCallback('Rendering payroll history...');
                this.renderPayrollHistory();
                
                if (progressCallback) progressCallback('Finalizing interface...');
                
                // Listen for overtime request submissions from employee dashboard
                window.addEventListener('overtimeRequestSubmitted', () => {
                    console.log('[PAYROLL] Overtime request submitted - refreshing overtime requests');
                    this.renderOvertimeRequests();
                });
                
                console.log('[PAYROLL] DOM setup complete');
            }
            
            this.isInitialized = true;
            console.log('[PAYROLL] Initialization successful!');
            console.log('PayrollController initialized successfully');
        } catch (error) {
            console.error('Failed to initialize payroll controller:', error);
            // Don't show error if we're not in a DOM environment
            if (typeof document !== 'undefined' && this.showError) {
                this.showError('Failed to load payroll data');
            }
        }
    }

    /**
     * Load initial data from DirectFlow backend only
     */
    async loadInitialData() {
        try {
            console.log('[PAYROLL] Loading data from DirectFlow backend...');
            
            // Ensure DirectFlow is available and authenticated
            if (!window.directFlow) {
                console.error('[PAYROLL] DirectFlow not available');
                throw new Error('DirectFlow not available');
            }
            
            if (!window.directFlow.isAuthenticated()) {
                console.error('[PAYROLL] DirectFlow not authenticated');
                throw new Error('DirectFlow not authenticated');
            }

            console.log('[PAYROLL] DirectFlow authenticated, loading employees...');

            // Load ACTIVE employees for wages table (only currently hired employees)
            const activeEmployeesResponse = await window.directFlow.getEmployees();
            if (activeEmployeesResponse.success) {
                this.employees = activeEmployeesResponse.data?.employees || [];
                console.log('[PAYROLL] Loaded active employees for wages:', this.employees.length);
                
                // Ensure employees have wage information
                this.employees = this.employees.map(emp => ({
                    ...emp,
                    wage: emp.wage || emp.hourly_rate || 0, // Use 0 if no wage set
                    hourly_rate: emp.hourly_rate || emp.wage || 0 // Use 0 if no wage set
                }));
                
            } else {
                console.error('[PAYROLL] Failed to load active employees:', activeEmployeesResponse.message);
                this.employees = [];
            }

            // Load ALL employees for payroll history (including former employees)
            const allEmployeesResponse = await window.directFlow.getAllEmployeesForPayroll();
            if (allEmployeesResponse.success) {
                this.allEmployees = allEmployeesResponse.data?.employees || [];
                console.log('[PAYROLL] Loaded all employees for payroll history:', this.allEmployees.length);
            } else {
                console.error('[PAYROLL] Failed to load all employees:', allEmployeesResponse.message);
                this.allEmployees = [];
            }

            // Load payroll records from backend
            try {
                console.log('[PAYROLL] Loading payroll history...');
                const payrollResponse = await window.directFlow.makeRequest('/payroll');
                const payrollData = await payrollResponse.json();
                this.payrollHistory = payrollData.data?.records || [];
                console.log('[PAYROLL] Loaded payroll history:', this.payrollHistory.length);
            } catch (error) {
                console.warn('[PAYROLL] Could not load payroll history:', error.message);
                this.payrollHistory = [];
            }

            // Load system settings from DirectFlow (same as dashboard)
            console.log('[PAYROLL] Loading settings from DirectFlow...');
            try {
                const directFlowSettings = await window.directFlow.getSettings();
                this.settings = {
                    payPeriodType: directFlowSettings?.payroll?.payPeriod || 'weekly', // Match dashboard default
                    payDay: directFlowSettings?.payroll?.payday || 'friday',
                    taxRate: directFlowSettings?.payroll?.taxRate || 0.20,
                    overtimeMultiplier: directFlowSettings?.payroll?.overtimeMultiplier || 1.5,
                    standardWorkHours: directFlowSettings?.payroll?.standardWorkHours || 40
                };
                console.log('[PAYROLL] Settings loaded from DirectFlow:', this.settings);
            } catch (error) {
                console.warn('[PAYROLL] Could not load settings from DirectFlow, using defaults:', error.message);
                this.settings = {
                    payPeriodType: 'weekly', // Match dashboard default
                    payDay: 'friday',
                    taxRate: 0.20,
                    overtimeMultiplier: 1.5,
                    standardWorkHours: 40
                };
            }

            // Load overtime requests from backend
            console.log('[PAYROLL] Loading overtime requests...');
            await this.loadOvertimeRequests();

            console.log('[PAYROLL] Initial data loaded successfully from backend');

            // Calculate current payroll data
            console.log('[PAYROLL] Starting payroll calculations...');
            await this.calculateCurrentPayrollData();
            console.log('[PAYROLL] Payroll calculations complete:', this.payrollData);
            
            // Show warning if no employees were loaded
            if (this.employees.length === 0) {
                console.warn('[PAYROLL] No employees loaded from backend');
            }

        } catch (error) {
            console.error('[PAYROLL] Error loading payroll data:', error);
            throw error;
        }
    }

    /**
     * Load overtime requests from DirectFlow backend
     */
    async loadOvertimeRequests() {
        try {
            console.log('[PAYROLL] Loading overtime requests from DirectFlow...');
            
            if (!window.directFlow || !window.directFlow.isAuthenticated()) {
                console.warn('[PAYROLL] DirectFlow not available or not authenticated, skipping overtime requests');
                this.overtimeRequests = [];
                return;
            }

            // Use the /all endpoint to get all overtime requests for payroll management
            console.log('[PAYROLL] Making request to /overtime/all...');
            const response = await window.directFlow.makeRequest('/overtime/all?limit=100');
            
            console.log('[PAYROLL] Overtime API response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[PAYROLL] Unauthorized access to overtime requests - user may not have admin/manager role');
                } else if (response.status === 403) {
                    console.warn('[PAYROLL] Forbidden access to overtime requests - insufficient permissions');
                } else {
                    console.warn('[PAYROLL] Failed to load overtime requests:', response.status, response.statusText);
                }
                
                // Fallback: Try to get just the current user's overtime requests
                console.log('[PAYROLL] Attempting fallback to user\'s own overtime requests...');
                try {
                    const fallbackResponse = await window.directFlow.makeRequest('/overtime?limit=100');
                    if (fallbackResponse.ok) {
                        const fallbackResult = await fallbackResponse.json();
                        if (fallbackResult.success && fallbackResult.data?.requests) {
                            console.log('[PAYROLL] Successfully loaded user\'s own overtime requests as fallback');
                            this.overtimeRequests = fallbackResult.data.requests.map(request => ({
                                id: request.id,
                                employeeId: request.employee_id,
                                employeeName: request.first_name && request.last_name ? 
                                    `${request.first_name} ${request.last_name}` : 
                                    'Unknown Employee',
                                requestDate: request.request_date,
                                hoursRequested: request.hours_requested,
                                reason: request.reason,
                                status: request.status,
                                approvedBy: request.approved_by,
                                approvedAt: request.approved_at,
                                createdAt: request.created_at,
                                department: request.department,
                                position: request.position
                            }));
                            return;
                        }
                    }
                } catch (fallbackError) {
                    console.warn('[PAYROLL] Fallback request also failed:', fallbackError.message);
                }
                
                this.overtimeRequests = [];
                return;
            }

            const result = await response.json();
            console.log('[PAYROLL] Overtime API response:', result);
            
            if (result.success && result.data?.requests) {
                this.overtimeRequests = result.data.requests.map(request => ({
                    id: request.id,
                    employeeId: request.employee_id,
                    employeeName: request.first_name && request.last_name ? 
                        `${request.first_name} ${request.last_name}` : 
                        'Unknown Employee',
                    requestDate: request.request_date,
                    hoursRequested: request.hours_requested,
                    reason: request.reason,
                    status: request.status,
                    approvedBy: request.approved_by,
                    approvedAt: request.approved_at,
                    createdAt: request.created_at,
                    department: request.department,
                    position: request.position
                }));
                
                console.log('[PAYROLL] Successfully loaded overtime requests:', this.overtimeRequests.length);
                console.log('[PAYROLL] Overtime requests data:', this.overtimeRequests);
                console.log('[PAYROLL] Sample request IDs:', this.overtimeRequests.map(r => ({ id: r.id, type: typeof r.id, employeeId: r.employeeId })));
            } else {
                console.warn('[PAYROLL] No overtime requests data in response');
                this.overtimeRequests = [];
            }

        } catch (error) {
            console.error('[PAYROLL] Error loading overtime requests:', error);
            this.overtimeRequests = [];
        }
    }

    /**
     * Calculate current payroll data for all employees using DirectFlow backend
     */
    async calculateCurrentPayrollData() {
        console.log('[PAYROLL] Starting calculateCurrentPayrollData...');
        
        const currentDate = new Date();
        const payPeriodStart = this.getPayPeriodStart(currentDate);
        const payPeriodEnd = this.getPayPeriodEnd(payPeriodStart);

        console.log('[PAYROLL] Pay period:', {
            start: payPeriodStart.toISOString().split('T')[0],
            end: payPeriodEnd.toISOString().split('T')[0]
        });

        this.payrollData = {
            payPeriodStart,
            payPeriodEnd,
            employees: []
        };

        console.log('[PAYROLL] Processing', this.employees.length, 'employees');

        for (const employee of this.employees) {
            try {
                console.log('[PAYROLL] Calculating payroll for employee:', employee.employee_id, employee.full_name);
                
                // Calculate payroll using attendance data from DirectFlow
                const calculation = await this.calculatePayrollFromBackend(employee, payPeriodStart, payPeriodEnd);
                
                console.log('[PAYROLL] Calculation result for', employee.employee_id, ':', calculation);
                
                this.payrollData.employees.push({
                    ...employee,
                    payroll: calculation
                });
            } catch (error) {
                console.error(`[PAYROLL] Error calculating payroll for employee ${employee.employee_id}:`, error);
            }
        }

        console.log('[PAYROLL] Final payroll data:', this.payrollData);
    }

    /**
     * Calculate payroll from backend attendance data
     */
    async calculatePayrollFromBackend(employee, payPeriodStart, payPeriodEnd) {
        try {
            console.log(`[PAYROLL] Calculating payroll for employee:`, {
                id: employee.employee_id,
                name: employee.full_name || `${employee.first_name} ${employee.last_name}`,
                wage: employee.wage,
                period: `${payPeriodStart.toISOString().split('T')[0]} to ${payPeriodEnd.toISOString().split('T')[0]}`
            });
            
            // Get attendance records for the pay period
            const attendanceResponse = await window.directFlow.makeRequest(`/attendance?employee_id=${employee.employee_id}&start_date=${payPeriodStart.toISOString().split('T')[0]}&end_date=${payPeriodEnd.toISOString().split('T')[0]}`);
            const attendanceData = await attendanceResponse.json();

            console.log(`[PAYROLL] Attendance API response for ${employee.employee_id}:`, attendanceData);

            const attendanceRecords = attendanceData.data?.records || attendanceData.data || [];
            console.log(`[PAYROLL] Found ${attendanceRecords.length} attendance records for ${employee.employee_id}`);
            
            if (attendanceRecords.length > 0) {
                console.log(`[PAYROLL] Sample record for ${employee.employee_id}:`, attendanceRecords[0]);
            }
            
            // Calculate total hours from attendance records
            let regularHours = 0;
            let overtimeHours = 0;
            
            for (const record of attendanceRecords) {
                const totalHours = parseFloat(record.total_hours || 0);
                const overtimeHoursRecord = parseFloat(record.overtime_hours || 0);
                
                console.log('[PAYROLL] Record for', employee.employee_id, ':', {
                    date: record.date,
                    total_hours: totalHours,
                    overtime_hours: overtimeHoursRecord
                });
                
                regularHours += (totalHours - overtimeHoursRecord);
                overtimeHours += overtimeHoursRecord;
            }

            // Get hourly rate from employee data
            const hourlyRate = parseFloat(employee.wage || employee.hourly_rate || 15.00);
            
            console.log('[PAYROLL] Calculations for', employee.employee_id, ':', {
                regularHours,
                overtimeHours,
                hourlyRate
            });
            
            // Calculate pay
            const regularPay = regularHours * hourlyRate;
            const overtimePay = overtimeHours * hourlyRate * this.OVERTIME_MULTIPLIER;
            const grossPay = regularPay + overtimePay;
            const taxes = grossPay * this.TAX_RATE;
            const netPay = grossPay - taxes;

            const result = {
                employeeId: employee.employee_id,
                employeeName: employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                hourlyRate: hourlyRate,
                regularPay: regularPay,
                overtimePay: overtimePay,
                grossPay: grossPay,
                taxes: taxes,
                netPay: netPay,
                payPeriodStart: payPeriodStart.toISOString().split('T')[0],
                payPeriodEnd: payPeriodEnd.toISOString().split('T')[0]
            };

            console.log('[PAYROLL] Final calculation for', employee.employee_id, ':', result);
            return result;

        } catch (error) {
            console.warn(`[PAYROLL] Error fetching attendance for ${employee.employee_id}, using fallback calculation:`, error);
            return this.calculatePayrollFallback(employee, payPeriodStart, payPeriodEnd);
        }
    }

    /**
     * Fallback payroll calculation method (when attendance data is unavailable)
     */
    calculatePayrollFallback(employee, payPeriodStart, payPeriodEnd) {
        console.log('[PAYROLL] Using fallback calculation for employee:', employee.employee_id);
        
        // Get hourly rate from employee data with proper column names
        const hourlyRate = parseFloat(employee.wage || employee.hourly_rate || 0);
        
        // If no wage is set, return zero values
        if (hourlyRate === 0) {
            const employeeName = employee.full_name || 
                                `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                                'Unknown Employee';
            
            return {
                employeeId: employee.employee_id,
                employeeName: employeeName,
                regularHours: 0,
                overtimeHours: 0,
                hourlyRate: 0,
                regularPay: 0,
                overtimePay: 0,
                grossPay: 0,
                taxes: 0,
                netPay: 0,
                payPeriodStart: payPeriodStart.toISOString().split('T')[0],
                payPeriodEnd: payPeriodEnd.toISOString().split('T')[0]
            };
        }
        
        // When no attendance data is available, show zero hours (backend-only approach)
        const regularHours = 0;
        const overtimeHours = 0;
        
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * this.OVERTIME_MULTIPLIER;
        const grossPay = regularPay + overtimePay;
        const taxes = grossPay * this.TAX_RATE;
        const netPay = grossPay - taxes;
        
        // Handle employee name with proper column names
        const employeeName = employee.full_name || 
                            `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                            'Unknown Employee';
        
        const result = {
            employeeId: employee.employee_id,
            employeeName: employeeName,
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            hourlyRate: hourlyRate,
            regularPay: regularPay,
            overtimePay: overtimePay,
            grossPay: grossPay,
            taxes: taxes,
            netPay: netPay,
            payPeriodStart: payPeriodStart.toISOString().split('T')[0],
            payPeriodEnd: payPeriodEnd.toISOString().split('T')[0]
        };
        
        console.log('[PAYROLL] Fallback calculation result (no attendance data):', result);
        return result;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('.payroll-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Employee wage edit buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-wage-btn')) {
                console.log('[WAGE EDIT] Edit wage button clicked:', e.target);
                const employeeId = parseInt(e.target.dataset.employeeId);
                console.log('[WAGE EDIT] Employee ID from dataset:', employeeId);
                
                if (isNaN(employeeId)) {
                    console.error('[WAGE EDIT] Invalid employee ID:', e.target.dataset.employeeId);
                    return;
                }
                
                this.showEditWageModal(employeeId);
            }
        });

        // Overtime request action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.approve-overtime-btn')) {
                const requestId = parseInt(e.target.getAttribute('data-request-id'));
                console.log('[PAYROLL] Approve button clicked, requestId:', requestId, 'type:', typeof requestId);
                console.log('[PAYROLL] Button element:', e.target);
                console.log('[PAYROLL] All data attributes:', e.target.dataset);
                
                if (!requestId || isNaN(requestId)) {
                    console.error('[PAYROLL] Invalid request ID found on approve button');
                    this.showError('Invalid request ID');
                    return;
                }
                
                this.approveOvertimeRequest(requestId);
            } else if (e.target.matches('.deny-overtime-btn')) {
                const requestId = parseInt(e.target.getAttribute('data-request-id'));
                console.log('[PAYROLL] Deny button clicked, requestId:', requestId, 'type:', typeof requestId);
                
                if (!requestId || isNaN(requestId)) {
                    console.error('[PAYROLL] Invalid request ID found on deny button');
                    this.showError('Invalid request ID');
                    return;
                }
                
                this.showDenyOvertimeModal(requestId);
            }
        });

        // Process payroll button
        const processBtn = document.querySelector('.process-payroll-btn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.showProcessPayrollModal());
        }

        // Export payroll button
        const exportBtn = document.querySelector('.export-payroll-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPayrollData());
        }

        // Pay period selector
        const payPeriodSelect = document.querySelector('.pay-period-select');
        if (payPeriodSelect) {
            payPeriodSelect.addEventListener('change', (e) => {
                this.handlePayPeriodChange(e.target.value);
            });
        }

        // Quick action buttons
        const quickProcessBtn = document.getElementById('quickProcessPayrollBtn');
        if (quickProcessBtn) {
            quickProcessBtn.addEventListener('click', () => this.showProcessPayrollModal());
        }

        const quickExportBtn = document.getElementById('quickExportBtn');
        if (quickExportBtn) {
            quickExportBtn.addEventListener('click', () => this.exportPayrollData());
        }

        const quickOvertimeBtn = document.getElementById('quickOvertimeBtn');
        if (quickOvertimeBtn) {
            quickOvertimeBtn.addEventListener('click', () => {
                // Scroll to overtime requests section
                const overtimeSection = document.querySelector('.overtime-requests-tile');
                if (overtimeSection) {
                    overtimeSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        const quickWageBtn = document.getElementById('quickWageBtn');
        if (quickWageBtn) {
            quickWageBtn.addEventListener('click', () => {
                // Scroll to employee wages section
                const wageSection = document.querySelector('.employee-wages-tile');
                if (wageSection) {
                    wageSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        const quickEmployeesBtn = document.getElementById('quickEmployeesBtn');
        if (quickEmployeesBtn) {
            quickEmployeesBtn.addEventListener('click', () => {
                // Navigate to employees page
                window.location.href = 'employees.html';
            });
        }
    }

    /**
     * Render payroll overview tile
     */
    renderPayrollOverview() {
        const container = document.querySelector('.payroll-overview-tile .tile-content');
        if (!container || !this.payrollData) return;

        const totalGrossPay = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.grossPay || 0), 0
        );
        
        const totalNetPay = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.netPay || 0), 0
        );
        
        const totalTaxes = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.taxes || 0), 0
        );

        const totalRegularHours = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.regularHours || 0), 0
        );

        const totalOvertimeHours = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.overtimeHours || 0), 0
        );

        container.innerHTML = `
            <div class="payroll-summary">
                <div class="summary-header">
                    <h3>Current Pay Period</h3>
                    <p class="pay-period-dates">
                        ${this.formatDate(this.payrollData.payPeriodStart)} - 
                        ${this.formatDate(this.payrollData.payPeriodEnd)}
                    </p>
                </div>
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-value">${this.formatCurrency(totalGrossPay)}</div>
                        <div class="stat-label">Gross Pay</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.formatCurrency(totalNetPay)}</div>
                        <div class="stat-label">Net Pay</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.formatCurrency(totalTaxes)}</div>
                        <div class="stat-label">Total Taxes</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${totalRegularHours.toFixed(1)}h</div>
                        <div class="stat-label">Regular Hours</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${totalOvertimeHours.toFixed(1)}h</div>
                        <div class="stat-label">Overtime Hours</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.payrollData.employees.length}</div>
                        <div class="stat-label">Employees</div>
                    </div>
                </div>
                
                ${this.payrollData.employees.length === 0 ? `
                    <div class="no-data-message">
                        <p>No employee data available for this pay period.</p>
                        <p>Add employees and attendance records to see payroll calculations.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render employee wages tile
     */
    renderEmployeeWages() {
        const container = document.querySelector('.employee-wages-tile .tile-content');
        if (!container) return;

        if (this.employees.length === 0) {
            container.innerHTML = `
                <div class="wages-header">
                    <h3>Employee Wages</h3>
                </div>
                <div class="no-employees">
                    <p>No employees found in the system.</p>
                    <p>Please add employees to view wage information.</p>
                </div>
            `;
            return;
        }

        const wagesHTML = this.employees.map(employee => {
            const payrollData = this.payrollData?.employees.find(emp => emp.id === employee.id);
            
            // Handle different name property variations - use backend snake_case format
            const employeeName = employee.full_name || 
                               `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                               'Unknown Employee';
            
            return `
                <div class="wage-item" data-employee-id="${employee.id}">
                    <div class="employee-info">
                        <div class="employee-name">${employeeName}</div>
                        <div class="employee-role">${employee.position || 'N/A'} - ${employee.department || 'N/A'}</div>
                    </div>
                    <div class="wage-details">
                        <div class="hourly-rate">${this.formatCurrency(employee.wage || 0)}/hr</div>
                        ${payrollData ? `
                            <div class="period-earnings">
                                ${this.formatCurrency(payrollData.payroll?.grossPay || 0)} this period
                            </div>
                        ` : ''}
                    </div>
                    <div class="wage-actions">
                        <button class="btn btn-sm btn-outline edit-wage-btn" 
                                data-employee-id="${employee.id}">
                            Edit Wage
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="wages-header">
                <h3>Employee Wages</h3>
                <div class="wages-summary">
                    <span>Average Rate: ${this.formatCurrency(this.calculateAverageWage())}/hr</span>
                </div>
            </div>
            <div class="wages-list">
                ${wagesHTML}
            </div>
        `;
    }

    /**
     * Render overtime requests tile
     */
    renderOvertimeRequests() {
        const container = document.querySelector('.overtime-requests-tile .tile-content');
        if (!container) return;

        const pendingRequests = this.overtimeRequests.filter(req => req.status === 'pending');
        const recentRequests = this.overtimeRequests
            .filter(req => req.status !== 'pending')
            .slice(0, 5);

        // Maintain the proper HTML structure with .overtime-content div for scrolling
        container.innerHTML = `
            <div class="overtime-header">
                <h4>Overtime Requests</h4>
                <div class="overtime-summary">
                    <span class="pending-count">${pendingRequests.length} pending</span>
                </div>
            </div>
            
            <div class="overtime-content">
                ${pendingRequests.length > 0 ? `
                    <div class="pending-requests">
                        <h4>Pending Approval</h4>
                        ${pendingRequests.map(request => this.renderOvertimeRequest(request, true)).join('')}
                    </div>
                ` : ''}
                
                ${recentRequests.length > 0 ? `
                    <div class="recent-requests">
                        <h4>Recent Requests</h4>
                        ${recentRequests.map(request => this.renderOvertimeRequest(request, false)).join('')}
                    </div>
                ` : ''}
                
                ${pendingRequests.length === 0 && recentRequests.length === 0 ? `
                    <div class="no-requests">
                        <p>No overtime requests found</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render individual overtime request
     */
    renderOvertimeRequest(request, isPending) {
        const employee = this.employees.find(emp => emp.employee_id === request.employeeId);
        
        // Handle different name property variations - use backend snake_case format
        let employeeName = 'Unknown Employee';
        if (employee) {
            employeeName = employee.full_name || 
                          `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                          'Unknown Employee';
        } else if (request.employeeName) {
            employeeName = request.employeeName;
        }
        
        const statusClass = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'denied': 'status-denied',
            'rejected': 'status-rejected'
        }[request.status] || '';

        // Handle different hour property names
        const hours = request.hoursRequested || request.hours || 0;

        // Format employee ID properly
        const formattedEmployeeId = request.employeeId ? 
            (typeof request.employeeId === 'string' && request.employeeId.startsWith('EMP') ? 
                request.employeeId : 
                `EMP${String(request.employeeId).padStart(6, '0')}`) : 
            'N/A';

        // Format request ID for display
        const displayRequestId = request.id ? 
            (String(request.id).includes('_') ? 
                String(request.id).split('_')[1] || String(request.id) : 
                String(request.id)) : 
            'N/A';

        return `
            <div class="overtime-request ${statusClass}" data-request-id="${request.id}">
                <div class="request-info">
                    <div class="employee-name">
                        <strong>${employeeName}</strong>
                        <div style="display: flex; gap: 12px; margin-top: 4px;">
                            ${request.employeeId ? `<small style="color: var(--text-tertiary);">Employee ID: ${formattedEmployeeId}</small>` : ''}
                            ${request.id ? `<small style="color: var(--text-tertiary);">Request ID: ${displayRequestId}</small>` : ''}
                        </div>
                    </div>
                    <div class="request-details">
                        <span class="request-date">${this.formatDate(request.requestDate)}</span>
                        <span class="request-hours">${hours} hours</span>
                        <span class="request-reason">${this.formatReason(request.reason)}</span>
                    </div>
                    ${request.description ? `
                        <div class="request-description">
                            <small style="color: var(--text-secondary);">${request.description}</small>
                        </div>
                    ` : ''}
                    <div class="request-metadata">
                        <small style="color: var(--text-tertiary);">
                            Submitted: ${this.formatDateTime(request.createdAt)}
                        </small>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>
                    ${request.approvedAt ? `
                        <div class="approval-date">
                            ${this.formatDate(request.approvedAt)}
                        </div>
                    ` : ''}
                </div>
                ${isPending ? `
                    <div class="request-actions">
                        <button class="btn btn-sm btn-success approve-overtime-btn" 
                                data-request-id="${request.id}"
                                title="Approve overtime request">
                            ✓ Approve
                        </button>
                        <button class="btn btn-sm btn-danger deny-overtime-btn" 
                                data-request-id="${request.id}"
                                title="Deny overtime request">
                            ✗ Deny
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Format reason for display
     */
    formatReason(reason) {
        if (!reason) return 'No reason provided';
        return reason.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format date and time for display
     */
    formatDateTime(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Render payroll history tile
     */
    renderPayrollHistory() {
        const container = document.querySelector('.payroll-history-tile .tile-content');
        if (!container) return;

        // Ensure payrollHistory is an array before slicing
        if (!Array.isArray(this.payrollHistory)) {
            console.warn('[PAYROLL] PayrollHistory is not an array:', typeof this.payrollHistory);
            this.payrollHistory = [];
        }

        const recentHistory = this.payrollHistory.slice(0, 10);

        container.innerHTML = `
            <div class="history-header">
                <h3>Payroll History</h3>
                <div class="history-controls">
                    <select class="pay-period-select">
                        <option value="current">Current Period</option>
                        <option value="last">Last Period</option>
                        <option value="last-3">Last 3 Periods</option>
                        <option value="all">All Periods</option>
                    </select>
                </div>
            </div>
            
            <div class="history-list">
                ${recentHistory.length > 0 ? 
                    recentHistory.map(record => this.renderPayrollHistoryItem(record)).join('') :
                    '<div class="no-history"><p>No payroll history found</p></div>'
                }
            </div>
        `;
    }

    /**
     * Render individual payroll history item
     */
    renderPayrollHistoryItem(record) {
        // Backend already includes employee name fields from JOIN
        const employeeName = `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown Employee';

        return `
            <div class="history-item" data-record-id="${record.id}">
                <div class="history-info">
                    <div class="employee-name">${employeeName}</div>
                    <div class="pay-period">
                        ${this.formatDate(record.pay_period_start)} - ${this.formatDate(record.pay_period_end)}
                    </div>
                </div>
                <div class="history-details">
                    <div class="hours-worked">
                        <span class="regular-hours">${record.regular_hours || 0}h regular</span>
                        ${(record.overtime_hours || 0) > 0 ? `
                            <span class="overtime-hours">${record.overtime_hours}h overtime</span>
                        ` : ''}
                    </div>
                    <div class="pay-amounts">
                        <div class="gross-pay">${this.formatCurrency(record.gross_pay || 0)} gross</div>
                        <div class="net-pay">${this.formatCurrency(record.net_pay || 0)} net</div>
                    </div>
                </div>
                <div class="history-status">
                    <span class="status-badge status-${record.status || 'pending'}">${record.status || 'pending'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Show edit wage modal
     */
    async showEditWageModal(employeeId) {
        try {
            console.log('[WAGE EDIT] Attempting to show edit wage modal for employee ID:', employeeId);
            
            // Check if modalManager is available
            if (typeof modalManager === 'undefined' && typeof window.modalManager === 'undefined') {
                console.error('[WAGE EDIT] modalManager is not available');
                this.showError('Modal system not available. Please refresh the page.');
                return;
            }
            
            const manager = typeof modalManager !== 'undefined' ? modalManager : window.modalManager;
            console.log('[WAGE EDIT] Using modalManager:', typeof manager);
            
            const employee = this.employees.find(emp => {
                // Handle different ID types (string vs number)
                return emp.id === employeeId || 
                       parseInt(emp.id) === employeeId ||
                       String(emp.id) === String(employeeId);
            });
            
            if (!employee) {
                console.warn(`[WAGE EDIT] Employee with ID ${employeeId} not found in:`, this.employees.map(e => ({ 
                    id: e.id, 
                    idType: typeof e.id,
                    name: e.full_name || `${e.first_name} ${e.last_name}` 
                })));
                this.showError(`Employee not found (ID: ${employeeId})`);
                return;
            }

            // Handle different name property variations
            const employeeName = employee.full_name || 
                               `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                               'Unknown Employee';

            console.log('[WAGE EDIT] Creating modal for employee:', { id: employeeId, name: employeeName, currentRate: employee.wage });

            const modalId = manager.create({
                title: `Edit Wage - ${employeeName}`,
                form: {
                    fields: [
                        {
                            type: 'number',
                            name: 'hourlyRate',
                            label: 'Hourly Rate (₱)',
                            value: employee.wage || 25.00,
                            required: true,
                            step: '0.01',
                            min: '0'
                        },
                        {
                            type: 'textarea',
                            name: 'notes',
                            label: 'Notes (optional)',
                            placeholder: 'Reason for wage change...',
                            rows: 3
                        }
                    ]
                },
                buttons: [
                    {
                        text: 'Cancel',
                        class: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: 'Update Wage',
                        class: 'btn-primary',
                        action: 'submit'
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        console.log('[WAGE EDIT] Modal submitted with data:', data);
                        await this.updateEmployeeWage(employeeId, parseFloat(data.hourlyRate), data.notes);
                        this.showSuccess('Employee wage updated successfully');
                        return true;
                    } catch (error) {
                        console.error('[WAGE EDIT] Error updating wage:', error);
                        this.showError('Failed to update employee wage: ' + error.message);
                        return false;
                    }
                }
            });
            
            console.log('[WAGE EDIT] Modal created with ID:', modalId);
            
        } catch (error) {
            console.error('[WAGE EDIT] Error showing edit wage modal:', error);
            this.showError('Failed to open wage edit dialog: ' + error.message);
        }
    }

    /**
     * Update employee wage using DirectFlow backend
     */
    async updateEmployeeWage(employeeId, newRate, notes) {
        try {
            console.log(`[PAYROLL] Updating wage for employee ${employeeId} to ₱${newRate}`);
            
            // Update employee wage via DirectFlow backend
            const updateData = {
                wage: parseFloat(newRate)
            };
            
            const updatedEmployee = await window.directFlow.updateEmployee(employeeId, updateData);
            console.log('[PAYROLL] Employee wage updated via DirectFlow:', updatedEmployee);
            
            // Update local employee data to reflect the change (only active employees for wages card)
            const employeesResponse = await window.directFlow.getEmployees();
            if (employeesResponse.success) {
                this.employees = employeesResponse.data?.employees || [];
                console.log('[PAYROLL] Refreshed active employees after wage update');
            }
            
            // Recalculate payroll with new wage
            await this.calculateCurrentPayrollData();
            this.renderPayrollOverview();
            this.renderEmployeeWages();
            
            // Log the change if notes provided
            if (notes) {
                console.log(`[PAYROLL] Wage change note for employee ${employeeId}: ${notes}`);
            }
            
            this.showSuccess(`Employee wage updated to ₱${newRate}/hour successfully`);
            console.log('[PAYROLL] Wage update completed successfully');
            
        } catch (error) {
            console.error('[PAYROLL] Error updating employee wage:', error);
            this.showError(`Failed to update employee wage: ${error.message}`);
            throw error;
        }
    }

    /**
     * Approve overtime request using backend API
     */
    async approveOvertimeRequest(requestId) {
        try {
            console.log(`[PAYROLL] Approving overtime request ${requestId} (type: ${typeof requestId})`);
            console.log(`[PAYROLL] Available overtime requests:`, this.overtimeRequests.map(r => ({ id: r.id, type: typeof r.id })));
            
            if (!requestId) {
                throw new Error('Request ID is required');
            }
            
            // Make API call to approve the request
            const response = await window.directFlow.makeRequest(`/overtime/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'approved',
                    notes: 'Approved by payroll manager'
                })
            });

            console.log(`[PAYROLL] API response status:`, response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`[PAYROLL] API error response:`, errorData);
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('[PAYROLL] Overtime request approved successfully:', result);
                
                // Reload overtime requests to get updated data
                await this.loadOvertimeRequests();
                this.renderOvertimeRequests();
                
                this.showSuccess('Overtime request approved successfully');
            } else {
                throw new Error(result.message || 'Unknown error');
            }

        } catch (error) {
            console.error('[PAYROLL] Error approving overtime request:', error);
            this.showError(`Failed to approve overtime request: ${error.message}`);
        }
    }

    /**
     * Show deny overtime modal
     */
    showDenyOvertimeModal(requestId) {
        const request = this.overtimeRequests.find(req => req.id === requestId);
        if (!request) {
            console.warn('[PAYROLL] Overtime request not found:', requestId);
            console.log('[PAYROLL] Available requests:', this.overtimeRequests.map(r => ({id: r.id, type: typeof r.id})));
            return;
        }

        const employee = this.employees.find(emp => emp.employee_id === request.employeeId);
        const employeeName = employee ? 
            (employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()) : 
            request.employeeName || 'Unknown Employee';

        // Check if modal manager is available
        const manager = window.modalManager;
        if (!manager) {
            console.error('[PAYROLL] Modal manager not available');
            this.showError('Modal system not available. Please refresh the page.');
            return;
        }

        manager.create({
            title: `Deny Overtime Request - ${employeeName}`,
            form: {
                fields: [
                    {
                        type: 'textarea',
                        name: 'reason',
                        label: 'Reason for denial',
                        placeholder: 'Please provide a reason for denying this request...',
                        required: true,
                        rows: 4
                    }
                ]
            },
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: 'Deny Request',
                    class: 'btn-danger',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                try {
                    await this.denyOvertimeRequest(requestId, data.reason);
                    this.showSuccess('Overtime request denied');
                    return true;
                } catch (error) {
                    this.showError('Failed to deny overtime request');
                    return false;
                }
            }
        });
    }

    /**
     * Deny overtime request using backend API
     */
    async denyOvertimeRequest(requestId, reason) {
        try {
            console.log(`[PAYROLL] Denying overtime request ${requestId} with reason: ${reason}`);
            
            // Make API call to reject the request
            const response = await window.directFlow.makeRequest(`/overtime/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'rejected',
                    notes: reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('[PAYROLL] Overtime request denied successfully:', result);
                
                // Reload overtime requests to get updated data
                await this.loadOvertimeRequests();
                this.renderOvertimeRequests();
                
                this.showSuccess('Overtime request denied successfully');
            } else {
                throw new Error(result.message || 'Unknown error');
            }

        } catch (error) {
            console.error('[PAYROLL] Error denying overtime request:', error);
            this.showError(`Failed to deny overtime request: ${error.message}`);
            throw error;
        }
    }

    /**
     * Show process payroll modal
     */
    /**
     * Show process payroll modal with calculated data
     */
    async showProcessPayrollModal() {
        if (!this.employees || this.employees.length === 0) {
            this.showError('No active employees found to process payroll');
            return;
        }

        try {
            // Show loading state
            const loadingModalId = modalManager.create({
                title: 'Processing Payroll',
                content: `
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p>Calculating payroll for ${this.employees.length} employees...</p>
                    </div>
                `,
                buttons: []
            });

            // Calculate current pay period (last 2 weeks)
            const payPeriodEnd = new Date();
            const payPeriodStart = new Date();
            payPeriodStart.setDate(payPeriodEnd.getDate() - 14); // 2 weeks

            // Calculate payroll for all active employees
            const payrollCalculations = [];
            let totalGrossPay = 0;
            let totalNetPay = 0;

            for (const employee of this.employees) {
                try {
                    const calculation = await this.calculatePayrollFromBackend(employee, payPeriodStart, payPeriodEnd);
                    payrollCalculations.push({
                        employee: employee,
                        calculation: calculation
                    });
                    totalGrossPay += calculation.grossPay || 0;
                    totalNetPay += calculation.netPay || 0;
                } catch (error) {
                    console.warn(`[PAYROLL] Failed to calculate payroll for employee ${employee.employee_id}:`, error);
                }
            }

            // Close loading modal
            modalManager.close(loadingModalId);

            // Show process payroll modal with calculated data
            modalManager.create({
                title: 'Process Payroll',
                content: `
                    <div class="process-payroll-summary">
                        <h4>Pay Period: ${this.formatDate(payPeriodStart)} - ${this.formatDate(payPeriodEnd)}</h4>
                        
                        <div class="payroll-totals">
                            <div class="total-item">
                                <span class="label">Total Gross Pay:</span>
                                <span class="value">${this.formatCurrency(totalGrossPay)}</span>
                            </div>
                            <div class="total-item">
                                <span class="label">Total Net Pay:</span>
                                <span class="value">${this.formatCurrency(totalNetPay)}</span>
                            </div>
                            <div class="total-item">
                                <span class="label">Employees:</span>
                                <span class="value">${payrollCalculations.length}</span>
                            </div>
                        </div>

                        <div class="employee-breakdown">
                            <h5>Employee Breakdown:</h5>
                            <div class="employee-list">
                                ${payrollCalculations.map(item => `
                                    <div class="employee-payroll-item">
                                        <span class="employee-name">${item.employee.full_name || `${item.employee.first_name} ${item.employee.last_name}`}</span>
                                        <div class="payroll-details">
                                            <span class="hours">${item.calculation.regularHours || 0}h regular</span>
                                            ${(item.calculation.overtimeHours || 0) > 0 ? `<span class="overtime">${item.calculation.overtimeHours}h overtime</span>` : ''}
                                            <span class="gross">${this.formatCurrency(item.calculation.grossPay || 0)} gross</span>
                                            <span class="net">${this.formatCurrency(item.calculation.netPay || 0)} net</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="confirmation-text">
                            <p><strong>Warning:</strong> This will generate payroll records for all employees. This action cannot be undone.</p>
                        </div>
                    </div>
                `,
                buttons: [
                    {
                        text: 'Cancel',
                        class: 'btn-secondary',
                        action: 'cancel'
                    },
                    {
                        text: 'Process Payroll',
                        class: 'btn-primary',
                        action: 'confirm'
                    }
                ],
                onCancel: (modalId) => {
                    console.log('[PAYROLL] Process payroll cancelled');
                },
                onConfirm: async (modalId) => {
                    console.log('[PAYROLL] Processing payroll confirmed');
                    try {
                        await this.processPayroll(payrollCalculations, payPeriodStart, payPeriodEnd);
                    } catch (error) {
                        console.error('[PAYROLL] Error in onConfirm:', error);
                    }
                }
            });

        } catch (error) {
            console.error('[PAYROLL] Error showing process payroll modal:', error);
            this.showError('Failed to calculate payroll data');
        }
    }

    /**
     * Process payroll for current period
     */
    async processPayroll(payrollCalculations, payPeriodStart, payPeriodEnd) {
        try {
            console.log('[PAYROLL] Processing payroll for period:', { payPeriodStart, payPeriodEnd, employees: payrollCalculations.length });
            
            // Show processing modal
            const processingModalId = modalManager.create({
                title: 'Processing Payroll',
                content: `
                    <div class="processing-container">
                        <div class="spinner"></div>
                        <p>Generating payroll records for ${payrollCalculations.length} employees...</p>
                        <div class="progress-info">
                            <span>This may take a few moments...</span>
                        </div>
                    </div>
                `,
                buttons: []
            });

            // Extract employee IDs from calculations
            const employeeIds = payrollCalculations.map(calc => calc.employee.employee_id);
            
            // Prepare the payload for the backend API
            const payrollPayload = {
                employee_ids: employeeIds,
                pay_period_start: payPeriodStart.toISOString().split('T')[0], // YYYY-MM-DD format
                pay_period_end: payPeriodEnd.toISOString().split('T')[0],
                include_overtime: true,
                include_holidays: true
            };

            console.log('[PAYROLL] Sending payroll generation request:', payrollPayload);

            // Call the backend API to generate payroll records
            const response = await window.directFlow.makeRequest('/payroll/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payrollPayload)
            });

            const result = await response.json();
            
            // Close processing modal
            modalManager.close(processingModalId);

            if (result.success) {
                console.log('[PAYROLL] Payroll generation successful:', result);
                
                const successMessage = `
                    Payroll processed successfully!
                    <br><br>
                    <strong>Results:</strong><br>
                    • ${result.data?.results?.length || 0} records created<br>
                    • ${result.data?.errors?.length || 0} errors<br>
                    • Pay Period: ${payPeriodStart.toLocaleDateString()} - ${payPeriodEnd.toLocaleDateString()}
                `;
                
                this.showSuccess(successMessage);
                
                // Log any errors for debugging
                if (result.data?.errors?.length > 0) {
                    console.warn('[PAYROLL] Some employees had errors:', result.data.errors);
                }
            } else {
                console.error('[PAYROLL] Payroll generation failed:', result);
                this.showError(result.message || 'Failed to process payroll');
            }
            
            // Refresh payroll history to show new records
            await this.refreshData();
            
        } catch (error) {
            console.error('[PAYROLL] Error processing payroll:', error);
            
            // Close any open modals
            try {
                modalManager.close(processingModalId);
            } catch (e) { /* ignore */ }
            
            this.showError('Failed to process payroll: ' + error.message);
            throw error;
        }
    }

    /**
     * Export payroll data
     */
    exportPayrollData() {
        if (!this.employees || this.employees.length === 0) {
            this.showError('No employee data to export');
            return;
        }

        const csvData = this.generatePayrollCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees_payroll_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showSuccess('Payroll data exported successfully');
    }

    /**
     * Generate CSV data for payroll export
     */
    generatePayrollCSV() {
        const headers = [
            'Employee ID',
            'Employee Name',
            'Department',
            'Position',
            'Hourly Rate',
            'Status'
        ];

        const rows = this.employees.map(emp => [
            emp.employee_id || emp.id,
            emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            emp.department || 'N/A',
            emp.position || 'N/A',
            emp.wage || 0,
            emp.status || 'active'
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Handle pay period change
     */
    async handlePayPeriodChange(period) {
        try {
            let startDate, endDate;
            const currentDate = new Date();

            switch (period) {
                case 'current':
                    startDate = this.getPayPeriodStart(currentDate);
                    endDate = this.getPayPeriodEnd(startDate);
                    break;
                case 'last':
                    endDate = this.getPayPeriodStart(currentDate);
                    endDate.setDate(endDate.getDate() - 1);
                    startDate = this.getPayPeriodStart(endDate);
                    endDate = this.getPayPeriodEnd(startDate);
                    break;
                case 'last-3':
                    endDate = this.getPayPeriodStart(currentDate);
                    endDate.setDate(endDate.getDate() - 1);
                    startDate = new Date(endDate);
                    startDate.setDate(startDate.getDate() - (3 * 14)); // 3 bi-weekly periods
                    break;
                case 'all':
                    // Load all history (simplified - no backend endpoint yet)
                    console.log('[PAYROLL] Loading all payroll history locally - consider implementing backend storage');
                    this.payrollHistory = this.payrollHistory || [];
                    this.renderPayrollHistory();
                    return;
            }

            // Load payroll history (simplified - no backend endpoint yet)
            console.log('[PAYROLL] Loading payroll history locally - consider implementing backend storage');
            if (startDate && endDate) {
                const startStr = startDate.toISOString().split('T')[0];
                const endStr = endDate.toISOString().split('T')[0];
                this.payrollHistory = this.payrollHistory.filter(record => 
                    record.payPeriodStart >= startStr && record.payPeriodEnd <= endStr
                );
            }
            
            this.renderPayrollHistory();
        } catch (error) {
            console.error('Error changing pay period:', error);
            this.showError('Failed to load payroll history');
        }
    }

    /**
     * Refresh all payroll data
     */
    async refreshData() {
        try {
            await this.loadInitialData();
            this.renderPayrollOverview();
            this.renderEmployeeWages();
            this.renderOvertimeRequests();
            this.renderPayrollHistory();
            this.showSuccess('Payroll data refreshed');
        } catch (error) {
            console.error('Error refreshing payroll data:', error);
            this.showError('Failed to refresh payroll data');
        }
    }

    /**
     * Refresh payroll display when unified data changes
     */
    refreshPayrollDisplay() {
        if (!this.isInitialized || typeof document === 'undefined') return;
        
        try {
            console.log('Refreshing payroll display with updated employee data');
            this.calculateCurrentPayrollData().then(() => {
                this.renderPayrollOverview();
                this.renderEmployeeWages();
                this.renderOvertimeRequests();
                this.renderPayrollHistory();
            });
        } catch (error) {
            console.error('Error refreshing payroll display:', error);
        }
    }

    /**
     * Calculate average wage across all employees
     */
    calculateAverageWage() {
        if (this.employees.length === 0) return 0;
        
        const totalWages = this.employees.reduce((sum, emp) => 
            sum + (parseFloat(emp.wage || emp.hourly_rate || 0)), 0);
        return totalWages / this.employees.length;
    }

    /**
     * Get pay period start date based on settings (same logic as dashboard)
     */
    getPayPeriodStart(date) {
        const today = new Date(date);
        const payPeriodType = this.settings?.payPeriodType || 'weekly'; // Match dashboard default

        console.log('[PAYROLL] Calculating pay period start for:', { date: today.toISOString().split('T')[0], payPeriodType });

        if (payPeriodType === 'weekly') {
            // For weekly: show current week (Sunday to Saturday) - same as dashboard
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            return startOfWeek;
        } else if (payPeriodType === 'biweekly') {
            // For bi-weekly: show 2-week period
            const startOfPeriod = new Date(today);
            const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
            const biweekPeriod = Math.floor(daysSinceEpoch / 14);
            const periodStart = new Date(biweekPeriod * 14 * 24 * 60 * 60 * 1000);
            return periodStart;
        } else {
            // For monthly: show current month
            const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return periodStart;
        }
    }

    /**
     * Get pay period end date based on settings (same logic as dashboard)
     */
    getPayPeriodEnd(startDate) {
        const payPeriodType = this.settings?.payPeriodType || 'weekly'; // Match dashboard default
        const endDate = new Date(startDate);

        if (payPeriodType === 'weekly') {
            // End of week (Saturday) - same as dashboard
            endDate.setDate(startDate.getDate() + 6);
        } else if (payPeriodType === 'biweekly') {
            // End of bi-weekly period (13 days after start)
            endDate.setDate(startDate.getDate() + 13);
        } else {
            // End of month
            endDate.setMonth(startDate.getMonth() + 1, 0);
        }

        return endDate;
    }

    /**
     * Format currency values
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    /**
     * Format date values
     */
    formatDate(date) {
        if (!date) return '';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(d);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log('[PAYROLL] Success:', message);
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('[PAYROLL] Error:', message);
        this.showNotification(message, 'error');
    }

    /**
     * Show notification in top-right corner
     */
    showNotification(message, type = 'info') {
        // Try to use the global showNotification function if it exists
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback: Create our own notification using the toast container
        let container = document.getElementById('toast-container');
        if (!container) {
            // Create toast container if it doesn't exist
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 3000;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            padding: 0.75rem 1rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            min-width: 300px;
            max-width: 400px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease-out;
            pointer-events: auto;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        `;
        toast.textContent = message;

        // Add to container
        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Destroy controller and cleanup
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('click', this.handleClick);
        
        // Clear any intervals or timeouts
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    /**
     * Set up data sync listeners for DirectFlow system (simplified)
     */
    setupDataSyncListeners() {
        console.log('[PAYROLL] DirectFlow sync - no event listeners needed (backend-only operation)');
        // Note: Consider implementing real-time updates via WebSocket or polling if needed
    }

    /**
     * Get default settings for payroll
     */
    getDefaultSettings() {
        return {
            taxRate: 0.20,
            overtimeMultiplier: 1.5,
            standardWorkHours: 40,
            payPeriod: 'bi-weekly',
            currency: 'PHP',
            notifications: {
                payrollReminders: true,
                overtimeAlerts: true
            }
        };
    }

    /**
     * Calculate department costs for current pay period using unified employee manager
     */
    calculateDepartmentCosts() {
        console.log('[PAYROLL] Calculating department costs using DirectFlow employees...');
        
        // Use employees from DirectFlow system
        let employees = this.employees || [];
        if (employees.length === 0) {
            console.warn('[PAYROLL] No employees available for department cost calculation');
            return {};
        }
        
        console.log(`[PAYROLL] Using ${employees.length} employees for department cost calculation`);
        
        const departmentCosts = {};
        
        for (const emp of employees) {
            const dept = emp.department || 'Unassigned';
            
            // Calculate gross pay for this employee
            let grossPay = 0;
            if (emp.payroll && emp.payroll.grossPay) {
                grossPay = emp.payroll.grossPay;
            } else if (emp.baseSalary) {
                // Calculate bi-weekly pay from annual salary
                grossPay = emp.baseSalary / 26;
            } else if (emp.hourlyRate) {
                // Calculate based on 40 hours per week, 2 weeks
                grossPay = emp.hourlyRate * 80;
            } else {
                // Default calculation
                grossPay = 50000 / 26; // Default salary assumption
            }
            
            if (!departmentCosts[dept]) {
                departmentCosts[dept] = 0;
            }
            departmentCosts[dept] += grossPay;
        }
        
        console.log('Department costs calculated:', departmentCosts);
        return departmentCosts;
    }
}

// Make PayrollController available globally immediately
if (typeof window !== 'undefined') {
    window.PayrollController = PayrollController;
    
    // Create a factory function for reliable instance creation
    window.createPayrollController = function() {
        try {
            const instance = new PayrollController();
            window.payrollController = instance;
            console.log('PayrollController instance created via factory function');
            return instance;
        } catch (error) {
            console.error('Failed to create PayrollController via factory:', error);
            return null;
        }
    };
}

// Initialize payroll controller
let payrollController;

function createPayrollController() {
    try {
        payrollController = new PayrollController();
        // Update global reference
        if (typeof window !== 'undefined') {
            window.payrollController = payrollController;
            console.log('Global payrollController instance created and available');
            
            // Register with global synchronization system
            setTimeout(() => {
                if (window.globalSystemSync && window.globalSystemSync.initialized) {
                    window.globalSystemSync.registerComponent('payrollController', payrollController, {
                        refreshData: 'refreshData',
                        updateEmployeeList: 'loadEmployees',
                        recalculatePayroll: 'calculatePayroll',
                        loadEmployees: 'loadEmployees'
                    });
                    console.log('Payroll controller registered with global sync');
                }
            }, 500);
        }
        return payrollController;
    } catch (error) {
        console.error('Failed to create PayrollController instance:', error);
        return null;
    }
}

// Create instance based on document state
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPayrollController);
    } else {
        createPayrollController();
    }
} else {
    // Create instance even if no DOM (for testing)
    createPayrollController();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PayrollController;
}