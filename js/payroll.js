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
        this.employees = [];
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
    async init() {
        try {
            await this.loadInitialData();
            
            // Only setup DOM-dependent features if we're in a browser with DOM elements
            if (typeof document !== 'undefined') {
                this.setupEventListeners();
                this.setupDataSyncListeners();
                this.renderPayrollOverview();
                this.renderEmployeeWages();
                this.renderOvertimeRequests();
                this.renderPayrollHistory();
                this.renderDepartmentCosts();
                
                // Listen for overtime request submissions from employee dashboard
                window.addEventListener('overtimeRequestSubmitted', () => {
                    console.log('[PAYROLL] Overtime request submitted - refreshing overtime requests');
                    this.renderOvertimeRequests();
                });
            }
            
            this.isInitialized = true;
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
     * Load initial data from unified employee manager
     */
    async loadInitialData() {
        try {
            // ONLY use unified employee manager - no fallbacks allowed
            if (!window.unifiedEmployeeManager || !window.unifiedEmployeeManager.initialized) {
                throw new Error('Unified employee manager not available or not initialized. Cannot load payroll data.');
            }

            console.log('[PAYROLL] Loading data from Unified Employee Manager (EXCLUSIVE MODE)');
            
            // Load data from the unified employee manager ONLY
            this.employees = window.unifiedEmployeeManager.getEmployees();
            
            // Load overtime requests from localStorage as fallback for now
            const storedRequests = localStorage.getItem('bricks_overtime_requests');
            if (storedRequests) {
                this.overtimeRequests = JSON.parse(storedRequests);
            } else {
                this.overtimeRequests = this.generateSampleOvertimeRequests();
            }
            
            // Load payroll history from localStorage
            const storedHistory = localStorage.getItem('bricks_payroll_history');
            this.payrollHistory = storedHistory ? JSON.parse(storedHistory) : [];
            
            // Load settings from localStorage or use defaults
            const storedSettings = localStorage.getItem('bricks_settings');
            this.settings = storedSettings ? JSON.parse(storedSettings) : this.getDefaultSettings();
            
            // Log employee source information for debugging
            console.log('[PAYROLL] Loaded employees from Unified Employee Manager:', {
                count: this.employees.length,
                source: 'unifiedEmployeeManager',
                employees: this.employees.map(emp => ({ id: emp.id, name: emp.name, department: emp.department }))
            });
            
            // Set up listeners for unified employee manager changes
            if (window.unifiedEmployeeManager.addEventListener) {
                window.unifiedEmployeeManager.addEventListener('employeeUpdate', (data) => {
                    console.log('[PAYROLL] Employee updated in unified manager, refreshing payroll data');
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    this.refreshPayrollDisplay();
                });
                
                window.unifiedEmployeeManager.addEventListener('employeeAdded', (data) => {
                    console.log('[PAYROLL] Employee added in unified manager, refreshing payroll data');
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    this.refreshPayrollDisplay();
                });
                
                window.unifiedEmployeeManager.addEventListener('employeeDeleted', (data) => {
                    console.log('[PAYROLL] Employee deleted in unified manager, refreshing payroll data');
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    this.refreshPayrollDisplay();
                });
                
                window.unifiedEmployeeManager.addEventListener('attendanceUpdate', (data) => {
                    console.log('[PAYROLL] Attendance updated in unified manager, refreshing payroll calculations');
                    this.refreshPayrollDisplay();
                });
            }
            
            console.log(`[PAYROLL] Loaded ${this.employees.length} employees from Unified Employee Manager`);
            
            // Ensure we have sample overtime requests for testing if none exist
            if (this.overtimeRequests.length === 0) {
                console.log('No overtime requests found, generating sample data');
                this.overtimeRequests = this.generateSampleOvertimeRequests();
                localStorage.setItem('bricks_overtime_requests', JSON.stringify(this.overtimeRequests));
            }

            // Calculate current payroll data
            await this.calculateCurrentPayrollData();
            
            // If no employees were loaded, show a warning
            if (this.employees.length === 0) {
                console.warn('No employees loaded for payroll calculation');
                this.showError('No employees found. Please add employees to calculate payroll.');
            }
        } catch (error) {
            console.error('Error loading payroll data:', error);
            throw error;
        }
    }

    /**
     * Calculate current payroll data for all employees
     */
    async calculateCurrentPayrollData() {
        const currentDate = new Date();
        const payPeriodStart = this.getPayPeriodStart(currentDate);
        const payPeriodEnd = this.getPayPeriodEnd(payPeriodStart);

        this.payrollData = {
            payPeriodStart,
            payPeriodEnd,
            employees: []
        };

        for (const employee of this.employees) {
            try {
                let calculation;
                
                // Use unified employee manager's calculation if available
                if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.calculatePayroll) {
                    try {
                        calculation = await window.unifiedEmployeeManager.calculatePayroll(
                            employee.id,
                            payPeriodStart.toISOString().split('T')[0],
                            payPeriodEnd.toISOString().split('T')[0]
                        );
                    } catch (error) {
                        console.warn(`UnifiedEmployeeManager payroll calculation failed for employee ${employee.id}, using fallback`);
                        calculation = this.calculatePayrollFallback(employee, payPeriodStart, payPeriodEnd);
                    }
                } else {
                    // Use fallback calculation method
                    calculation = this.calculatePayrollFallback(employee, payPeriodStart, payPeriodEnd);
                }
                
                this.payrollData.employees.push({
                    ...employee,
                    payroll: calculation
                });
            } catch (error) {
                console.error(`Error calculating payroll for employee ${employee.id}:`, error);
            }
        }
    }

    /**
     * Fallback payroll calculation method
     */
    calculatePayrollFallback(employee, payPeriodStart, payPeriodEnd) {
        // Get hourly rate from unified employee data structure
        const hourlyRate = employee.hourlyRate || 25.00;
        
        // For demonstration, calculate basic payroll
        // In a real system, this would fetch attendance data and calculate actual hours
        const standardHours = 80; // 2 weeks * 40 hours
        const overtimeHours = 0; // Would be calculated from actual attendance
        
        const regularPay = standardHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * this.OVERTIME_MULTIPLIER;
        const grossPay = regularPay + overtimePay;
        const taxes = grossPay * this.TAX_RATE;
        const netPay = grossPay - taxes;
        
        // Handle different name property variations
        const employeeName = employee.fullName || 
                            employee.name || 
                            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                            'Unknown Employee';
        
        return {
            employeeId: employee.id,
            employeeName: employeeName,
            regularHours: standardHours,
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
                const requestId = e.target.dataset.requestId;
                this.approveOvertimeRequest(requestId);
            } else if (e.target.matches('.deny-overtime-btn')) {
                const requestId = e.target.dataset.requestId;
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
            </div>
        `;
    }

    /**
     * Render employee wages tile
     */
    renderEmployeeWages() {
        const container = document.querySelector('.employee-wages-tile .tile-content');
        if (!container) return;

        const wagesHTML = this.employees.map(employee => {
            const payrollData = this.payrollData?.employees.find(emp => emp.id === employee.id);
            
            // Handle different name property variations
            const employeeName = employee.fullName || 
                               employee.name || 
                               `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                               'Unknown Employee';
            
            return `
                <div class="wage-item" data-employee-id="${employee.id}">
                    <div class="employee-info">
                        <div class="employee-name">${employeeName}</div>
                        <div class="employee-role">${employee.position || 'N/A'} - ${employee.department || 'N/A'}</div>
                    </div>
                    <div class="wage-details">
                        <div class="hourly-rate">${this.formatCurrency(employee.hourlyRate || 0)}/hr</div>
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

        container.innerHTML = `
            <div class="overtime-header">
                <h3>Overtime Requests</h3>
                <div class="overtime-summary">
                    <span class="pending-count">${pendingRequests.length} pending</span>
                </div>
            </div>
            
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
        `;
    }

    /**
     * Render individual overtime request
     */
    renderOvertimeRequest(request, isPending) {
        const employee = this.employees.find(emp => emp.id === request.employeeId);
        
        // Handle different name property variations
        let employeeName = 'Unknown Employee';
        if (employee) {
            employeeName = employee.fullName || 
                          employee.name || 
                          `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                          'Unknown Employee';
        } else if (request.employeeName) {
            employeeName = request.employeeName;
        }
        
        const statusClass = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'denied': 'status-denied'
        }[request.status] || '';

        // Handle different hour property names
        const hours = request.hoursRequested || request.hours || 0;

        // Format employee ID properly
        const formattedEmployeeId = request.employeeId ? 
            (typeof request.employeeId === 'string' && request.employeeId.startsWith('emp_') ? 
                request.employeeId : 
                `emp_${String(request.employeeId).padStart(3, '0')}`) : 
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
                        <span class="request-date">${this.formatDate(request.date)}</span>
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
                            Submitted: ${this.formatDateTime(request.submittedAt)}
                        </small>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>
                    ${request.approvedDate ? `
                        <div class="approval-date">
                            ${this.formatDate(request.approvedDate)}
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
        const employee = this.employees.find(emp => emp.id === record.employeeId);
        
        // Handle different name property variations
        let employeeName = 'Unknown Employee';
        if (employee) {
            employeeName = employee.fullName || 
                          employee.name || 
                          `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                          'Unknown Employee';
        } else if (record.employeeName) {
            employeeName = record.employeeName;
        }

        return `
            <div class="history-item" data-record-id="${record.id}">
                <div class="history-info">
                    <div class="employee-name">${employeeName}</div>
                    <div class="pay-period">
                        ${this.formatDate(record.payPeriodStart)} - ${this.formatDate(record.payPeriodEnd)}
                    </div>
                </div>
                <div class="history-details">
                    <div class="hours-worked">
                        <span class="regular-hours">${record.regularHours || 0}h regular</span>
                        ${(record.overtimeHours || 0) > 0 ? `
                            <span class="overtime-hours">${record.overtimeHours}h overtime</span>
                        ` : ''}
                    </div>
                    <div class="pay-amounts">
                        <div class="gross-pay">${this.formatCurrency(record.grossPay || 0)} gross</div>
                        <div class="net-pay">${this.formatCurrency(record.netPay || 0)} net</div>
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
                    name: e.fullName || e.name 
                })));
                this.showError(`Employee not found (ID: ${employeeId})`);
                return;
            }

            // Handle different name property variations
            const employeeName = employee.fullName || 
                               employee.name || 
                               `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 
                               'Unknown Employee';

            console.log('[WAGE EDIT] Creating modal for employee:', { id: employeeId, name: employeeName, currentRate: employee.hourlyRate });

            const modalId = manager.create({
                title: `Edit Wage - ${employeeName}`,
                form: {
                    fields: [
                        {
                            type: 'number',
                            name: 'hourlyRate',
                            label: 'Hourly Rate (₱)',
                            value: employee.hourlyRate || 25.00,
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
     * Update employee wage
     */
    async updateEmployeeWage(employeeId, newRate, notes) {
        try {
            console.log(`Updating wage for employee ${employeeId} to ₱${newRate}`);
            
            // Priority 1: Use Unified Employee Manager if available
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.initialized) {
                console.log('[DATA INTEGRITY] Using Unified Employee Manager to update wage');
                
                // Use the correct updateEmployee method with the wage data
                const updatedEmployee = window.unifiedEmployeeManager.updateEmployee(employeeId, { 
                    hourlyRate: parseFloat(newRate),
                    updatedAt: new Date().toISOString()
                });
                
                console.log('[DATA INTEGRITY] Employee wage updated via UnifiedEmployeeManager:', updatedEmployee);
                
                // Update local employee data to reflect the change
                this.employees = window.unifiedEmployeeManager.getEmployees();
            }
            // Fallback: Update local data only if unified manager is not available
            else {
                console.warn('UnifiedEmployeeManager not available, updating wage in local data only (no persistent storage)');
                const employee = this.employees.find(emp => {
                    // Handle different ID types (string vs number)
                    return emp.id === employeeId || 
                           parseInt(emp.id) === employeeId ||
                           String(emp.id) === String(employeeId);
                });
                
                if (employee) {
                    employee.hourlyRate = newRate;
                    employee.updatedAt = new Date().toISOString();
                    console.log(`Updated employee ${employee.fullName || employee.name} wage to ₱${newRate}`);
                } else {
                    console.error(`Employee with ID ${employeeId} not found for wage update`);
                    throw new Error(`Employee not found: ${employeeId}`);
                }
            }

            // Recalculate payroll data with updated wage
            await this.calculateCurrentPayrollData();
            
            // Re-render affected components
            this.renderPayrollOverview();
            this.renderEmployeeWages();

            // Log the change if notes provided
            if (notes) {
                console.log(`Wage change note for employee ${employeeId}: ${notes}`);
                // TODO: Store wage change history with notes if needed
            }
            
            console.log('Wage update completed successfully');
        } catch (error) {
            console.error('Error updating employee wage:', error);
            console.error('Error details:', {
                employeeId: employeeId,
                newRate: newRate,
                notes: notes,
                unifiedManagerAvailable: !!window.unifiedEmployeeManager,
                unifiedManagerInitialized: window.unifiedEmployeeManager?.initialized
            });
            throw error;
        }
    }

    /**
     * Approve overtime request
     */
    async approveOvertimeRequest(requestId) {
        try {
            const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : { id: 1 };
            
            // Use UnifiedEmployeeManager for overtime request approval if available
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.updateOvertimeRequestStatus) {
                await window.unifiedEmployeeManager.updateOvertimeRequestStatus(requestId, 'approved', 'Approved by admin');
            } else {
                console.warn('UnifiedEmployeeManager overtime methods not available, updating locally');
            }
            
            // Update local data - use string comparison for requestId
            const request = this.overtimeRequests.find(req => String(req.id) === String(requestId));
            if (request) {
                request.status = 'approved';
                request.approvedBy = user.id;
                request.approvedDate = new Date().toISOString().split('T')[0];
                
                // Save updated overtime requests to localStorage
                try {
                    localStorage.setItem('bricks_overtime_requests', JSON.stringify(this.overtimeRequests));
                } catch (e) {
                    console.warn('Failed to save overtime requests to localStorage:', e);
                }
            } else {
                console.error(`Overtime request with ID ${requestId} not found`);
                throw new Error(`Overtime request not found: ${requestId}`);
            }

            this.renderOvertimeRequests();
            this.showSuccess('Overtime request approved');
        } catch (error) {
            console.error('Error approving overtime request:', error);
            this.showError('Failed to approve overtime request');
        }
    }

    /**
     * Show deny overtime modal
     */
    showDenyOvertimeModal(requestId) {
        const request = this.overtimeRequests.find(req => req.id === requestId);
        if (!request) return;

        const employee = this.employees.find(emp => emp.id === request.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

        modalManager.create({
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
     * Deny overtime request
     */
    async denyOvertimeRequest(requestId, reason) {
        try {
            const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : { id: 1 };
            
            // Use UnifiedEmployeeManager for overtime request denial if available
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.updateOvertimeRequestStatus) {
                await window.unifiedEmployeeManager.updateOvertimeRequestStatus(requestId, 'denied', reason || 'Denied by admin');
            } else {
                console.warn('UnifiedEmployeeManager overtime methods not available, updating locally');
            }
            
            // Update local data - use string comparison for requestId
            const request = this.overtimeRequests.find(req => String(req.id) === String(requestId));
            if (request) {
                request.status = 'denied';
                request.approvedBy = user.id;
                request.approvedDate = new Date().toISOString().split('T')[0];
                request.notes = reason;
                
                // Save updated overtime requests to localStorage
                try {
                    localStorage.setItem('bricks_overtime_requests', JSON.stringify(this.overtimeRequests));
                } catch (e) {
                    console.warn('Failed to save overtime requests to localStorage:', e);
                }
            } else {
                console.error(`Overtime request with ID ${requestId} not found`);
                throw new Error(`Overtime request not found: ${requestId}`);
            }

            this.renderOvertimeRequests();
        } catch (error) {
            console.error('Error denying overtime request:', error);
            throw error;
        }
    }

    /**
     * Show process payroll modal
     */
    showProcessPayrollModal() {
        if (!this.payrollData || this.payrollData.employees.length === 0) {
            this.showError('No payroll data to process');
            return;
        }

        const totalGrossPay = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.grossPay || 0), 0
        );
        
        const totalNetPay = this.payrollData.employees.reduce((sum, emp) => 
            sum + (emp.payroll?.netPay || 0), 0
        );

        modalManager.create({
            title: 'Process Payroll',
            content: `
                <div class="process-payroll-summary">
                    <h4>Pay Period: ${this.formatDate(this.payrollData.payPeriodStart)} - ${this.formatDate(this.payrollData.payPeriodEnd)}</h4>
                    
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
                            <span class="value">${this.payrollData.employees.length}</span>
                        </div>
                    </div>
                    
                    <div class="process-warning">
                        <p><strong>Warning:</strong> Processing payroll will finalize all calculations for this pay period. This action cannot be undone.</p>
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
            onConfirm: async () => {
                try {
                    await this.processPayroll();
                    this.showSuccess('Payroll processed successfully');
                    return true;
                } catch (error) {
                    this.showError('Failed to process payroll');
                    return false;
                }
            }
        });
    }

    /**
     * Process payroll for current period
     */
    async processPayroll() {
        try {
            const payrollRecords = this.payrollData.employees.map(emp => ({
                employeeId: emp.id,
                payPeriodStart: this.payrollData.payPeriodStart.toISOString().split('T')[0],
                payPeriodEnd: this.payrollData.payPeriodEnd.toISOString().split('T')[0],
                ...emp.payroll,
                processedDate: new Date().toISOString().split('T')[0],
                status: 'processed'
            }));

            // Process each payroll record using UnifiedEmployeeManager
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.processPayroll) {
                for (const record of payrollRecords) {
                    await window.unifiedEmployeeManager.processPayroll(record);
                }
            } else {
                // Fallback: Add to payroll history directly
                console.warn('UnifiedEmployeeManager processPayroll not available, adding to history manually');
                for (const record of payrollRecords) {
                    this.payrollHistory.unshift(record);
                }
                
                // Save to localStorage if available
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem('bricks_payroll_history', JSON.stringify(this.payrollHistory.slice(0, 100)));
                    } catch (e) {
                        console.warn('Failed to save payroll history to localStorage:', e);
                    }
                }
            }

            // Refresh data
            await this.refreshData();
        } catch (error) {
            console.error('Error processing payroll:', error);
            throw error;
        }
    }

    /**
     * Export payroll data
     */
    exportPayrollData() {
        if (!this.payrollData) {
            this.showError('No payroll data to export');
            return;
        }

        const csvData = this.generatePayrollCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll_${this.formatDate(this.payrollData.payPeriodStart)}_${this.formatDate(this.payrollData.payPeriodEnd)}.csv`;
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
            'Pay Period Start',
            'Pay Period End',
            'Regular Hours',
            'Overtime Hours',
            'Hourly Rate',
            'Regular Pay',
            'Overtime Pay',
            'Gross Pay',
            'Taxes',
            'Deductions',
            'Net Pay'
        ];

        const rows = this.payrollData.employees.map(emp => [
            emp.id,
            `${emp.firstName} ${emp.lastName}`,
            this.formatDate(this.payrollData.payPeriodStart),
            this.formatDate(this.payrollData.payPeriodEnd),
            emp.payroll?.regularHours || 0,
            emp.payroll?.overtimeHours || 0,
            emp.hourlyRate,
            emp.payroll?.regularPay || 0,
            emp.payroll?.overtimePay || 0,
            emp.payroll?.grossPay || 0,
            emp.payroll?.taxes || 0,
            emp.payroll?.deductions || 0,
            emp.payroll?.netPay || 0
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
                    // Load all history from UnifiedEmployeeManager
                    if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.getPayrollHistory) {
                        this.payrollHistory = window.unifiedEmployeeManager.getPayrollHistory();
                    } else {
                        console.warn('UnifiedEmployeeManager not available for payroll history');
                        this.payrollHistory = this.payrollHistory || [];
                    }
                    this.renderPayrollHistory();
                    return;
            }

            // Load payroll history for selected period from UnifiedEmployeeManager
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.getPayrollHistory) {
                this.payrollHistory = window.unifiedEmployeeManager.getPayrollHistory(
                    null,
                    startDate ? startDate.toISOString().split('T')[0] : null,
                    endDate ? endDate.toISOString().split('T')[0] : null
                );
            } else {
                // Fallback: filter existing history
                console.warn('UnifiedEmployeeManager not available, using existing payroll history');
                if (startDate && endDate) {
                    const startStr = startDate.toISOString().split('T')[0];
                    const endStr = endDate.toISOString().split('T')[0];
                    this.payrollHistory = this.payrollHistory.filter(record => 
                        record.payPeriodStart >= startStr && record.payPeriodEnd <= endStr
                    );
                }
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
            this.renderDepartmentCosts();
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
                this.renderDepartmentCosts();
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
        
        const totalWages = this.employees.reduce((sum, emp) => sum + emp.hourlyRate, 0);
        return totalWages / this.employees.length;
    }

    /**
     * Get pay period start date (bi-weekly, starting on Monday)
     */
    getPayPeriodStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        d.setDate(diff);
        
        // Find the bi-weekly period start
        const epochStart = new Date('2024-01-01'); // Reference start date
        const daysDiff = Math.floor((d - epochStart) / (1000 * 60 * 60 * 24));
        const periodNumber = Math.floor(daysDiff / 14);
        
        const periodStart = new Date(epochStart);
        periodStart.setDate(periodStart.getDate() + (periodNumber * 14));
        
        return periodStart;
    }

    /**
     * Get pay period end date
     */
    getPayPeriodEnd(startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13); // 14 days total (0-13)
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
        // This would integrate with a notification system
        console.log('Success:', message);
        
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message
     */
    showError(message) {
        // This would integrate with a notification system
        console.error('Error:', message);
        
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
     * Set up data sync listeners for unified employee manager
     */
    setupDataSyncListeners() {
        // Setup unified employee manager listeners ONLY
        if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.addEventListener) {
            console.log('Setting up Unified Employee Manager listeners for payroll auto-sync');
            
            // Listen for employee changes
            window.unifiedEmployeeManager.addEventListener('employeeUpdate', async (data) => {
                console.log('Employee data changed, refreshing payroll data');
                try {
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    await this.calculateCurrentPayrollData();
                    this.refreshPayrollDisplay();
                } catch (error) {
                    console.error('Error refreshing payroll data after employee change:', error);
                }
            });

            // Listen for employee deletions
            window.unifiedEmployeeManager.addEventListener('employeeDeleted', async (data) => {
                console.log('Employee deleted, refreshing payroll data');
                try {
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    await this.calculateCurrentPayrollData();
                    this.refreshPayrollDisplay();
                } catch (error) {
                    console.error('Error refreshing payroll data after employee deletion:', error);
                }
            });

            // Listen for employee additions
            window.unifiedEmployeeManager.addEventListener('employeeAdded', async (data) => {
                console.log('Employee added, refreshing payroll data');
                try {
                    this.employees = window.unifiedEmployeeManager.getEmployees();
                    await this.calculateCurrentPayrollData();
                    this.refreshPayrollDisplay();
                } catch (error) {
                    console.error('Error refreshing payroll data after employee addition:', error);
                }
            });

            // Listen for attendance updates (affects payroll calculations)
            window.unifiedEmployeeManager.addEventListener('attendanceUpdate', async (data) => {
                console.log('Attendance data changed, refreshing payroll calculations');
                try {
                    await this.calculateCurrentPayrollData();
                    this.refreshPayrollDisplay();
                } catch (error) {
                    console.error('Error refreshing payroll data after attendance change:', error);
                }
            });

            console.log('Unified Employee Manager payroll sync listeners configured');
        } else {
            console.warn('Unified Employee Manager not available for payroll sync listeners');
        }
    }

    /**
     * Generate sample overtime requests for testing
     */
    /**
     * Generate sample overtime requests for testing
     */
    generateSampleOvertimeRequests() {
        if (!this.employees || this.employees.length === 0) {
            return [];
        }

        const requests = [];
        const currentDate = new Date();
        
        // Create 2-3 sample overtime requests
        for (let i = 0; i < Math.min(3, this.employees.length); i++) {
            const employee = this.employees[i];
            const requestDate = new Date(currentDate);
            requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 7));
            
            requests.push({
                id: Date.now() + i,
                employeeId: employee.id,
                employeeName: employee.name || employee.fullName || `Employee ${employee.id}`,
                date: requestDate.toISOString().split('T')[0],
                hours: Math.floor(Math.random() * 4) + 2, // 2-5 hours
                reason: ['Project deadline', 'Emergency maintenance', 'Client meeting'][Math.floor(Math.random() * 3)],
                status: ['pending', 'pending', 'approved'][Math.floor(Math.random() * 3)],
                requestDate: requestDate.toISOString().split('T')[0],
                approvedBy: null,
                approvedDate: null
            });
        }
        
        // Save to localStorage for persistence
        try {
            localStorage.setItem('bricks_overtime_requests', JSON.stringify(requests));
        } catch (e) {
            console.warn('Failed to save overtime requests to localStorage:', e);
        }
        
        return requests;
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
        console.log('Calculating department costs using unified employee manager...');
        
        // Try to get employees from unified employee manager first
        let employees = [];
        if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.getEmployees) {
            employees = window.unifiedEmployeeManager.getEmployees();
            console.log('Using employees from unified manager:', employees.length);
        } else if (this.employees && this.employees.length > 0) {
            employees = this.employees;
            console.log('Using fallback employees:', employees.length);
        } else {
            console.warn('No employees available for department cost calculation');
            return {};
        }
        
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

    /**
     * Render department costs tile (sample)
     */
    renderDepartmentCosts() {
        console.log('Rendering department costs...');
        
        const container = document.querySelector('.department-costs');
        if (!container) {
            console.warn('Department costs container not found (.department-costs)');
            return;
        }
        
        const costs = this.calculateDepartmentCosts();
        const departments = Object.keys(costs);
        
        console.log('Department costs data:', { costs, departments });
        
        if (departments.length === 0) {
            container.innerHTML = `
                <div class="no-dept-costs">
                    <p>No department cost data available.</p>
                    <p style="font-size: 0.9em; color: #666;">
                        Ensure employees have department information and payroll data exists.
                    </p>
                </div>
            `;
            return;
        }
        
        // Calculate total for percentage calculation
        const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
        
        container.innerHTML = `
            <div class="dept-costs-header">
                <h3>Department Costs (Current Pay Period)</h3>
                <p style="font-size: 0.9em; color: #666; margin: 5px 0 15px 0;">
                    Total: ${this.formatCurrency(totalCosts)} across ${departments.length} departments
                </p>
            </div>
            <div class="dept-costs-list">
                ${departments.map(dept => {
                    const cost = costs[dept];
                    const percentage = totalCosts > 0 ? ((cost / totalCosts) * 100).toFixed(1) : 0;
                    return `
                        <div class="dept-cost-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                            <span class="dept-name" style="font-weight: 500;">${dept}</span>
                            <div style="text-align: right;">
                                <span class="dept-cost" style="font-weight: bold; color: #28a745;">${this.formatCurrency(cost)}</span>
                                <div style="font-size: 0.8em; color: #666;">${percentage}%</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        console.log('Department costs rendered successfully');
    }

    /**
     * Generate sample department cost data for testing
     */
    generateSampleDepartmentCosts() {
        // Use current employees and payrollData
        if (!this.employees || this.employees.length === 0) return {};
        // Simulate payrollData if not present
        if (!this.payrollData || !this.payrollData.employees) {
            this.payrollData = { employees: this.employees.map(emp => ({
                ...emp,
                payroll: {
                    grossPay: Math.floor(Math.random() * 20000) + 10000
                }
            })) };
        }
        return this.calculateDepartmentCosts();
    }

    /**
     * Initialize sample data for testing department costs
     */
    initializeSampleData() {
        console.log('Initializing sample data for department costs...');
        
        // Generate sample employees if none exist
        if (!this.employees || this.employees.length === 0) {
            this.employees = [
                { 
                    id: 'EMP001', 
                    name: 'John Smith', 
                    department: 'Engineering',
                    baseSalary: 75000
                },
                { 
                    id: 'EMP002', 
                    name: 'Sarah Johnson', 
                    department: 'Marketing',
                    baseSalary: 65000
                },
                { 
                    id: 'EMP003', 
                    name: 'Mike Davis', 
                    department: 'Engineering',
                    baseSalary: 80000
                },
                { 
                    id: 'EMP004', 
                    name: 'Lisa Wilson', 
                    department: 'Sales',
                    baseSalary: 70000
                },
                { 
                    id: 'EMP005', 
                    name: 'David Brown', 
                    department: 'HR',
                    baseSalary: 60000
                },
                { 
                    id: 'EMP006', 
                    name: 'Emily Taylor', 
                    department: 'Marketing',
                    baseSalary: 55000
                }
            ];
        }

        // Generate sample payroll data
        this.payrollData = {
            employees: this.employees.map(emp => ({
                ...emp,
                payroll: {
                    grossPay: emp.baseSalary / 26, // Bi-weekly pay
                    overtimePay: Math.floor(Math.random() * 500),
                    totalPay: (emp.baseSalary / 26) + Math.floor(Math.random() * 500)
                }
            }))
        };

        console.log('Sample data initialized:', {
            employeeCount: this.employees.length,
            payrollDataCount: this.payrollData.employees.length
        });
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