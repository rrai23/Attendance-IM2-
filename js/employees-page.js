/**
 * Employees Page Management Module for Bricks Attendance System
 * Uses Unified Employee Manager for consistent data across the system
 */

class EmployeesPageManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.departments = [];
        this.currentEmployee = null;
        this.currentViewEmployee = null;
        this.currentDeleteEmployee = null;
        this.unifiedManager = null;
        
        // Don't auto-initialize - will be called manually
    }

    async init() {
        try {
            // Wait for unified manager to be ready
            await this.waitForUnifiedManager();
            await this.loadEmployees();
            this.setupEventListeners();
            this.updateStats();
            this.renderTable();
            this.populateFilters();
            this.setupDataSyncListeners();
        } catch (error) {
            console.error('Failed to initialize employees page:', error);
            this.showError('Failed to load page data');
        }
    }

    async waitForUnifiedManager() {
        const maxWait = 5000; // 5 seconds
        const interval = 100; // Check every 100ms
        let waited = 0;
        
        // Priority 1: Use UnifiedEmployeeManager for consistency with payroll
        while (!window.unifiedEmployeeManager?.initialized && waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, interval));
            waited += interval;
        }
        
        if (window.unifiedEmployeeManager?.initialized) {
            console.log('Using UnifiedEmployeeManager for employees page (consistent with payroll)');
            this.unifiedManager = window.unifiedEmployeeManager;
            return;
        }
        
        // Fallback to data service if UnifiedEmployeeManager not available
        if (window.dataService?.initialized) {
            console.warn('UnifiedEmployeeManager not available, falling back to data service');
            this.unifiedManager = window.dataService;
            return;
        }
        
        throw new Error('No unified data manager available');
    }

    async loadEmployees() {
        try {
            console.log('Loading employees from unified manager...');
            
            // Handle different manager types
            if (this.unifiedManager === window.unifiedEmployeeManager) {
                // Using UnifiedEmployeeManager - synchronous methods
                this.employees = this.unifiedManager.getEmployees();
                this.filteredEmployees = [...this.employees];
                
                // Get departments from employee data
                const departmentSet = new Set(this.employees.map(emp => emp.department).filter(Boolean));
                this.departments = Array.from(departmentSet);
                
                console.log('[DATA INTEGRITY] Employees page using UnifiedEmployeeManager data:', {
                    count: this.employees.length,
                    source: 'UnifiedEmployeeManager',
                    employees: this.employees.map(emp => ({ 
                        id: emp.id, 
                        name: emp.fullName || emp.name,
                        department: emp.department 
                    }))
                });
            } else {
                // Using data service - async methods
                this.employees = await this.unifiedManager.getEmployees();
                this.filteredEmployees = [...this.employees];
                
                if (this.unifiedManager.getDepartments) {
                    this.departments = await this.unifiedManager.getDepartments();
                } else {
                    const departmentSet = new Set(this.employees.map(emp => emp.department).filter(Boolean));
                    this.departments = Array.from(departmentSet);
                }
                
                console.log('[DATA INTEGRITY] Employees page using data service:', {
                    count: this.employees.length,
                    source: 'dataService',
                    employees: this.employees.map(emp => ({ 
                        id: emp.id, 
                        name: emp.fullName || emp.name,
                        department: emp.department 
                    }))
                });
            }
            
            console.log('Loaded employees:', this.employees.length);
            console.log('Departments:', this.departments);
            
        } catch (error) {
            console.error('Failed to load employees:', error);
            this.showError('Failed to load employee data');
            // Set empty arrays as fallback
            this.employees = [];
            this.filteredEmployees = [];
            this.departments = [];
        }
    }

    updateStats() {
        const total = this.employees.length;
        const active = this.employees.filter(emp => emp.status === 'active').length;
        const totalDepartments = this.departments.length;
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const newThisMonth = this.employees.filter(emp => new Date(emp.hireDate) >= firstDayOfMonth).length;

        document.getElementById('totalEmployees').textContent = total;
        document.getElementById('activeEmployees').textContent = active;
        document.getElementById('totalDepartments').textContent = totalDepartments;
        document.getElementById('newThisMonth').textContent = newThisMonth;
    }

    populateFilters() {
        // Populate department filter
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            // Clear existing options except the first one (All Departments)
            const firstOption = departmentFilter.firstElementChild;
            departmentFilter.innerHTML = '';
            if (firstOption) departmentFilter.appendChild(firstOption);
            
            this.departments.forEach(dept => {
                const option = new Option(dept, dept);
                departmentFilter.appendChild(option);
            });
        }

        // Populate manager dropdown in modal
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            // Clear existing options except the first one (Select Manager)
            const firstOption = managerSelect.firstElementChild;
            managerSelect.innerHTML = '';
            if (firstOption) managerSelect.appendChild(firstOption);
            
            const managers = this.employees.filter(emp => emp.role === 'manager' || emp.role === 'admin');
            managers.forEach(manager => {
                const option = new Option(`${manager.firstName} ${manager.lastName}`, `${manager.firstName} ${manager.lastName}`);
                managerSelect.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('addFirstEmployeeBtn')?.addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('employeeModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'employeeModal') {
                this.closeModal();
            }
        });

        // Form submission
        const form = document.getElementById('employeeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEmployee();
            });
        }

        // Auto-calculate salary based on hourly rate
        const hourlyRateInput = document.getElementById('hourlyRate');
        const salaryTypeSelect = document.getElementById('salaryType');
        const salaryInput = document.getElementById('salary');

        const calculateSalary = () => {
            const hourlyRate = parseFloat(hourlyRateInput?.value) || 0;
            const salaryType = salaryTypeSelect?.value || 'hourly';
            
            if (salaryType === 'hourly' && hourlyRate > 0) {
                // Calculate annual salary: hourlyRate * 40 hours/week * 52 weeks/year
                const annualSalary = hourlyRate * 40 * 52;
                if (salaryInput) {
                    salaryInput.value = Math.round(annualSalary);
                    salaryInput.placeholder = 'Auto-calculated from hourly rate';
                }
            } else if (salaryType === 'salary') {
                if (salaryInput) {
                    salaryInput.placeholder = 'Enter fixed annual salary';
                }
            }
        };

        if (hourlyRateInput) {
            hourlyRateInput.addEventListener('input', calculateSalary);
        }
        
        if (salaryTypeSelect) {
            salaryTypeSelect.addEventListener('change', calculateSalary);
        }

        // Filter changes
        document.getElementById('departmentFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('roleFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('searchInput')?.addEventListener('input', () => {
            this.applyFilters();
        });

        // Quick actions
        document.getElementById('quickAddEmployeeBtn')?.addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('quickPayrollBtn')?.addEventListener('click', () => {
            window.location.href = 'payroll.html';
        });

        // Other buttons
        document.getElementById('refreshBtn')?.addEventListener('click', async () => {
            try {
                await this.refreshData();
            } catch (error) {
                console.error('Error refreshing employee data:', error);
                this.showError('Failed to refresh employee data');
            }
        });

        document.getElementById('syncPayrollBtn')?.addEventListener('click', async () => {
            try {
                await this.syncWithPayroll();
            } catch (error) {
                console.error('Error syncing with payroll:', error);
                this.showError('Failed to sync with payroll system');
            }
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.showError('Import functionality will be implemented in the next version.');
        });

        // View modal event listeners
        document.getElementById('closeViewModal')?.addEventListener('click', () => {
            this.closeViewModal();
        });

        document.getElementById('closeViewModalBtn')?.addEventListener('click', () => {
            this.closeViewModal();
        });

        document.getElementById('editFromViewBtn')?.addEventListener('click', () => {
            const employeeId = this.currentViewEmployee?.id;
            this.closeViewModal();
            if (employeeId) {
                const employee = this.employees.find(emp => emp.id === employeeId);
                if (employee) {
                    this.openModal(employee);
                }
            }
        });

        // Delete modal event listeners
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
            await this.confirmDelete();
        });

        // Close modals on overlay click
        document.getElementById('employeeModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });

        document.getElementById('viewEmployeeModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeViewModal();
            }
        });

        document.getElementById('deleteEmployeeModal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeDeleteModal();
            }
        });
    }

    addActionButtonListeners() {
        // Remove existing listeners to prevent duplicates
        const existingButtons = document.querySelectorAll('.action-edit, .action-view, .action-delete');
        existingButtons.forEach(button => {
            button.removeEventListener('click', this.handleActionClick);
        });

        // Add event listeners for action buttons with improved error handling
        document.querySelectorAll('.action-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const rawId = e.currentTarget.dataset.employeeId;
                const employee = this.findEmployeeById(rawId);
                
                if (employee) {
                    console.log('Opening edit modal for employee:', employee.name || employee.fullName);
                    this.openModal(employee);
                } else {
                    console.error('Employee not found for edit action. ID:', rawId, 'Available employees:', this.employees.map(emp => ({id: emp.id, name: emp.name || emp.fullName})));
                    this.showError(`Employee not found (ID: ${rawId})`);
                }
            });
        });

        document.querySelectorAll('.action-view').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const rawId = e.currentTarget.dataset.employeeId;
                const employee = this.findEmployeeById(rawId);
                
                if (employee) {
                    console.log('Opening view modal for employee:', employee.name || employee.fullName);
                    this.openViewModal(employee);
                } else {
                    console.error('Employee not found for view action. ID:', rawId, 'Available employees:', this.employees.map(emp => ({id: emp.id, name: emp.name || emp.fullName})));
                    this.showError(`Employee not found (ID: ${rawId})`);
                }
            });
        });

        document.querySelectorAll('.action-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const rawId = e.currentTarget.dataset.employeeId;
                const employee = this.findEmployeeById(rawId);
                
                if (employee) {
                    console.log('Opening delete modal for employee:', employee.name || employee.fullName);
                    this.openDeleteModal(employee);
                } else {
                    console.error('Employee not found for delete action. ID:', rawId, 'Available employees:', this.employees.map(emp => ({id: emp.id, name: emp.name || emp.fullName})));
                    this.showError(`Employee not found (ID: ${rawId})`);
                }
            });
        });
    }

    /**
     * Find employee by ID with robust type handling
     * @param {string|number} rawId - The employee ID from data attribute or other source
     * @returns {Object|null} - The employee object or null if not found
     */
    findEmployeeById(rawId) {
        if (!rawId || !this.employees || !Array.isArray(this.employees)) {
            console.warn('Invalid parameters for findEmployeeById:', { rawId, employeesCount: this.employees?.length });
            return null;
        }

        // Try multiple lookup strategies to handle type mismatches
        const strategies = [
            // Strategy 1: Direct comparison (handles both string and number)
            (id) => this.employees.find(emp => emp.id == id),
            // Strategy 2: Parse as number and compare
            (id) => {
                const numId = parseInt(id);
                return !isNaN(numId) ? this.employees.find(emp => emp.id === numId) : null;
            },
            // Strategy 3: Convert both to strings and compare
            (id) => this.employees.find(emp => String(emp.id) === String(id)),
            // Strategy 4: Strict equality with original type
            (id) => this.employees.find(emp => emp.id === id)
        ];

        for (let i = 0; i < strategies.length; i++) {
            const result = strategies[i](rawId);
            if (result) {
                console.log(`Employee found using strategy ${i + 1}:`, result.name || result.fullName);
                return result;
            }
        }

        console.warn('Employee not found with any strategy. ID:', rawId, 'Type:', typeof rawId);
        return null;
    }

    applyFilters() {
        const department = document.getElementById('departmentFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const search = document.getElementById('searchInput')?.value.toLowerCase() || '';

        this.filteredEmployees = this.employees.filter(employee => {
            let matches = true;

            if (department && employee.department !== department) {
                matches = false;
            }

            if (status && employee.status !== status) {
                matches = false;
            }

            if (role && employee.role !== role) {
                matches = false;
            }

            if (search) {
                const searchableText = [
                    employee.firstName,
                    employee.lastName,
                    employee.email,
                    employee.employeeCode,
                    employee.department,
                    employee.position
                ].join(' ').toLowerCase();

                if (!searchableText.includes(search)) {
                    matches = false;
                }
            }

            return matches;
        });

        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('employeesTableBody');
        const emptyState = document.getElementById('emptyState');

        if (!tbody) return;

        if (this.filteredEmployees.length === 0) {
            tbody.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }

        emptyState?.classList.add('hidden');

        tbody.innerHTML = this.filteredEmployees.map(employee => `
            <tr>
                <td>
                    <div class="employee-info">
                        <div class="employee-name">${this.getEmployeeName(employee)}</div>
                        <div class="employee-email">${employee.email || 'No email'}</div>
                    </div>
                </td>
                <td>
                    <span class="employee-code">${employee.employeeCode || employee.id || 'N/A'}</span>
                </td>
                <td>${employee.department || 'No department'}</td>
                <td>${employee.position || employee.role || 'No position'}</td>
                <td>${employee.email || 'No email'}</td>
                <td>
                    <span class="status-badge status-${employee.status}">
                        ${this.getStatusIcon(employee.status)} ${this.capitalizeFirst(employee.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline action-edit" data-employee-id="${employee.id}" title="Edit Employee">
                            <span class="btn-icon">✏️</span>
                        </button>
                        <button class="btn btn-sm btn-outline action-view" data-employee-id="${employee.id}" title="View Details">
                            <span class="btn-icon">👁️</span>
                        </button>
                        <button class="btn btn-sm btn-danger action-delete" data-employee-id="${employee.id}" title="Delete Employee">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for action buttons
        this.addActionButtonListeners();
    }

    getStatusIcon(status) {
        const icons = {
            active: '✅',
            inactive: '⏸️',
            suspended: '🚫'
        };
        return icons[status] || '❓';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    openModal(employee = null) {
        const modal = document.getElementById('employeeModal');
        const form = document.getElementById('employeeForm');
        const title = document.getElementById('modalTitle');
        const employeeCodeField = document.getElementById('employeeCode');
        const employeeCodeGroup = employeeCodeField?.closest('.form-group');

        if (!modal || !form || !title) return;

        this.currentEmployee = employee;

        if (employee) {
            title.textContent = 'Edit Employee';
            this.populateForm(employee);
            
            // Show employee code field for editing (but keep it readonly)
            if (employeeCodeGroup) {
                employeeCodeGroup.style.display = 'block';
                employeeCodeField.value = employee.employeeCode || employee.id;
                employeeCodeField.readOnly = true;
            }
        } else {
            title.textContent = 'Add Employee';
            form.reset();
            document.getElementById('employeeId').value = '';
            
            // Hide employee code field for new employees (will be auto-generated)
            if (employeeCodeGroup) {
                employeeCodeGroup.style.display = 'none';
                employeeCodeField.value = 'Auto-generated';
            }
            
            // Set default values
            document.getElementById('hireDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('status').value = 'active';
            document.getElementById('role').value = 'employee';
        }

        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.classList.remove('active');
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        this.currentEmployee = null;
    }

    populateForm(employee) {
        const fields = [
            'employeeId', 'firstName', 'lastName', 'email', 'phone',
            'employeeCode', 'department', 'position', 'manager',
            'hireDate', 'hourlyRate', 'salaryType', 'salary', 'role', 'status'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                if (field === 'employeeId') {
                    element.value = employee.id;
                } else {
                    element.value = employee[field] || '';
                }
            }
        });

        // Populate schedule
        if (employee.schedule) {
            Object.keys(employee.schedule).forEach(day => {
                const daySchedule = employee.schedule[day];
                const activeEl = document.getElementById(`${day}Active`);
                const startEl = document.getElementById(`${day}Start`);
                const endEl = document.getElementById(`${day}End`);

                if (activeEl) activeEl.checked = daySchedule.active;
                if (startEl) startEl.value = daySchedule.start;
                if (endEl) endEl.value = daySchedule.end;
            });
        }
    }

    async saveEmployee() {
        const saveBtn = document.getElementById('saveBtn');
        const btnText = saveBtn?.querySelector('.btn-text');
        const btnLoading = saveBtn?.querySelector('.btn-loading');

        if (!saveBtn) return;

        // Show loading state
        btnText?.classList.add('hidden');
        btnLoading?.classList.remove('hidden');
        saveBtn.disabled = true;

        try {
            const employeeData = this.getFormData();
            
            if (this.currentEmployee) {
                // Update existing employee
                let updatedEmployee;
                if (this.unifiedManager === window.unifiedEmployeeManager) {
                    // Using UnifiedEmployeeManager - direct method call
                    updatedEmployee = this.unifiedManager.updateEmployee(this.currentEmployee.id, employeeData);
                } else {
                    // Using data service - async method call
                    updatedEmployee = await this.unifiedManager.updateEmployee(this.currentEmployee.id, employeeData);
                }
                console.log('[DATA INTEGRITY] Employee updated via', this.unifiedManager === window.unifiedEmployeeManager ? 'UnifiedEmployeeManager' : 'dataService', ':', updatedEmployee);
            } else {
                // For new employees, don't require employee code - it will be auto-generated
                if (!employeeData.employeeCode || employeeData.employeeCode.trim() === '') {
                    employeeData.employeeCode = await this.generateNextEmployeeId();
                }
                
                // Remove ID field to let the service handle it
                delete employeeData.id;
                
                // Add new employee
                let newEmployee;
                if (this.unifiedManager === window.unifiedEmployeeManager) {
                    // Using UnifiedEmployeeManager - direct method call
                    newEmployee = this.unifiedManager.addEmployee(employeeData);
                } else {
                    // Using data service - async method call
                    newEmployee = await this.unifiedManager.addEmployee(employeeData);
                }
                console.log('[DATA INTEGRITY] Employee added via', this.unifiedManager === window.unifiedEmployeeManager ? 'UnifiedEmployeeManager' : 'dataService', ':', newEmployee.employeeCode);
            }

            // Reload data from unified manager
            await this.loadEmployees();
            this.applyFilters();
            this.updateStats();
            this.renderTable();
            this.populateFilters();
            this.closeModal();
            
            this.showSuccess(this.currentEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');

        } catch (error) {
            console.error('Failed to save employee:', error);
            this.showError('Failed to save employee: ' + error.message);
        } finally {
            // Reset button state
            btnText?.classList.remove('hidden');
            btnLoading?.classList.add('hidden');
            saveBtn.disabled = false;
        }
    }

    /**
     * Generate the next available employee ID
     * @returns {Promise<string>} Next employee ID in format emp_001, emp_002, etc.
     */
    async generateNextEmployeeId() {
        try {
            // Get employees from appropriate manager
            let employees;
            if (this.unifiedManager === window.unifiedEmployeeManager) {
                // Using UnifiedEmployeeManager - direct method call
                employees = this.unifiedManager.getEmployees();
            } else {
                // Using data service - async method call
                employees = await this.unifiedManager.getEmployees();
            }
            
            let maxId = 0;
            
            // Find the highest existing employee code number
            employees.forEach(emp => {
                if (emp.employeeCode) {
                    const match = emp.employeeCode.match(/emp_(\d+)/i);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxId) {
                            maxId = num;
                        }
                    }
                }
                
                // Also check numeric IDs as fallback
                if (emp.id && !isNaN(emp.id)) {
                    const num = parseInt(emp.id);
                    if (num > maxId) {
                        maxId = num;
                    }
                }
            });
            
            // Generate next ID with leading zeros
            const nextId = maxId + 1;
            return `emp_${nextId.toString().padStart(3, '0')}`;
            
        } catch (error) {
            console.error('Error generating employee ID:', error);
            // Fallback to timestamp-based ID
            return `emp_${Date.now().toString().slice(-6)}`;
        }
    }

    getFormData() {
        // Validate required fields
        const requiredFields = [
            { id: 'firstName', name: 'First Name' },
            { id: 'lastName', name: 'Last Name' },
            { id: 'email', name: 'Email' },
            { id: 'employeeCode', name: 'Employee ID' },
            { id: 'department', name: 'Department' },
            { id: 'position', name: 'Position' },
            { id: 'hireDate', name: 'Hire Date' },
            { id: 'role', name: 'Role' },
            { id: 'status', name: 'Status' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                throw new Error(`${field.name} is required`);
            }
        }

        // Validate email format
        const email = document.getElementById('email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }

        // Check for duplicate employee code (only for new employees)
        const employeeCode = document.getElementById('employeeCode').value;
        if (!this.currentEmployee) {
            const existingEmployee = this.employees.find(emp => emp.employeeCode === employeeCode);
            if (existingEmployee) {
                throw new Error('Employee ID already exists');
            }
        }

        return {
            // Only include employeeCode if it has a real value (not empty or placeholder)
            employeeCode: (() => {
                const code = document.getElementById('employeeCode')?.value.trim() || '';
                return (code && code !== 'Auto-generated') ? code : '';
            })(),
            firstName: document.getElementById('firstName')?.value.trim() || '',
            lastName: document.getElementById('lastName')?.value.trim() || '',
            email: document.getElementById('email')?.value.trim() || '',
            phone: document.getElementById('phone')?.value.trim() || '',
            department: document.getElementById('department')?.value.trim() || '',
            position: document.getElementById('position')?.value.trim() || '',
            manager: document.getElementById('manager')?.value.trim() || '',
            hireDate: document.getElementById('hireDate')?.value || '',
            hourlyRate: parseFloat(document.getElementById('hourlyRate')?.value) || 15.00,
            salaryType: document.getElementById('salaryType')?.value || 'hourly',
            salary: parseFloat(document.getElementById('salary')?.value) || 0,
            role: document.getElementById('role')?.value || 'employee',
            status: document.getElementById('status')?.value || 'active',
            schedule: this.getScheduleData()
        };
    }

    getScheduleData() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const schedule = {};

        days.forEach(day => {
            const activeEl = document.getElementById(`${day}Active`);
            const startEl = document.getElementById(`${day}Start`);
            const endEl = document.getElementById(`${day}End`);

            schedule[day] = {
                active: activeEl?.checked || false,
                start: startEl?.value || '09:00',
                end: endEl?.value || '17:00'
            };
        });

        return schedule;
    }

    editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id == employeeId);
        if (employee) {
            this.openModal(employee);
        }
    }

    viewEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id == employeeId);
        if (employee) {
            this.openViewModal(employee);
        }
    }

    deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id == employeeId);
        if (employee) {
            this.openDeleteModal(employee);
        }
    }

    openViewModal(employee) {
        const modal = document.getElementById('viewEmployeeModal');
        if (!modal) return;
        
        this.currentViewEmployee = employee;
        
        // Populate view modal data
        this.setElementText('viewEmployeeName', this.getEmployeeName(employee));
        this.setElementText('viewEmployeeCode', employee.employeeCode);
        this.setElementText('viewEmployeeEmail', employee.email);
        this.setElementText('viewEmployeePhone', employee.phone || 'N/A');
        this.setElementText('viewEmployeeDepartment', employee.department);
        this.setElementText('viewEmployeePosition', employee.position);
        this.setElementText('viewEmployeeManager', employee.manager || 'N/A');
        this.setElementText('viewEmployeeHireDate', new Date(employee.hireDate).toLocaleDateString());
        this.setElementText('viewEmployeeHourlyRate', employee.hourlyRate ? `₱${employee.hourlyRate.toFixed(2)}/hr` : 'N/A');
        this.setElementText('viewEmployeeSalaryType', employee.salaryType ? this.capitalizeFirst(employee.salaryType) : 'Hourly');
        this.setElementText('viewEmployeeSalary', employee.salary ? `₱${employee.salary.toLocaleString()}` : 'N/A');
        this.setElementText('viewEmployeeRole', this.capitalizeFirst(employee.role));
        
        const statusElement = document.getElementById('viewEmployeeStatus');
        if (statusElement) {
            statusElement.innerHTML = `<span class="status-badge status-${employee.status}">${this.getStatusIcon(employee.status)} ${this.capitalizeFirst(employee.status)}</span>`;
        }
        
        // Populate schedule
        const scheduleContainer = document.getElementById('viewEmployeeSchedule');
        if (scheduleContainer && employee.schedule) {
            const scheduleHtml = Object.keys(employee.schedule).map(day => {
                const daySchedule = employee.schedule[day];
                if (daySchedule.active) {
                    return `<div class="schedule-item"><strong>${this.capitalizeFirst(day)}:</strong> ${daySchedule.start} - ${daySchedule.end}</div>`;
                }
                return `<div class="schedule-item"><strong>${this.capitalizeFirst(day)}:</strong> Not scheduled</div>`;
            }).join('');
            scheduleContainer.innerHTML = scheduleHtml;
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    openDeleteModal(employee) {
        const modal = document.getElementById('deleteEmployeeModal');
        if (!modal) return;

        this.currentDeleteEmployee = employee;
        this.setElementText('deleteEmployeeName', this.getEmployeeName(employee));
        this.setElementValue('deleteEmployeeId', employee.id);
        
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async confirmDelete() {
        const employeeId = document.getElementById('deleteEmployeeId')?.value;
        if (!employeeId) {
            this.showError('Employee ID not found');
            return;
        }

        try {
            // Delete employee using unified manager
            let deletedEmployee;
            if (this.unifiedManager === window.unifiedEmployeeManager) {
                // Using UnifiedEmployeeManager - direct method call
                deletedEmployee = this.unifiedManager.deleteEmployee(employeeId);
            } else {
                // Using data service - async method call
                deletedEmployee = await this.unifiedManager.deleteEmployee(employeeId);
            }
            
            const employeeName = deletedEmployee.fullName || deletedEmployee.name || 'Employee';
            console.log('[DATA INTEGRITY] Employee deleted via', this.unifiedManager === window.unifiedEmployeeManager ? 'UnifiedEmployeeManager' : 'dataService', ':', employeeName);
            
            // Reload data from unified manager
            await this.loadEmployees();
            this.applyFilters();
            this.updateStats();
            this.renderTable();
            this.populateFilters();
            
            // Close modal and show success
            this.closeDeleteModal();
            this.showSuccess(`${employeeName} has been successfully deleted from the system.`);
            
        } catch (error) {
            console.error('Failed to delete employee:', error);
            this.showError('Failed to delete employee: ' + error.message);
        }
    }

    closeViewModal() {
        const modal = document.getElementById('viewEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentViewEmployee = null;
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentDeleteEmployee = null;
    }

    exportData() {
        try {
            const csvContent = this.generateCSV();
            this.downloadCSV(csvContent, 'employees_export.csv');
            this.showSuccess('Employee data exported successfully!');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data. Please try again.');
        }
    }

    generateCSV() {
        const headers = [
            'Employee ID', 'First Name', 'Last Name', 'Email', 'Phone',
            'Department', 'Position', 'Manager', 'Hire Date', 'Salary', 'Role', 'Status'
        ];

        const rows = this.filteredEmployees.map(emp => [
            emp.employeeCode,
            emp.firstName,
            emp.lastName,
            emp.email,
            emp.phone || '',
            emp.department,
            emp.position,
            emp.manager || '',
            emp.hireDate,
            emp.salary || '',
            emp.role,
            emp.status
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Update employee wage rate
     */
    async updateEmployeeWage(employeeId, newRate, notes = '') {
        try {
            // Update in data service if available
            if (typeof dataService !== 'undefined' && dataService.updateEmployeeWage) {
                await dataService.updateEmployeeWage(employeeId, newRate);
            }
            
            // Update local employee data
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (employee) {
                const oldRate = employee.hourlyRate;
                employee.hourlyRate = newRate;
                employee.salary = newRate * 40 * 52; // Update annual salary calculation
                
                console.log(`Employee ${this.getEmployeeName(employee)} wage updated from ${oldRate} to ${newRate}`);
                if (notes) {
                    console.log(`Wage change reason: ${notes}`);
                }
                
                // Update filtered data if needed
                this.filteredEmployees = this.filteredEmployees.map(emp => 
                    emp.id === employeeId ? { ...emp, hourlyRate: newRate, salary: newRate * 40 * 52 } : emp
                );
                
                // Re-render the table to show updated data
                this.renderTable();
                
                // Notify payroll system if available
                if (typeof window.payrollController !== 'undefined' && window.payrollController.refreshData) {
                    await window.payrollController.refreshData();
                }
                
                this.showToast('Employee wage updated successfully', 'success');
                return true;
            } else {
                throw new Error('Employee not found');
            }
        } catch (error) {
            console.error('Error updating employee wage:', error);
            this.showToast('Failed to update employee wage', 'error');
            throw error;
        }
    }

    /**
     * Sync employee data with payroll system
     */
    async syncWithPayroll() {
        try {
            if (typeof window.payrollController !== 'undefined') {
                // Get latest employee data from data service
                await this.loadEmployees();
                
                // Refresh payroll data to match
                if (window.payrollController.refreshData) {
                    await window.payrollController.refreshData();
                }
                
                this.showToast('Employee data synchronized with payroll', 'success');
            } else {
                console.warn('Payroll controller not available for sync');
            }
        } catch (error) {
            console.error('Error syncing with payroll:', error);
            this.showToast('Failed to sync with payroll system', 'error');
        }
    }

    /**
     * Get employee by ID
     */
    getEmployee(employeeId) {
        return this.employees.find(emp => emp.id === employeeId);
    }

    /**
     * Update employee data
     */
    async updateEmployee(employeeId, updatedData) {
        try {
            // Update in data service if available
            if (typeof dataService !== 'undefined' && dataService.updateEmployee) {
                await dataService.updateEmployee(employeeId, updatedData);
            }
            
            // Update local data
            const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
            if (employeeIndex !== -1) {
                this.employees[employeeIndex] = { ...this.employees[employeeIndex], ...updatedData };
                
                // Update filtered data
                const filteredIndex = this.filteredEmployees.findIndex(emp => emp.id === employeeId);
                if (filteredIndex !== -1) {
                    this.filteredEmployees[filteredIndex] = { ...this.filteredEmployees[filteredIndex], ...updatedData };
                }
                
                // Re-render components
                this.renderTable();
                this.updateStats();
                
                // Sync with payroll if wage-related data changed
                if (updatedData.hourlyRate || updatedData.salary || updatedData.position || updatedData.department) {
                    await this.syncWithPayroll();
                }
                
                return true;
            } else {
                throw new Error('Employee not found');
            }
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    }

    /**
     * Refresh data from data service
     */
    async refreshData() {
        try {
            await this.loadEmployees();
            this.renderTable();
            this.updateStats();
            this.populateFilters();
            this.showToast('Employee data refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing employee data:', error);
            this.showToast('Failed to refresh employee data', 'error');
        }
    }

    /**
     * Export employee data to CSV
     */
    exportToCSV() {
        try {
            const headers = [
                'Employee ID',
                'First Name',
                'Last Name',
                'Email',
                'Phone',
                'Department',
                'Position',
                'Manager',
                'Hire Date',
                'Hourly Rate',
                'Annual Salary',
                'Role',
                'Status'
            ];

            const rows = this.filteredEmployees.map(emp => [
                emp.employeeCode,
                emp.firstName,
                emp.lastName,
                emp.email,
                emp.phone,
                emp.department,
                emp.position,
                emp.manager || '',
                emp.hireDate,
                emp.hourlyRate,
                emp.salary,
                emp.role,
                emp.status
            ]);

            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showToast('Employee data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting employee data:', error);
            this.showToast('Failed to export employee data', 'error');
        }
    }

    /**
     * Set up data service event listeners for auto-sync
     */
    setupDataSyncListeners() {
        if (this.unifiedManager) {
            console.log('[DATA SYNC] Setting up data sync listeners for employees page');
            
            // Handle UnifiedEmployeeManager events
            if (this.unifiedManager === window.unifiedEmployeeManager) {
                console.log('[DATA SYNC] Using UnifiedEmployeeManager events');
                
                // Listen for employee updates
                this.unifiedManager.addEventListener('employeeUpdate', (data) => {
                    console.log('[DATA SYNC] Employee update received:', data);
                    this.refreshData();
                });

                // Listen for employee deletions
                this.unifiedManager.addEventListener('employeeDeleted', (data) => {
                    console.log('[DATA SYNC] Employee deleted:', data);
                    this.refreshData();
                });

                // Listen for employee additions
                this.unifiedManager.addEventListener('employeeAdded', (data) => {
                    console.log('[DATA SYNC] Employee added:', data);
                    this.refreshData();
                });

                // Listen for general data sync events (cross-tab updates)
                this.unifiedManager.addEventListener('dataSync', (data) => {
                    console.log('[DATA SYNC] Data sync event received:', data);
                    if (data && (data.action === 'delete' || data.action === 'add' || data.action === 'update' || data.action === 'forceCleanup')) {
                        this.refreshData();
                    }
                });

                // Listen for system-wide broadcasts
                document.addEventListener('bricksSystemUpdate', (event) => {
                    const { type, data } = event.detail;
                    console.log('[DATA SYNC] System update received:', type, data);
                    if (type.includes('employee') || type.includes('Employee')) {
                        this.refreshData();
                    }
                });
                
            } else {
                // Handle data service events
                console.log('[DATA SYNC] Using data service events');
                
                this.unifiedManager.addEventListener('employeeUpdate', (data) => {
                    console.log('[DATA SYNC] Employee update received from data service:', data);
                    this.refreshData();
                });

                this.unifiedManager.addEventListener('dataSync', (data) => {
                    console.log('[DATA SYNC] Data sync event received from data service:', data);
                    this.refreshData();
                });
            }

            // Listen for attendance updates that might affect employee data
            this.unifiedManager.addEventListener('attendanceUpdate', (data) => {
                console.log('[DATA SYNC] Attendance update received, updating stats');
                this.updateStats();
            });
        }
    }

    // Utility functions
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    setElementValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Add styles if not already present
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    max-width: 400px;
                    animation: toastSlideIn 0.3s ease-out;
                }
                .toast-success { border-left: 4px solid #22c55e; }
                .toast-error { border-left: 4px solid #ef4444; }
                .toast-info { border-left: 4px solid #3b82f6; }
                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                }
                .toast-message {
                    font-size: 0.875rem;
                    color: #374151;
                }
                .toast-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    color: #9ca3af;
                    padding: 0;
                    line-height: 1;
                }
                .toast-close:hover {
                    color: #374151;
                }
                @keyframes toastSlideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes toastSlideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Add to page
        document.body.appendChild(toast);

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'toastSlideOut 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    getEmployeeName(employee) {
        if (employee.fullName) {
            return employee.fullName;
        }
        
        const firstName = employee.firstName || '';
        const lastName = employee.lastName || '';
        
        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        } else if (firstName) {
            return firstName;
        } else if (lastName) {
            return lastName;
        } else if (employee.name) {
            return employee.name;
        } else {
            return `Employee ${employee.id || 'Unknown'}`;
        }
    }
}

// Note: Initialization is handled in employees.html to ensure proper script loading order
// This avoids conflicts between multiple initialization points
