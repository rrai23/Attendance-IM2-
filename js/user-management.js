/**
 * User Management Module
 * Handles all user/employee management operations for administrators
 */

class UserManager {
    constructor() {
        this.dataService = window.dataService;
        this.modalManager = window.modalManager;
        this.currentUser = null;
        this.employees = [];
        this.filteredEmployees = [];
        this.sortConfig = { field: 'lastName', direction: 'asc' };
        this.filterConfig = { role: 'all', status: 'all', search: '' };
        
        this.init();
    }

    async init() {
        try {
            await this.loadEmployees();
            this.bindEvents();
        } catch (error) {
            console.error('Failed to initialize user manager:', error);
        }
    }

    async loadEmployees() {
        try {
            this.employees = await this.dataService.getEmployees();
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('Failed to load employees:', error);
            throw error;
        }
    }

    applyFiltersAndSort() {
        let filtered = [...this.employees];

        // Apply filters
        if (this.filterConfig.role !== 'all') {
            filtered = filtered.filter(emp => emp.role === this.filterConfig.role);
        }

        if (this.filterConfig.status !== 'all') {
            filtered = filtered.filter(emp => emp.status === this.filterConfig.status);
        }

        if (this.filterConfig.search) {
            const searchTerm = this.filterConfig.search.toLowerCase();
            filtered = filtered.filter(emp => 
                emp.firstName.toLowerCase().includes(searchTerm) ||
                emp.lastName.toLowerCase().includes(searchTerm) ||
                emp.email.toLowerCase().includes(searchTerm) ||
                emp.employeeId.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aValue = a[this.sortConfig.field];
            const bValue = b[this.sortConfig.field];
            
            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return this.sortConfig.direction === 'asc' ? comparison : -comparison;
            } else {
                const comparison = aValue - bValue;
                return this.sortConfig.direction === 'asc' ? comparison : -comparison;
            }
        });

        this.filteredEmployees = filtered;
    }

    bindEvents() {
        // Add employee button
        const addBtn = document.getElementById('add-employee-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddEmployeeModal());
        }

        // Search input
        const searchInput = document.getElementById('employee-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConfig.search = e.target.value;
                this.applyFiltersAndSort();
                this.renderEmployeeList();
            });
        }

        // Filter dropdowns
        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filterConfig.role = e.target.value;
                this.applyFiltersAndSort();
                this.renderEmployeeList();
            });
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterConfig.status = e.target.value;
                this.applyFiltersAndSort();
                this.renderEmployeeList();
            });
        }

        // Sort headers
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', (e) => {
                const field = e.target.dataset.sort;
                this.handleSort(field);
            });
        });
    }

    handleSort(field) {
        if (this.sortConfig.field === field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }

        this.applyFiltersAndSort();
        this.renderEmployeeList();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        // Remove all sort indicators
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add indicator to current sort field
        const currentHeader = document.querySelector(`[data-sort="${this.sortConfig.field}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${this.sortConfig.direction}`);
        }
    }

    renderEmployeeList() {
        const container = document.getElementById('employee-list');
        if (!container) return;

        if (this.filteredEmployees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No employees found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        const employeeCards = this.filteredEmployees.map(employee => this.createEmployeeCard(employee)).join('');
        container.innerHTML = employeeCards;

        // Bind card events
        this.bindEmployeeCardEvents();
    }

    createEmployeeCard(employee) {
        const statusClass = employee.status === 'active' ? 'status-active' : 'status-inactive';
        const roleClass = employee.role === 'admin' ? 'role-admin' : 'role-employee';

        return `
            <div class="employee-card" data-employee-id="${employee.id}">
                <div class="employee-avatar">
                    <img src="${employee.avatar || '/assets/icons/default-avatar.svg'}" 
                         alt="${employee.firstName} ${employee.lastName}"
                         onerror="this.src='/assets/icons/default-avatar.svg'">
                </div>
                <div class="employee-info">
                    <h4 class="employee-name">${employee.firstName} ${employee.lastName}</h4>
                    <p class="employee-id">ID: ${employee.employeeId}</p>
                    <p class="employee-email">${employee.email}</p>
                    <div class="employee-meta">
                        <span class="employee-role ${roleClass}">${this.formatRole(employee.role)}</span>
                        <span class="employee-status ${statusClass}">${this.formatStatus(employee.status)}</span>
                    </div>
                    <div class="employee-details">
                        <span class="employee-department">${employee.department || 'No Department'}</span>
                        <span class="employee-rate">$${employee.hourlyRate}/hr</span>
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="btn btn-sm btn-secondary" data-action="edit" data-employee-id="${employee.id}">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="reset-password" data-employee-id="${employee.id}">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <circle cx="12" cy="16" r="1"></circle>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Reset
                    </button>
                    <button class="btn btn-sm ${employee.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            data-action="toggle-status" data-employee-id="${employee.id}">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${employee.status === 'active' ? 
                                '<path d="M18 6L6 18M6 6l12 12"></path>' : 
                                '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>'
                            }
                        </svg>
                        ${employee.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-employee-id="${employee.id}">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    bindEmployeeCardEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('[data-action]').dataset.action;
                const employeeId = parseInt(e.target.closest('[data-action]').dataset.employeeId);
                this.handleEmployeeAction(action, employeeId);
            });
        });
    }

    async handleEmployeeAction(action, employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        switch (action) {
            case 'edit':
                this.showEditEmployeeModal(employee);
                break;
            case 'reset-password':
                this.showResetPasswordModal(employee);
                break;
            case 'toggle-status':
                this.toggleEmployeeStatus(employee);
                break;
            case 'delete':
                this.showDeleteEmployeeModal(employee);
                break;
        }
    }

    showAddEmployeeModal() {
        const modalId = this.modalManager.create({
            title: 'Add New Employee',
            form: {
                fields: [
                    {
                        type: 'text',
                        name: 'firstName',
                        label: 'First Name',
                        required: true,
                        placeholder: 'Enter first name'
                    },
                    {
                        type: 'text',
                        name: 'lastName',
                        label: 'Last Name',
                        required: true,
                        placeholder: 'Enter last name'
                    },
                    {
                        type: 'email',
                        name: 'email',
                        label: 'Email Address',
                        required: true,
                        placeholder: 'Enter email address'
                    },
                    {
                        type: 'text',
                        name: 'employeeId',
                        label: 'Employee ID',
                        required: true,
                        placeholder: 'Enter unique employee ID'
                    },
                    {
                        type: 'select',
                        name: 'role',
                        label: 'Role',
                        required: true,
                        options: [
                            { value: 'employee', text: 'Employee' },
                            { value: 'admin', text: 'Administrator' }
                        ]
                    },
                    {
                        type: 'text',
                        name: 'department',
                        label: 'Department',
                        placeholder: 'Enter department'
                    },
                    {
                        type: 'text',
                        name: 'position',
                        label: 'Position',
                        placeholder: 'Enter job position'
                    },
                    {
                        type: 'number',
                        name: 'hourlyRate',
                        label: 'Hourly Rate ($)',
                        required: true,
                        placeholder: '0.00'
                    },
                    {
                        type: 'text',
                        name: 'phone',
                        label: 'Phone Number',
                        placeholder: 'Enter phone number'
                    },
                    {
                        type: 'password',
                        name: 'password',
                        label: 'Initial Password',
                        required: true,
                        placeholder: 'Enter initial password'
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
                    text: 'Create Employee',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                return this.createEmployee(data);
            },
            options: {
                size: 'large'
            }
        });
    }

    showEditEmployeeModal(employee) {
        const modalId = this.modalManager.create({
            title: `Edit Employee: ${employee.firstName} ${employee.lastName}`,
            form: {
                fields: [
                    {
                        type: 'text',
                        name: 'firstName',
                        label: 'First Name',
                        value: employee.firstName,
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'lastName',
                        label: 'Last Name',
                        value: employee.lastName,
                        required: true
                    },
                    {
                        type: 'email',
                        name: 'email',
                        label: 'Email Address',
                        value: employee.email,
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'employeeId',
                        label: 'Employee ID',
                        value: employee.employeeId,
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'role',
                        label: 'Role',
                        value: employee.role,
                        required: true,
                        options: [
                            { value: 'employee', text: 'Employee' },
                            { value: 'admin', text: 'Administrator' }
                        ]
                    },
                    {
                        type: 'text',
                        name: 'department',
                        label: 'Department',
                        value: employee.department || ''
                    },
                    {
                        type: 'text',
                        name: 'position',
                        label: 'Position',
                        value: employee.position || ''
                    },
                    {
                        type: 'number',
                        name: 'hourlyRate',
                        label: 'Hourly Rate ($)',
                        value: employee.hourlyRate,
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'phone',
                        label: 'Phone Number',
                        value: employee.phone || ''
                    },
                    {
                        type: 'select',
                        name: 'status',
                        label: 'Status',
                        value: employee.status,
                        required: true,
                        options: [
                            { value: 'active', text: 'Active' },
                            { value: 'inactive', text: 'Inactive' }
                        ]
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
                    text: 'Update Employee',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                return this.updateEmployee(employee.id, data);
            },
            options: {
                size: 'large'
            }
        });
    }

    showResetPasswordModal(employee) {
        const modalId = this.modalManager.create({
            title: `Reset Password: ${employee.firstName} ${employee.lastName}`,
            form: {
                fields: [
                    {
                        type: 'password',
                        name: 'newPassword',
                        label: 'New Password',
                        required: true,
                        placeholder: 'Enter new password'
                    },
                    {
                        type: 'password',
                        name: 'confirmPassword',
                        label: 'Confirm Password',
                        required: true,
                        placeholder: 'Confirm new password'
                    },
                    {
                        type: 'checkbox',
                        name: 'forceReset',
                        label: 'Force password reset on next login',
                        checkboxLabel: 'Require user to change password on next login'
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
                    text: 'Reset Password',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                return this.resetPassword(employee.id, data);
            },
            options: {
                size: 'medium'
            }
        });
    }

    showDeleteEmployeeModal(employee) {
        this.modalManager.confirm({
            title: 'Delete Employee',
            message: `
                <div class="delete-confirmation">
                    <p>Are you sure you want to delete <strong>${employee.firstName} ${employee.lastName}</strong>?</p>
                    <div class="warning-box">
                        <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                            <strong>Warning:</strong> This action cannot be undone. All attendance records and payroll history for this employee will be preserved but the employee account will be permanently deleted.
                        </div>
                    </div>
                </div>
            `,
            confirmText: 'Delete Employee',
            confirmClass: 'btn-danger',
            onConfirm: () => this.deleteEmployee(employee.id)
        });
    }

    async createEmployee(data) {
        try {
            // Validate data
            const validation = this.validateEmployeeData(data);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check for duplicate employee ID
            const existingEmployee = this.employees.find(emp => emp.employeeId === data.employeeId);
            if (existingEmployee) {
                throw new Error('Employee ID already exists');
            }

            // Check for duplicate email
            const existingEmail = this.employees.find(emp => emp.email === data.email);
            if (existingEmail) {
                throw new Error('Email address already exists');
            }

            // Create employee
            const employeeData = {
                ...data,
                status: 'active',
                createdAt: new Date().toISOString(),
                hourlyRate: parseFloat(data.hourlyRate)
            };

            const newEmployee = await this.dataService.createEmployee(employeeData);
            
            // Update local data
            this.employees.push(newEmployee);
            this.applyFiltersAndSort();
            this.renderEmployeeList();

            // Show success message
            this.showSuccessMessage(`Employee ${newEmployee.firstName} ${newEmployee.lastName} created successfully`);

            return true;
        } catch (error) {
            console.error('Failed to create employee:', error);
            throw error;
        }
    }

    async updateEmployee(employeeId, data) {
        try {
            // Validate data
            const validation = this.validateEmployeeData(data, employeeId);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check for duplicate employee ID (excluding current employee)
            const existingEmployee = this.employees.find(emp => 
                emp.employeeId === data.employeeId && emp.id !== employeeId
            );
            if (existingEmployee) {
                throw new Error('Employee ID already exists');
            }

            // Check for duplicate email (excluding current employee)
            const existingEmail = this.employees.find(emp => 
                emp.email === data.email && emp.id !== employeeId
            );
            if (existingEmail) {
                throw new Error('Email address already exists');
            }

            // Update employee
            const updateData = {
                ...data,
                hourlyRate: parseFloat(data.hourlyRate),
                updatedAt: new Date().toISOString()
            };

            const updatedEmployee = await this.dataService.updateEmployee(employeeId, updateData);
            
            // Update local data
            const index = this.employees.findIndex(emp => emp.id === employeeId);
            if (index !== -1) {
                this.employees[index] = updatedEmployee;
                this.applyFiltersAndSort();
                this.renderEmployeeList();
            }

            // Show success message
            this.showSuccessMessage(`Employee ${updatedEmployee.firstName} ${updatedEmployee.lastName} updated successfully`);

            return true;
        } catch (error) {
            console.error('Failed to update employee:', error);
            throw error;
        }
    }

    async resetPassword(employeeId, data) {
        try {
            // Validate passwords match
            if (data.newPassword !== data.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Validate password strength
            if (data.newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Reset password (this would typically call an API endpoint)
            await this.dataService.updateEmployee(employeeId, {
                password: data.newPassword,
                forcePasswordReset: data.forceReset || false,
                passwordResetAt: new Date().toISOString()
            });

            const employee = this.employees.find(emp => emp.id === employeeId);
            this.showSuccessMessage(`Password reset successfully for ${employee.firstName} ${employee.lastName}`);

            return true;
        } catch (error) {
            console.error('Failed to reset password:', error);
            throw error;
        }
    }

    async toggleEmployeeStatus(employee) {
        try {
            const newStatus = employee.status === 'active' ? 'inactive' : 'active';
            const action = newStatus === 'active' ? 'activated' : 'deactivated';

            await this.dataService.updateEmployee(employee.id, {
                status: newStatus,
                statusChangedAt: new Date().toISOString()
            });

            // Update local data
            const index = this.employees.findIndex(emp => emp.id === employee.id);
            if (index !== -1) {
                this.employees[index].status = newStatus;
                this.applyFiltersAndSort();
                this.renderEmployeeList();
            }

            this.showSuccessMessage(`Employee ${employee.firstName} ${employee.lastName} ${action} successfully`);
        } catch (error) {
            console.error('Failed to toggle employee status:', error);
            this.showErrorMessage('Failed to update employee status');
        }
    }

    async deleteEmployee(employeeId) {
        try {
            await this.dataService.deleteEmployee(employeeId);

            // Update local data
            const index = this.employees.findIndex(emp => emp.id === employeeId);
            if (index !== -1) {
                const employee = this.employees[index];
                this.employees.splice(index, 1);
                this.applyFiltersAndSort();
                this.renderEmployeeList();

                this.showSuccessMessage(`Employee ${employee.firstName} ${employee.lastName} deleted successfully`);
            }
        } catch (error) {
            console.error('Failed to delete employee:', error);
            this.showErrorMessage('Failed to delete employee');
        }
    }

    validateEmployeeData(data, excludeId = null) {
        const errors = [];

        // Required fields
        if (!data.firstName?.trim()) errors.push('First name is required');
        if (!data.lastName?.trim()) errors.push('Last name is required');
        if (!data.email?.trim()) errors.push('Email is required');
        if (!data.employeeId?.trim()) errors.push('Employee ID is required');
        if (!data.role) errors.push('Role is required');
        if (!data.hourlyRate || isNaN(parseFloat(data.hourlyRate))) errors.push('Valid hourly rate is required');

        // Email format validation
        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Invalid email format');
        }

        // Hourly rate validation
        if (data.hourlyRate && parseFloat(data.hourlyRate) < 0) {
            errors.push('Hourly rate must be positive');
        }

        // Employee ID format validation
        if (data.employeeId && !/^[A-Za-z0-9_-]+$/.test(data.employeeId)) {
            errors.push('Employee ID can only contain letters, numbers, hyphens, and underscores');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    formatRole(role) {
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${type === 'success' ? 
                        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>' :
                        type === 'error' ?
                        '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
                        '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>'
                    }
                </svg>
                <span>${message}</span>
            </div>
            <button class="notification-close" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Add to page
        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(notification);

        // Bind close event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });
    }

    // Bulk operations
    async bulkUpdateStatus(employeeIds, status) {
        try {
            const promises = employeeIds.map(id => 
                this.dataService.updateEmployee(id, { 
                    status, 
                    statusChangedAt: new Date().toISOString() 
                })
            );

            await Promise.all(promises);

            // Update local data
            employeeIds.forEach(id => {
                const index = this.employees.findIndex(emp => emp.id === id);
                if (index !== -1) {
                    this.employees[index].status = status;
                }
            });

            this.applyFiltersAndSort();
            this.renderEmployeeList();

            const action = status === 'active' ? 'activated' : 'deactivated';
            this.showSuccessMessage(`${employeeIds.length} employees ${action} successfully`);
        } catch (error) {
            console.error('Failed to bulk update status:', error);
            this.showErrorMessage('Failed to update employee statuses');
        }
    }

    async bulkDelete(employeeIds) {
        try {
            const promises = employeeIds.map(id => this.dataService.deleteEmployee(id));
            await Promise.all(promises);

            // Update local data
            this.employees = this.employees.filter(emp => !employeeIds.includes(emp.id));
            this.applyFiltersAndSort();
            this.renderEmployeeList();

            this.showSuccessMessage(`${employeeIds.length} employees deleted successfully`);
        } catch (error) {
            console.error('Failed to bulk delete:', error);
            this.showErrorMessage('Failed to delete employees');
        }
    }

    // Export functionality
    exportEmployeeData(format = 'csv') {
        const data = this.filteredEmployees.map(emp => ({
            'Employee ID': emp.employeeId,
            'First Name': emp.firstName,
            'Last Name': emp.lastName,
            'Email': emp.email,
            'Role': emp.role,
            'Department': emp.department || '',
            'Position': emp.position || '',
            'Hourly Rate': emp.hourlyRate,
            'Status': emp.status,
            'Phone': emp.phone || '',
            'Created': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : ''
        }));

        if (format === 'csv') {
            this.exportToCSV(data, 'employees');
        } else if (format === 'json') {
            this.exportToJSON(data, 'employees');
        }
    }

    exportToCSV(data, filename) {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');

        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    }

    exportToJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Statistics
    getEmployeeStats() {
        const total = this.employees.length;
        const active = this.employees.filter(emp => emp.status === 'active').length;
        const inactive = this.employees.filter(emp => emp.status === 'inactive').length;
        const admins = this.employees.filter(emp => emp.role === 'admin').length;
        const employees = this.employees.filter(emp => emp.role === 'employee').length;

        const departments = {};
        this.employees.forEach(emp => {
            const dept = emp.department || 'No Department';
            departments[dept] = (departments[dept] || 0) + 1;
        });

        return {
            total,
            active,
            inactive,
            admins,
            employees,
            departments
        };
    }
}

// Initialize user manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.dataService !== 'undefined') {
        window.userManager = new UserManager();
    } else {
        console.error('DataService not found. Please ensure data-service.js is loaded first.');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}