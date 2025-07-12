/**
 * Unified Employee Manager for Bricks Attendance System
 * Central hub for all employee-related operations across the system
 * Eliminates data redundancy and ensures consistency
 */

class UnifiedEmployeeManager {
    constructor() {
        this.employees = [];
        this.attendanceRecords = [];
        this.initialized = false;
        this.storageKey = 'bricks-unified-employee-data';
        this.syncKey = 'bricks-employee-sync';
        
        // Event listeners for real-time updates
        this.eventListeners = {
            employeeUpdate: [],
            attendanceUpdate: [],
            dataSync: []
        };
        
        // Auto-initialize
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing Unified Employee Manager...');
            
            // Load existing data or create initial data
            await this.loadData();
            
            // Set up cross-tab synchronization
            this.setupCrossTabSync();
            
            this.initialized = true;
            console.log('Unified Employee Manager initialized with:', {
                employees: this.employees.length,
                attendanceRecords: this.attendanceRecords.length
            });
            
            this.emit('dataSync', { action: 'initialized' });
            
        } catch (error) {
            console.error('Failed to initialize Unified Employee Manager:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            // First try to load from localStorage
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.employees = data.employees || [];
                this.attendanceRecords = data.attendanceRecords || [];
                console.log('Loaded data from localStorage');
                return;
            }

            // If no stored data, migrate from existing sources
            await this.migrateFromExistingSources();
            
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to creating initial data
            await this.createInitialData();
        }
    }

    async migrateFromExistingSources() {
        console.log('🔄 Migrating and unifying data from all sources...');
        
        // Collect data from ALL possible sources
        let allEmployees = [];
        let allAttendanceRecords = [];
        
        // Check old localStorage keys that might contain data
        const oldDataSources = [
            'bricks_attendance_data',
            'bricks-attendance-data', 
            'employee-data',
            'attendance-data',
            'employees',
            'attendanceRecords'
        ];
        
        oldDataSources.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`📦 Found data in ${key}:`, { 
                        employees: parsed.employees?.length || 0, 
                        attendance: parsed.attendanceRecords?.length || 0 
                    });
                    
                    if (parsed.employees) {
                        allEmployees = allEmployees.concat(parsed.employees);
                    }
                    if (parsed.attendanceRecords) {
                        allAttendanceRecords = allAttendanceRecords.concat(parsed.attendanceRecords);
                    }
                } catch (e) {
                    console.warn(`Failed to parse data from ${key}:`, e);
                }
            }
        });
        
        // Try to get data from dataService if available
        if (typeof dataService !== 'undefined') {
            try {
                const serviceEmployees = await dataService.getEmployees();
                if (serviceEmployees && serviceEmployees.length > 0) {
                    console.log('📦 Found employees in dataService:', serviceEmployees.length);
                    allEmployees = allEmployees.concat(serviceEmployees);
                }
                
                const serviceAttendance = await dataService.getAttendanceRecords();
                if (serviceAttendance && serviceAttendance.length > 0) {
                    console.log('📦 Found attendance in dataService:', serviceAttendance.length);
                    allAttendanceRecords = allAttendanceRecords.concat(serviceAttendance);
                }
            } catch (error) {
                console.warn('Failed to migrate from dataService:', error);
            }
        }

        // Try to get data from dataManager if available
        if (typeof dataManager !== 'undefined' && dataManager.initialized) {
            try {
                const managerEmployees = dataManager.getEmployees();
                if (managerEmployees && managerEmployees.length > 0) {
                    console.log('📦 Found employees in dataManager:', managerEmployees.length);
                    allEmployees = allEmployees.concat(managerEmployees);
                }
                
                const managerAttendance = dataManager.getAttendanceRecords();
                if (managerAttendance && managerAttendance.length > 0) {
                    console.log('📦 Found attendance in dataManager:', managerAttendance.length);
                    allAttendanceRecords = allAttendanceRecords.concat(managerAttendance);
                }
            } catch (error) {
                console.warn('Failed to migrate from dataManager:', error);
            }
        }

        // Deduplicate and normalize data
        this.employees = this.deduplicateEmployees(this.normalizeEmployeeData(allEmployees));
        this.attendanceRecords = this.deduplicateAttendance(this.normalizeAttendanceData(allAttendanceRecords));
        
        console.log('🔄 After deduplication:', { 
            employees: this.employees.length, 
            attendance: this.attendanceRecords.length 
        });
        
        // Clean up orphaned attendance records with detailed logging
        const cleanupResult = this.cleanupOrphanedAttendanceRecords();
        
        console.log('🔄 Final unified data:', { 
            employees: this.employees.length, 
            attendance: this.attendanceRecords.length,
            cleanupResult: cleanupResult
        });
        
        // Save unified data
        this.saveData();
        
        // Clean up old data sources to prevent conflicts
        this.cleanupOldDataSources();
        
        return;
    }

    /**
     * Remove duplicate employees based on ID
     */
    deduplicateEmployees(employees) {
        const seen = new Set();
        return employees.filter(emp => {
            const key = String(emp.id);
            if (seen.has(key)) {
                console.log('Removing duplicate employee:', emp.id);
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Remove duplicate attendance records based on employee ID and date
     */
    deduplicateAttendance(records) {
        const seen = new Set();
        return records.filter(record => {
            const key = `${record.employeeId}-${record.date}`;
            if (seen.has(key)) {
                console.log('Removing duplicate attendance record:', key);
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Remove attendance records for employees that don't exist
     */
    cleanupOrphanedAttendanceRecords() {
        console.log('🔍 Checking for orphaned attendance records...');
        console.log(`Current employees: ${this.employees.length}`);
        console.log(`Current attendance records: ${this.attendanceRecords.length}`);
        
        // Create comprehensive set of valid employee IDs
        const validEmployeeIds = new Set();
        this.employees.forEach(emp => {
            // Add all possible variations of the ID
            validEmployeeIds.add(emp.id);
            validEmployeeIds.add(String(emp.id));
            validEmployeeIds.add(parseInt(emp.id));
            
            // Also add employee code as some attendance might use that
            if (emp.employeeCode) {
                validEmployeeIds.add(emp.employeeCode);
            }
        });

        console.log('Valid employee IDs:', Array.from(validEmployeeIds));

        const beforeCount = this.attendanceRecords.length;
        const orphanedRecords = [];
        
        // Filter and track what gets removed
        this.attendanceRecords = this.attendanceRecords.filter(record => {
            const empId = record.employeeId;
            const isValid = validEmployeeIds.has(empId) || 
                           validEmployeeIds.has(String(empId)) || 
                           validEmployeeIds.has(parseInt(empId));
            
            if (!isValid) {
                orphanedRecords.push({
                    id: record.id,
                    employeeId: record.employeeId,
                    employeeName: record.employeeName,
                    date: record.date,
                    status: record.status
                });
                console.log(`🗑️ Removing orphaned record: Employee ID ${record.employeeId} (${record.employeeName}) - not found in current employees`);
            }
            
            return isValid;
        });
        
        const removedCount = beforeCount - this.attendanceRecords.length;
        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} orphaned attendance records`);
            console.log('Orphaned records details:', orphanedRecords);
        } else {
            console.log('✅ No orphaned attendance records found');
        }
        
        console.log(`After cleanup: ${this.attendanceRecords.length} attendance records remaining`);
        
        return {
            removedCount,
            orphanedRecords,
            remainingRecords: this.attendanceRecords.length
        };
    }

    /**
     * Remove old conflicting data sources
     */
    cleanupOldDataSources() {
        const oldKeys = [
            'bricks_attendance_data',
            'bricks-attendance-data', 
            'employee-data',
            'attendance-data',
            'employees',
            'attendanceRecords'
        ];
        
        let cleanedKeys = [];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleanedKeys.push(key);
            }
        });
        
        if (cleanedKeys.length > 0) {
            console.log('🗑️ Cleaned up old data sources:', cleanedKeys);
        }
    }

    normalizeEmployeeData(employees) {
        return employees.map(emp => ({
            id: emp.id,
            employeeCode: emp.employeeCode || emp.employeeId || `emp_${String(emp.id).padStart(3, '0')}`,
            firstName: emp.firstName || emp.name?.split(' ')[0] || 'Unknown',
            lastName: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || 'Employee',
            fullName: emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            email: emp.email || '',
            phone: emp.phone || '',
            department: emp.department || 'General',
            position: emp.position || 'Employee',
            manager: emp.manager || null,
            hireDate: emp.hireDate || new Date().toISOString().split('T')[0],
            hourlyRate: emp.hourlyRate || 25.00,
            salaryType: emp.salaryType || 'hourly',
            status: emp.status || 'active',
            role: emp.role || 'employee',
            schedule: emp.schedule || this.getDefaultSchedule(),
            createdAt: emp.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
    }

    normalizeAttendanceData(records) {
        return records.map(record => ({
            id: record.id || Date.now() + Math.random(),
            employeeId: record.employeeId,
            employeeCode: record.employeeCode,
            employeeName: record.employeeName,
            department: record.department,
            date: record.date,
            clockIn: record.clockIn,
            clockOut: record.clockOut,
            status: record.status || 'present',
            hours: record.hours || this.calculateHours(record.clockIn, record.clockOut),
            notes: record.notes || '',
            lastModified: record.lastModified || new Date().toISOString()
        }));
    }

    getDefaultSchedule() {
        return {
            monday: { active: true, start: "08:00", end: "17:00" },
            tuesday: { active: true, start: "08:00", end: "17:00" },
            wednesday: { active: true, start: "08:00", end: "17:00" },
            thursday: { active: true, start: "08:00", end: "17:00" },
            friday: { active: true, start: "08:00", end: "17:00" },
            saturday: { active: false, start: "08:00", end: "17:00" },
            sunday: { active: false, start: "08:00", end: "17:00" }
        };
    }

    async createInitialData() {
        console.log('Creating initial employee data from preferred data source...');
        
        // Priority 1: Try to load from data.json if available
        try {
            const response = await fetch('./mock/data.json');
            if (response.ok) {
                const jsonData = await response.json();
                console.log('✅ Successfully loaded data.json');
                console.log('Data.json structure:', {
                    hasEmployees: jsonData.employees ? true : false,
                    employeesLength: jsonData.employees ? jsonData.employees.length : 0,
                    hasAttendance: jsonData.attendance ? true : false,
                    attendanceLength: jsonData.attendance ? jsonData.attendance.length : 0
                });
                
                if (jsonData.employees && Array.isArray(jsonData.employees) && jsonData.employees.length > 0) {
                    console.log('Using employees from data.json:', jsonData.employees.length);
                    console.log('Employee names from data.json:', jsonData.employees.map(e => e.fullName || e.name));
                    
                    // Convert data.json structure to our expected format
                    const convertedEmployees = jsonData.employees.map(emp => ({
                        ...emp,
                        name: emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                        employeeCode: emp.employeeId || emp.employeeCode || `emp_${String(emp.id).padStart(3, '0')}`,
                        hireDate: emp.dateHired || emp.hireDate,
                        hourlyRate: emp.wage || emp.hourlyRate || 25.00
                    }));
                    
                    this.employees = this.normalizeEmployeeData(convertedEmployees);
                    
                    // Load attendance if available
                    if (jsonData.attendance && Array.isArray(jsonData.attendance)) {
                        console.log('Using attendance from data.json:', jsonData.attendance.length);
                        const convertedAttendance = jsonData.attendance.map(att => ({
                            ...att,
                            clockIn: att.timeIn,
                            clockOut: att.timeOut,
                            hours: att.hoursWorked,
                            employeeName: this.employees.find(e => e.id == att.employeeId)?.fullName || 'Unknown'
                        }));
                        this.attendanceRecords = this.normalizeAttendanceData(convertedAttendance);
                    } else {
                        this.attendanceRecords = [];
                    }
                    
                    console.log(`✅ Loaded from data.json: ${this.employees.length} employees, ${this.attendanceRecords.length} attendance records`);
                    console.log('Final employee list from data.json:', this.employees.map(e => `${e.fullName || e.name} (${e.id})`));
                    this.saveData();
                    return;
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load data.json:', error.message);
        }
        
        // Priority 2: Fall back to mock-data.js if available
        if (typeof mockData !== 'undefined') {
            console.log('Falling back to mock-data.js');
            console.log('Mock data available?', typeof mockData !== 'undefined');
            console.log('Mock data structure:', {
                hasUsers: mockData.users ? true : false,
                usersLength: mockData.users ? mockData.users.length : 0,
                hasEmployees: mockData.employees ? true : false,
                hasAttendance: mockData.attendanceRecords ? true : false
            });
            
            let mockEmployees = [];
            let mockAttendanceRecords = [];
            
            // Extract employees from users array if it exists
            if (mockData.users && Array.isArray(mockData.users)) {
                console.log('Extracting employees from mock data users:', mockData.users.length);
                
                const usersWithEmployees = mockData.users.filter(user => user.employee);
                console.log('Users with employee data:', usersWithEmployees.length);
                
                mockEmployees = usersWithEmployees.map(user => {
                    console.log('Processing employee:', user.employee.name, 'ID:', user.employee.id);
                    return user.employee;
                });
                
                console.log('Extracted employees from users:', mockEmployees.length);
                console.log('Employee names:', mockEmployees.map(e => e.name));
            } else if (mockData.employees && Array.isArray(mockData.employees)) {
                console.log('Using direct mock data employees:', mockData.employees.length);
                mockEmployees = mockData.employees;
            } else {
                console.log('No employee data found in mock data structure');
            }
            
            // Get attendance records if available
            if (mockData.attendanceRecords && Array.isArray(mockData.attendanceRecords)) {
                console.log('Using mock data attendance records:', mockData.attendanceRecords.length);
                mockAttendanceRecords = mockData.attendanceRecords;
            }
            
            if (mockEmployees.length > 0) {
                console.log('Normalizing employee data from mock-data.js...');
                this.employees = this.normalizeEmployeeData(mockEmployees);
                this.attendanceRecords = mockAttendanceRecords.length > 0 ? 
                    this.normalizeAttendanceData(mockAttendanceRecords) : [];
                
                console.log(`Loaded from mock data: ${this.employees.length} employees, ${this.attendanceRecords.length} attendance records`);
                console.log('Final employee list:', this.employees.map(e => `${e.fullName || e.name} (${e.id})`));
            } else {
                console.log('No employee data found in mock data, creating minimal fallback data...');
                this.createFallbackData();
            }
        } else {
            console.log('Mock data not available, creating minimal fallback data...');
            this.createFallbackData();
        }
        
        console.log(`Created initial data: ${this.employees.length} employees, ${this.attendanceRecords.length} attendance records`);
        this.saveData();
    }

    /**
     * Create minimal fallback data when mock data is not available
     */
    createFallbackData() {
        this.employees = [
            {
                id: 1,
                employeeCode: 'emp_001',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                name: 'John Doe',
                email: 'john.doe@company.com',
                phone: '(555) 123-4567',
                department: 'Engineering',
                position: 'Senior Developer',
                manager: null,
                hireDate: '2023-01-15',
                hourlyRate: 45.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                employeeCode: 'emp_002',
                firstName: 'Jane',
                lastName: 'Smith',
                fullName: 'Jane Smith',
                name: 'Jane Smith',
                email: 'jane.smith@company.com',
                phone: '(555) 234-5678',
                department: 'Marketing',
                position: 'Marketing Manager',
                manager: null,
                hireDate: '2023-02-20',
                hourlyRate: 40.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 3,
                employeeCode: 'emp_003',
                firstName: 'Bob',
                lastName: 'Johnson',
                fullName: 'Bob Johnson',
                name: 'Bob Johnson',
                email: 'bob.johnson@company.com',
                phone: '(555) 345-6789',
                department: 'Sales',
                position: 'Sales Representative',
                manager: null,
                hireDate: '2023-03-10',
                hourlyRate: 35.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        this.attendanceRecords = [];
    }

    /**
     * Save data to localStorage and sync across all potential data sources
     */
    saveData() {
        try {
            const data = {
                employees: this.employees,
                attendanceRecords: this.attendanceRecords,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            // Save to primary unified storage
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Sync to all other potential data sources to prevent conflicts
            // This ensures any legacy code will get the correct unified data
            try {
                // Sync employees to potential legacy sources
                if (this.employees && this.employees.length > 0) {
                    localStorage.setItem('employees', JSON.stringify(this.employees));
                    localStorage.setItem('bricks_employees', JSON.stringify(this.employees));
                    
                    // Update global objects if they exist
                    if (window.employees) {
                        window.employees = [...this.employees];
                    }
                    if (window.bricksEmployees) {
                        window.bricksEmployees = [...this.employees];
                    }
                }
                
                // Sync attendance records to potential legacy sources
                if (this.attendanceRecords && this.attendanceRecords.length > 0) {
                    localStorage.setItem('attendanceRecords', JSON.stringify(this.attendanceRecords));
                    localStorage.setItem('bricks_attendance_records', JSON.stringify(this.attendanceRecords));
                    
                    // Update global objects if they exist
                    if (window.attendanceRecords) {
                        window.attendanceRecords = [...this.attendanceRecords];
                    }
                    if (window.bricksAttendanceRecords) {
                        window.bricksAttendanceRecords = [...this.attendanceRecords];
                    }
                }
                
                // Remove old conflicting data sources to prevent future issues
                const conflictingSources = [
                    'bricks_attendance_data',
                    'bricks_legacy_data',
                    'old_employee_data',
                    'temp_employee_data'
                ];
                
                conflictingSources.forEach(source => {
                    if (localStorage.getItem(source)) {
                        console.log(`Removing conflicting data source: ${source}`);
                        localStorage.removeItem(source);
                    }
                });
                
            } catch (syncError) {
                console.warn('Warning: Some data sync operations failed:', syncError);
                // Continue with main save even if sync fails
            }
            
            // Trigger sync event
            localStorage.setItem(this.syncKey, JSON.stringify({
                action: 'update',
                timestamp: Date.now(),
                employeeCount: this.employees.length,
                attendanceCount: this.attendanceRecords.length
            }));
            
            console.log(`Data saved to unified storage - ${this.employees.length} employees, ${this.attendanceRecords.length} attendance records`);
            
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    /**
     * Normalize employee data to unified format
     */
    normalizeEmployeeData(employees) {
        if (!Array.isArray(employees)) {
            console.warn('normalizeEmployeeData: input is not an array, returning empty array');
            return [];
        }

        return employees.map(emp => {
            // Ensure basic required fields
            const normalized = {
                id: emp.id,
                employeeCode: emp.employeeCode || emp.employeeId || emp.code || `emp_${String(emp.id).padStart(3, '0')}`,
                firstName: emp.firstName || emp.first_name || '',
                lastName: emp.lastName || emp.last_name || '',
                fullName: emp.fullName || emp.name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
                name: emp.name || emp.fullName || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
                email: emp.email || '',
                phone: emp.phone || '',
                department: emp.department || '',
                position: emp.position || emp.title || '',
                manager: emp.manager || null,
                hireDate: emp.hireDate || emp.hire_date || new Date().toISOString().split('T')[0],
                hourlyRate: parseFloat(emp.hourlyRate || emp.hourly_rate || 0),
                salaryType: emp.salaryType || emp.salary_type || 'hourly',
                status: emp.status || 'active',
                role: emp.role || 'employee',
                schedule: emp.schedule || this.getDefaultSchedule(),
                createdAt: emp.createdAt || new Date().toISOString(),
                updatedAt: emp.updatedAt || new Date().toISOString()
            };

            return normalized;
        });
    }

    /**
     * Normalize attendance data to unified format
     */
    normalizeAttendanceData(records) {
        if (!Array.isArray(records)) {
            console.warn('normalizeAttendanceData: input is not an array, returning empty array');
            return [];
        }

        return records.map(record => ({
            id: record.id,
            employeeId: record.employeeId || record.employee_id,
            employeeCode: record.employeeCode || record.employee_code || `emp_${String(record.employeeId).padStart(3, '0')}`,
            employeeName: record.employeeName || record.employee_name || '',
            department: record.department || '',
            date: record.date,
            clockIn: record.clockIn || record.timeIn || record.time_in,
            clockOut: record.clockOut || record.timeOut || record.time_out,
            status: record.status || 'present',
            hours: parseFloat(record.hours || record.hoursWorked || record.hours_worked || 0),
            overtimeHours: parseFloat(record.overtimeHours || record.overtime_hours || 0),
            notes: record.notes || '',
            lastModified: record.lastModified || new Date().toISOString()
        }));
    }

    /**
     * Delete an employee and their associated attendance records
     */
    deleteEmployee(id) {
        try {
            console.log(`Attempting to delete employee with ID: ${id}`);
            
            // Robust ID matching using utility or fallback
            const index = window.IdUtility ? 
                window.IdUtility.findEmployeeIndex(this.employees, id) :
                this.employees.findIndex(emp => {
                    if (emp.id === id) return true;
                    const numericId = parseInt(id);
                    const numericEmpId = parseInt(emp.id);
                    if (!isNaN(numericId) && !isNaN(numericEmpId)) {
                        return numericEmpId === numericId;
                    }
                    return String(emp.id) === String(id);
                });
            
            if (index === -1) {
                throw new Error(`Employee with ID ${id} not found`);
            }

            const deletedEmployee = this.employees.splice(index, 1)[0];
            console.log(`Deleted employee:`, deletedEmployee);
            
            // Also remove their attendance records - use robust matching
            const initialAttendanceCount = this.attendanceRecords.length;
            this.attendanceRecords = window.IdUtility ?
                this.attendanceRecords.filter(record => !window.IdUtility.idsMatch(record.employeeId, deletedEmployee.id)) :
                this.attendanceRecords.filter(record => {
                    // Use multiple comparison methods for robust matching
                    if (record.employeeId === deletedEmployee.id) return false;
                    const numericRecordId = parseInt(record.employeeId);
                    const numericEmpId = parseInt(deletedEmployee.id);
                    if (!isNaN(numericRecordId) && !isNaN(numericEmpId)) {
                        return numericRecordId !== numericEmpId;
                    }
                    return String(record.employeeId) !== String(deletedEmployee.id);
                });
            
            const removedAttendanceCount = initialAttendanceCount - this.attendanceRecords.length;
            console.log(`Removed ${removedAttendanceCount} attendance records for deleted employee`);
            
            // Force cleanup to ensure no orphaned records remain
            console.log('🔧 Running additional cleanup after employee deletion...');
            const cleanupResult = this.cleanupOrphanedAttendanceRecords();
            console.log('🔧 Additional cleanup result:', cleanupResult);
            
            this.saveData();
            
            // Broadcast employee deletion to all systems
            this.emit('employeeUpdate', { 
                action: 'delete', 
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount
            });
            
            // Also emit specific delete event for systems that need it
            this.emit('employeeDeleted', { 
                employeeId: deletedEmployee.id,
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount
            });
            
            console.log(`Successfully deleted employee ${deletedEmployee.name || deletedEmployee.fullName} and ${removedAttendanceCount} attendance records`);
            return deletedEmployee;
        } catch (error) {
            console.error('Failed to delete employee:', error);
            throw error;
        }
    }

    /**
     * Enhanced system-wide broadcasting for critical updates
     */
    broadcastSystemWide(eventType, data) {
        // Local page broadcast
        this.emit(eventType, data);
        
        // Cross-tab/window broadcast using BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                if (!this.broadcastChannel) {
                    this.broadcastChannel = new BroadcastChannel('bricks-attendance-sync');
                }
                
                this.broadcastChannel.postMessage({
                    type: eventType,
                    data: data,
                    timestamp: new Date().toISOString(),
                    source: 'UnifiedEmployeeManager'
                });
            } catch (error) {
                console.warn('BroadcastChannel not available:', error);
            }
        }
        
        // Local storage sync for cross-tab communication fallback
        try {
            const syncData = {
                type: eventType,
                data: data,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bricks-system-event', JSON.stringify(syncData));
            // Clear it immediately to trigger storage event
            setTimeout(() => localStorage.removeItem('bricks-system-event'), 100);
        } catch (error) {
            console.warn('LocalStorage sync failed:', error);
        }
        
        // DOM event for same-page components
        try {
            const customEvent = new CustomEvent('bricksSystemUpdate', {
                detail: {
                    type: eventType,
                    data: data,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(customEvent);
        } catch (error) {
            console.warn('DOM event dispatch failed:', error);
        }
    }

    /**
     * Setup cross-tab synchronization listeners
     */
    setupCrossTabSync() {
        // BroadcastChannel listener
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('bricks-attendance-sync');
                this.broadcastChannel.addEventListener('message', (event) => {
                    if (event.data.source !== 'UnifiedEmployeeManager') return;
                    
                    console.log('Received cross-tab sync:', event.data);
                    
                    // Handle different event types
                    switch (event.data.type) {
                        case 'employeeDeleted':
                        case 'employeeAdded':
                        case 'employeeUpdated':
                            this.handleCrossTabEmployeeUpdate(event.data);
                            break;
                        case 'attendanceUpdated':
                            this.handleCrossTabAttendanceUpdate(event.data);
                            break;
                    }
                });
            } catch (error) {
                console.warn('BroadcastChannel setup failed:', error);
            }
        }
        
        // Storage event listener for fallback
        window.addEventListener('storage', (event) => {
            if (event.key === 'bricks-system-event' && event.newValue) {
                try {
                    const syncData = JSON.parse(event.newValue);
                    console.log('Received storage sync:', syncData);
                    
                    // Handle the sync event
                    switch (syncData.type) {
                        case 'employeeDeleted':
                        case 'employeeAdded':
                        case 'employeeUpdated':
                            this.handleCrossTabEmployeeUpdate(syncData);
                            break;
                        case 'attendanceUpdated':
                            this.handleCrossTabAttendanceUpdate(syncData);
                            break;
                    }
                } catch (error) {
                    console.warn('Failed to parse storage sync data:', error);
                }
            }
        });
    }

    /**
     * Handle cross-tab employee updates
     */
    handleCrossTabEmployeeUpdate(syncData) {
        // Reload data from storage to ensure consistency
        this.loadData().then(() => {
            // Emit local events to update UI
            this.emit('dataSync', { 
                action: syncData.type, 
                data: syncData.data,
                source: 'crossTab'
            });
            
            // Emit specific event type
            this.emit(syncData.type, syncData.data);
        }).catch(error => {
            console.error('Failed to reload data after cross-tab sync:', error);
        });
    }

    /**
     * Handle cross-tab attendance updates
     */
    handleCrossTabAttendanceUpdate(syncData) {
        // Reload attendance data
        this.loadData().then(() => {
            this.emit('attendanceUpdate', syncData.data);
            this.emit('dataSync', { 
                action: 'attendanceUpdate', 
                data: syncData.data,
                source: 'crossTab'
            });
        }).catch(error => {
            console.error('Failed to reload attendance data after cross-tab sync:', error);
        });
    }

    // Employee CRUD Operations
    getEmployees() {
        return [...this.employees];
    }

    // Alias for compatibility with debug tools and dashboard
    getAllEmployees() {
        return this.getEmployees();
    }

    // Alias for compatibility with debug tools and dashboard  
    getAllAttendanceRecords() {
        return [...this.attendanceRecords];
    }

    getEmployee(id) {
        return window.IdUtility ? 
            window.IdUtility.findEmployeeById(this.employees, id) :
            this.employees.find(emp => {
                // Fallback if IdUtility not available
                if (emp.id === id) return true;
                const numericId = parseInt(id);
                const numericEmpId = parseInt(emp.id);
                if (!isNaN(numericId) && !isNaN(numericEmpId)) {
                    return numericEmpId === numericId;
                }
                return String(emp.id) === String(id);
            });
    }

    getEmployeeByCode(code) {
        return this.employees.find(emp => emp.employeeCode === code);
    }

    addEmployee(employeeData) {
        try {
            const newId = this.employees.length > 0 ? Math.max(...this.employees.map(e => e.id)) + 1 : 1;
            const newEmployee = {
                id: newId,
                employeeCode: employeeData.employeeCode || `emp_${String(newId).padStart(3, '0')}`,
                ...employeeData,
                fullName: `${employeeData.firstName} ${employeeData.lastName}`.trim(),
                schedule: employeeData.schedule || this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.employees.push(newEmployee);
            this.saveData();
            
            // Broadcast employee addition to all systems
            this.emit('employeeUpdate', { action: 'add', employee: newEmployee });
            this.emit('employeeAdded', { employee: newEmployee });
            
            // System-wide broadcast
            this.broadcastSystemWide('employeeAdded', {
                employee: newEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee added:', newEmployee);
            return newEmployee;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

    updateEmployee(id, employeeData) {
        try {
            // Robust ID matching using utility or fallback
            const index = window.IdUtility ? 
                window.IdUtility.findEmployeeIndex(this.employees, id) :
                this.employees.findIndex(emp => {
                    if (emp.id === id) return true;
                    const numericId = parseInt(id);
                    const numericEmpId = parseInt(emp.id);
                    if (!isNaN(numericId) && !isNaN(numericEmpId)) {
                        return numericEmpId === numericId;
                    }
                    return String(emp.id) === String(id);
                });
            
            if (index === -1) {
                throw new Error(`Employee with ID ${id} not found`);
            }

            const oldEmployee = { ...this.employees[index] };
            const updatedEmployee = {
                ...this.employees[index],
                ...employeeData,
                fullName: `${employeeData.firstName || this.employees[index].firstName} ${employeeData.lastName || this.employees[index].lastName}`.trim(),
                updatedAt: new Date().toISOString()
            };

            this.employees[index] = updatedEmployee;
            this.saveData();
            
            // Broadcast employee update to all systems
            this.emit('employeeUpdate', { action: 'update', employee: updatedEmployee, oldEmployee });
            this.emit('employeeUpdated', { employee: updatedEmployee, oldEmployee });
            
            // System-wide broadcast
            this.broadcastSystemWide('employeeUpdated', {
                employee: updatedEmployee,
                oldEmployee: oldEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee updated:', updatedEmployee);
            return updatedEmployee;
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    }

    // Attendance Operations
    getAttendanceRecords(filters = {}) {
        let records = [...this.attendanceRecords];
        
        if (filters.employeeId) {
            records = records.filter(r => r.employeeId === parseInt(filters.employeeId));
        }
        
        if (filters.date) {
            records = records.filter(r => r.date === filters.date);
        }
        
        if (filters.status) {
            records = records.filter(r => r.status === filters.status);
        }
        
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendanceRecords({ date: today });
    }

    saveAttendanceRecord(recordData) {
        try {
            const employee = this.getEmployee(recordData.employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const existingIndex = this.attendanceRecords.findIndex(
                r => r.employeeId === recordData.employeeId && r.date === recordData.date
            );

            const record = {
                id: recordData.id || (existingIndex >= 0 ? this.attendanceRecords[existingIndex].id : Date.now()),
                employeeId: recordData.employeeId,
                employeeCode: employee.employeeCode,
                employeeName: employee.fullName,
                department: employee.department,
                date: recordData.date,
                clockIn: recordData.clockIn || null,
                clockOut: recordData.clockOut || null,
                status: recordData.status,
                hours: this.calculateHours(recordData.clockIn, recordData.clockOut),
                notes: recordData.notes || '',
                lastModified: new Date().toISOString()
            };

            const isUpdate = existingIndex >= 0;
            if (isUpdate) {
                this.attendanceRecords[existingIndex] = record;
            } else {
                this.attendanceRecords.push(record);
            }

            this.saveData();
            
            // Broadcast attendance update to all systems
            this.emit('attendanceUpdate', { action: isUpdate ? 'update' : 'add', record });
            this.emit('attendanceRecordSaved', { record, isUpdate });
            
            // System-wide broadcast
            this.broadcastSystemWide('attendanceUpdated', {
                record: record,
                action: isUpdate ? 'update' : 'add',
                timestamp: new Date().toISOString()
            });
            
            console.log('Attendance record saved:', record);
            return record;
        } catch (error) {
            console.error('Error saving attendance record:', error);
            throw error;
        }
    }

    /**
     * Delete an attendance record by employee ID and date
     */
    deleteAttendanceRecord(employeeId, date) {
        try {
            console.log(`Attempting to delete attendance record: employeeId=${employeeId}, date=${date}`);
            
            // Find the record to delete
            const recordIndex = this.attendanceRecords.findIndex(record => {
                // Use robust ID matching
                const recordEmpId = record.employeeId;
                const targetEmpId = employeeId;
                
                // Direct comparison
                if (recordEmpId === targetEmpId && record.date === date) return true;
                
                // String comparison
                if (String(recordEmpId) === String(targetEmpId) && record.date === date) return true;
                
                // Numeric comparison (handle string vs number IDs)
                if (!isNaN(recordEmpId) && !isNaN(targetEmpId)) {
                    if (parseInt(recordEmpId) === parseInt(targetEmpId) && record.date === date) return true;
                }
                
                return false;
            });
            
            if (recordIndex === -1) {
                throw new Error(`Attendance record not found for employee ID ${employeeId} on date ${date}`);
            }
            
            // Remove the record
            const deletedRecord = this.attendanceRecords.splice(recordIndex, 1)[0];
            console.log('Deleted attendance record:', deletedRecord);
            
            // Save the updated data
            this.saveData();
            
            // Broadcast attendance deletion to all systems
            this.emit('attendanceUpdate', { 
                action: 'delete', 
                record: deletedRecord,
                employeeId: employeeId,
                date: date
            });
            
            this.emit('attendanceRecordDeleted', { 
                record: deletedRecord,
                employeeId: employeeId,
                date: date
            });
            
            // System-wide broadcast
            this.broadcastSystemWide('attendanceDeleted', {
                record: deletedRecord,
                employeeId: employeeId,
                date: date,
                timestamp: new Date().toISOString()
            });
            
            console.log(`Successfully deleted attendance record for employee ${employeeId} on ${date}`);
            return deletedRecord;
            
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            throw error;
        }
    }

    /**
     * Delete an attendance record by record ID
     */
    deleteAttendanceRecordById(recordId) {
        try {
            console.log(`Attempting to delete attendance record by ID: ${recordId} (type: ${typeof recordId})`);
            console.log('Current attendance records count:', this.attendanceRecords.length);
            console.log('All current record IDs:', this.attendanceRecords.map(r => ({ id: r.id, type: typeof r.id })));
            
            // Find the record to delete with flexible ID comparison
            const recordIndex = this.attendanceRecords.findIndex(record => {
                // Compare both strict equality and string equality
                return record.id === recordId || 
                       String(record.id) === String(recordId) ||
                       Number(record.id) === Number(recordId);
            });
            
            if (recordIndex === -1) {
                const error = `Attendance record not found with ID ${recordId} (type: ${typeof recordId})`;
                console.error(error);
                console.log('Available record IDs for comparison:', this.attendanceRecords.map(r => ({ id: r.id, type: typeof r.id })));
                throw new Error(error);
            }
            
            // Remove the record
            const deletedRecord = this.attendanceRecords.splice(recordIndex, 1)[0];
            console.log('Successfully removed attendance record:', deletedRecord);
            console.log('Attendance records count after deletion:', this.attendanceRecords.length);
            
            // Save the updated data synchronously
            this.saveData();
            console.log('Data saved after deletion');
            
            // Verify deletion was successful
            const stillExists = this.attendanceRecords.find(record => {
                return record.id === recordId || 
                       String(record.id) === String(recordId) ||
                       Number(record.id) === Number(recordId);
            });
            
            if (stillExists) {
                console.error('CRITICAL: Record still exists after deletion and save!', stillExists);
                throw new Error('Failed to delete record - still exists after removal and save');
            }
            
            // Broadcast attendance deletion to all systems
            this.emit('attendanceUpdate', { 
                action: 'delete', 
                record: deletedRecord,
                recordId: recordId
            });
            
            this.emit('attendanceRecordDeleted', { 
                record: deletedRecord,
                recordId: recordId
            });
            
            // System-wide broadcast
            this.broadcastSystemWide('attendanceDeleted', {
                record: deletedRecord,
                recordId: recordId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`Successfully deleted and verified attendance record with ID ${recordId}`);
            return deletedRecord;
            
        } catch (error) {
            console.error('Error deleting attendance record by ID:', error);
            throw error;
        }
    }

    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;
        
        try {
            const start = new Date(`2000-01-01T${clockIn}`);
            const end = new Date(`2000-01-01T${clockOut}`);
            const diffMs = end - start;
            
            if (diffMs < 0) return 0;
            
            return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        } catch (error) {
            return 0;
        }
    }

    // Statistics and Analytics
    getEmployeeStats() {
        const total = this.employees.length;
        const active = this.employees.filter(emp => emp.status === 'active').length;
        const departments = [...new Set(this.employees.map(emp => emp.department))];
        
        return {
            total,
            active,
            inactive: total - active,
            departments: departments.length,
            departmentBreakdown: departments.map(dept => ({
                name: dept,
                count: this.employees.filter(emp => emp.department === dept).length
            }))
        };
    }

    getAttendanceStats(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        // Get all attendance records for the target date
        const allRecords = this.getAttendanceRecords({ date: targetDate });
        
        // Create set of current employee IDs for filtering
        const currentEmployeeIds = new Set();
        this.employees.forEach(emp => {
            currentEmployeeIds.add(emp.id);
            currentEmployeeIds.add(String(emp.id));
            if (!isNaN(emp.id)) {
                currentEmployeeIds.add(parseInt(emp.id));
            }
        });
        
        // Filter records to only include current employees
        const records = allRecords.filter(record => {
            const empId = record.employeeId;
            return currentEmployeeIds.has(empId) || 
                   currentEmployeeIds.has(String(empId)) || 
                   currentEmployeeIds.has(parseInt(empId));
        });
        
        const totalEmployees = this.employees.filter(emp => emp.status === 'active').length;
        
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = totalEmployees - present - late;
        const overtime = records.filter(r => r.status === 'overtime').length;
        
        return {
            total: totalEmployees,
            present,
            late,
            absent,
            overtime,
            attendanceRate: totalEmployees > 0 ? ((present + late + overtime) / totalEmployees * 100).toFixed(1) : 0
        };
    }

    // Event System
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index >= 0) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Utility Methods
    searchEmployees(query) {
        if (!query) return this.employees;
        
        const searchTerm = query.toLowerCase();
        return this.employees.filter(emp => 
            emp.fullName.toLowerCase().includes(searchTerm) ||
            emp.firstName.toLowerCase().includes(searchTerm) ||
            emp.lastName.toLowerCase().includes(searchTerm) ||
            emp.employeeCode.toLowerCase().includes(searchTerm) ||
            emp.email.toLowerCase().includes(searchTerm) ||
            emp.department.toLowerCase().includes(searchTerm) ||
            emp.position.toLowerCase().includes(searchTerm)
        );
    }

    getEmployeesByDepartment(department) {
        return this.employees.filter(emp => emp.department === department);
    }

    getDepartments() {
        const departments = [...new Set(this.employees.map(emp => emp.department))];
        return departments.sort();
    }

    // Data Migration and Cleanup
    migrateOldData() {
        // Clean up old storage keys
        const oldKeys = ['bricks-attendance-data', 'employee-data', 'attendance-data'];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`Removing old storage key: ${key}`);
                localStorage.removeItem(key);
            }
        });
        
        this.saveData();
    }

    clearAllData() {
        console.log('Clearing all unified employee manager data...');
        this.employees = [];
        this.attendanceRecords = [];
        this.initialized = false; // Mark as not initialized to force proper re-init
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.syncKey);
        this.emit('dataSync', { action: 'clear' });
        console.log('All data cleared - manager will re-initialize with original mock data on next init()');
    }

    /**
     * Force cleanup of all orphaned data - public method for manual cleanup
     */
    forceCleanupOrphanedData() {
        console.log('🔧 FORCE CLEANUP: Starting comprehensive data cleanup...');
        
        const beforeEmployees = this.employees.length;
        const beforeAttendance = this.attendanceRecords.length;
        
        // First, deduplicate employees
        const uniqueEmployees = this.deduplicateEmployees(this.employees);
        this.employees = uniqueEmployees;
        
        // Then, deduplicate attendance
        const uniqueAttendance = this.deduplicateAttendance(this.attendanceRecords);
        this.attendanceRecords = uniqueAttendance;
        
        // Finally, cleanup orphaned records
        const cleanupResult = this.cleanupOrphanedAttendanceRecords();
        
        // Save the cleaned data
        this.saveData();
        
        const result = {
            beforeEmployees,
            beforeAttendance,
            afterEmployees: this.employees.length,
            afterAttendance: this.attendanceRecords.length,
            removedEmployees: beforeEmployees - this.employees.length,
            removedAttendance: beforeAttendance - this.attendanceRecords.length,
            orphanedRecords: cleanupResult.orphanedRecords
        };
        
        console.log('🔧 FORCE CLEANUP COMPLETE:', result);
        
        // Broadcast the cleanup
        this.emit('dataSync', { 
            action: 'forceCleanup', 
            result: result,
            timestamp: new Date().toISOString()
        });
        
        return result;
    }
}

// Global instance
window.unifiedEmployeeManager = new UnifiedEmployeeManager();

// Auto-initialize with proper timing to ensure mock data is available
function initializeUnifiedManager() {
    // Check if mock data is available
    if (typeof mockData !== 'undefined') {
        console.log('Mock data available, initializing unified employee manager...');
        window.unifiedEmployeeManager.init().catch(console.error);
    } else {
        console.log('Mock data not yet available, retrying in 100ms...');
        setTimeout(initializeUnifiedManager, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Give a short delay to ensure all scripts are loaded
        setTimeout(initializeUnifiedManager, 50);
    });
} else {
    // Give a short delay to ensure all scripts are loaded
    setTimeout(initializeUnifiedManager, 50);
}
