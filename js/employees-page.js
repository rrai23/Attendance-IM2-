/**
 * Employees Page Management Module for Bricks Attendance System
 * Handles employee CRUD operations, modals, and table management
 */

class EmployeesPageManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.departments = [];
        this.currentEmployee = null;
        
        // Don't auto-initialize - will be called manually
    }

    async init() {
        try {
            await this.loadEmployees();
            this.setupEventListeners();
            this.updateStats();
            this.renderTable();
            this.populateFilters();
        } catch (error) {
            console.error('Failed to initialize employees page:', error);
            this.showError('Failed to load page data');
        }
    }

    async loadEmployees() {
        try {
            // Mock employee data - in a real app, this would come from an API
            this.employees = [
                {
                    id: 1,
                    employeeCode: 'EMP001',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@company.com',
                    phone: '+1-555-0101',
                    department: 'Engineering',
                    position: 'Senior Developer',
                    manager: 'Charlie Wilson',
                    hireDate: '2023-01-15',
                    salary: 85000,
                    role: 'employee',
                    status: 'active',
                    schedule: {
                        monday: { active: true, start: '09:00', end: '17:00' },
                        tuesday: { active: true, start: '09:00', end: '17:00' },
                        wednesday: { active: true, start: '09:00', end: '17:00' },
                        thursday: { active: true, start: '09:00', end: '17:00' },
                        friday: { active: true, start: '09:00', end: '17:00' }
                    }
                },
                {
                    id: 2,
                    employeeCode: 'EMP002',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@company.com',
                    phone: '+1-555-0102',
                    department: 'Marketing',
                    position: 'Marketing Manager',
                    manager: null,
                    hireDate: '2022-06-10',
                    salary: 75000,
                    role: 'manager',
                    status: 'active',
                    schedule: {
                        monday: { active: true, start: '08:30', end: '16:30' },
                        tuesday: { active: true, start: '08:30', end: '16:30' },
                        wednesday: { active: true, start: '08:30', end: '16:30' },
                        thursday: { active: true, start: '08:30', end: '16:30' },
                        friday: { active: true, start: '08:30', end: '16:30' }
                    }
                },
                {
                    id: 3,
                    employeeCode: 'EMP003',
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    email: 'bob.johnson@company.com',
                    phone: '+1-555-0103',
                    department: 'Sales',
                    position: 'Sales Representative',
                    manager: 'Jane Smith',
                    hireDate: '2023-03-20',
                    salary: 55000,
                    role: 'employee',
                    status: 'active',
                    schedule: {
                        monday: { active: true, start: '09:00', end: '17:00' },
                        tuesday: { active: true, start: '09:00', end: '17:00' },
                        wednesday: { active: true, start: '09:00', end: '17:00' },
                        thursday: { active: true, start: '09:00', end: '17:00' },
                        friday: { active: true, start: '09:00', end: '17:00' }
                    }
                },
                {
                    id: 4,
                    employeeCode: 'EMP004',
                    firstName: 'Alice',
                    lastName: 'Brown',
                    email: 'alice.brown@company.com',
                    phone: '+1-555-0104',
                    department: 'HR',
                    position: 'HR Coordinator',
                    manager: 'Jane Smith',
                    hireDate: '2022-11-08',
                    salary: 60000,
                    role: 'employee',
                    status: 'active',
                    schedule: {
                        monday: { active: true, start: '08:00', end: '16:00' },
                        tuesday: { active: true, start: '08:00', end: '16:00' },
                        wednesday: { active: true, start: '08:00', end: '16:00' },
                        thursday: { active: true, start: '08:00', end: '16:00' },
                        friday: { active: true, start: '08:00', end: '16:00' }
                    }
                },
                {
                    id: 5,
                    employeeCode: 'EMP005',
                    firstName: 'Charlie',
                    lastName: 'Wilson',
                    email: 'charlie.wilson@company.com',
                    phone: '+1-555-0105',
                    department: 'Engineering',
                    position: 'Engineering Manager',
                    manager: null,
                    hireDate: '2021-04-12',
                    salary: 95000,
                    role: 'manager',
                    status: 'active',
                    schedule: {
                        monday: { active: true, start: '08:00', end: '17:00' },
                        tuesday: { active: true, start: '08:00', end: '17:00' },
                        wednesday: { active: true, start: '08:00', end: '17:00' },
                        thursday: { active: true, start: '08:00', end: '17:00' },
                        friday: { active: true, start: '08:00', end: '16:00' }
                    }
                },
                {
                    id: 6,
                    employeeCode: 'EMP006',
                    firstName: 'Diana',
                    lastName: 'Martinez',
                    email: 'diana.martinez@company.com',
                    phone: '+1-555-0106',
                    department: 'Finance',
                    position: 'Financial Analyst',
                    manager: 'John Doe',
                    hireDate: '2023-07-03',
                    salary: 58000,
                    role: 'employee',
                    status: 'inactive',
                    schedule: {
                        monday: { active: true, start: '09:00', end: '17:00' },
                        tuesday: { active: true, start: '09:00', end: '17:00' },
                        wednesday: { active: true, start: '09:00', end: '17:00' },
                        thursday: { active: true, start: '09:00', end: '17:00' },
                        friday: { active: true, start: '09:00', end: '17:00' }
                    }
                }
            ];

            // Extract departments
            this.departments = [...new Set(this.employees.map(emp => emp.department))];
            this.filteredEmployees = [...this.employees];
        } catch (error) {
            console.error('Failed to load employees:', error);
            throw error;
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
        document.getElementById('employeeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEmployee();
        });

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

        // Other buttons
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadEmployees();
            this.updateStats();
            this.renderTable();
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportData();
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
            const employeeName = document.getElementById('viewEmployeeName').textContent;
            const names = employeeName.split(' ');
            const employee = this.employees.find(emp => 
                emp.firstName === names[0] && emp.lastName === names.slice(1).join(' ')
            );
            if (employee) {
                this.closeViewModal();
                this.openModal(employee);
            }
        });

        // Delete modal event listeners
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            this.confirmDelete();
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
                        <div class="employee-name">${employee.firstName} ${employee.lastName}</div>
                        <div class="employee-email">${employee.email}</div>
                    </div>
                </td>
                <td>
                    <span class="employee-code">${employee.employeeCode}</span>
                </td>
                <td>${employee.department}</td>
                <td>${employee.position}</td>
                <td>${employee.email}</td>
                <td>
                    <span class="status-badge status-${employee.status}">
                        ${this.getStatusIcon(employee.status)} ${this.capitalizeFirst(employee.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="window.employeesPageManager.editEmployee(${employee.id})" title="Edit">
                            <span class="btn-icon">✏️</span>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="window.employeesPageManager.viewEmployee(${employee.id})" title="View Details">
                            <span class="btn-icon">👁️</span>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.employeesPageManager.deleteEmployee(${employee.id})" title="Delete">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
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

        if (!modal || !form || !title) return;

        this.currentEmployee = employee;

        if (employee) {
            title.textContent = 'Edit Employee';
            this.populateForm(employee);
        } else {
            title.textContent = 'Add Employee';
            form.reset();
            document.getElementById('employeeId').value = '';
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
            'hireDate', 'salary', 'role', 'status'
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
                const index = this.employees.findIndex(emp => emp.id === this.currentEmployee.id);
                if (index !== -1) {
                    this.employees[index] = { ...employeeData, id: this.currentEmployee.id };
                }
            } else {
                // Add new employee
                employeeData.id = Date.now();
                this.employees.push(employeeData);
            }

            // Update departments if new one was added
            if (!this.departments.includes(employeeData.department)) {
                this.departments.push(employeeData.department);
            }

            this.applyFilters();
            this.updateStats();
            this.renderTable();
            this.closeModal();
            
            this.showSuccess(this.currentEmployee ? 'Employee updated successfully!' : 'Employee added successfully!');

        } catch (error) {
            console.error('Failed to save employee:', error);
            this.showError('Failed to save employee. Please try again.');
        } finally {
            // Reset button state
            btnText?.classList.remove('hidden');
            btnLoading?.classList.add('hidden');
            saveBtn.disabled = false;
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
            employeeCode: document.getElementById('employeeCode')?.value.trim() || '',
            firstName: document.getElementById('firstName')?.value.trim() || '',
            lastName: document.getElementById('lastName')?.value.trim() || '',
            email: document.getElementById('email')?.value.trim() || '',
            phone: document.getElementById('phone')?.value.trim() || '',
            department: document.getElementById('department')?.value.trim() || '',
            position: document.getElementById('position')?.value.trim() || '',
            manager: document.getElementById('manager')?.value.trim() || '',
            hireDate: document.getElementById('hireDate')?.value || '',
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
        
        // Populate view modal data
        this.setElementText('viewEmployeeName', `${employee.firstName} ${employee.lastName}`);
        this.setElementText('viewEmployeeCode', employee.employeeCode);
        this.setElementText('viewEmployeeEmail', employee.email);
        this.setElementText('viewEmployeePhone', employee.phone || 'N/A');
        this.setElementText('viewEmployeeDepartment', employee.department);
        this.setElementText('viewEmployeePosition', employee.position);
        this.setElementText('viewEmployeeManager', employee.manager || 'N/A');
        this.setElementText('viewEmployeeHireDate', new Date(employee.hireDate).toLocaleDateString());
        this.setElementText('viewEmployeeSalary', employee.salary ? `$${employee.salary.toLocaleString()}` : 'N/A');
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
        document.body.style.overflow = 'hidden';
    }

    openDeleteModal(employee) {
        const modal = document.getElementById('deleteEmployeeModal');
        if (!modal) return;

        this.setElementText('deleteEmployeeName', `${employee.firstName} ${employee.lastName}`);
        this.setElementValue('deleteEmployeeId', employee.id);
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    confirmDelete() {
        const employeeId = document.getElementById('deleteEmployeeId')?.value;
        const employeeIndex = this.employees.findIndex(emp => emp.id == employeeId);
        
        if (employeeIndex !== -1) {
            const employee = this.employees[employeeIndex];
            this.employees.splice(employeeIndex, 1);
            
            // Update filtered employees
            this.applyFilters();
            this.updateStats();
            this.renderTable();
            
            this.closeDeleteModal();
            this.showSuccess(`Employee ${employee.firstName} ${employee.lastName} has been deleted successfully.`);
        }
    }

    closeViewModal() {
        const modal = document.getElementById('viewEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
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

    // Utility functions
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    setElementValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('employeesTableBody')) {
        setTimeout(() => {
            try {
                window.employeesPageManager = new EmployeesPageManager();
                
                // Set theme if available
                if (typeof themeManager !== 'undefined') {
                    themeManager.setPage('employees');
                }
            } catch (error) {
                console.error('Failed to initialize employees page:', error);
            }
        }, 100);
    }
});
