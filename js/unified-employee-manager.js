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
            dataSync: [],
            settingsUpdate: []
        };
        
        // Don't auto-initialize in constructor - let the global init function handle it
        // this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing Unified Employee Manager...');
            
            // Wait for backend API service to be available
            if (window.backendApiService) {
                await window.backendApiService.init();
                console.log('🔗 Backend API Service integrated');
            }
            
            // Try to load from backend first, then fallback to local
            await this.loadData();
            
            // Set up cross-tab synchronization
            this.setupCrossTabSync();
            
            this.initialized = true;
            console.log('Unified Employee Manager initialized with:', {
                employees: this.employees.length,
                attendanceRecords: this.attendanceRecords.length
            });
            
            // Auto-sync with backend if available
            if (window.backendApiService && window.backendApiService.isAvailable) {
                console.log('🔄 Setting up auto-sync with backend...');
                // Sync every 5 minutes
                setInterval(() => {
                    this.syncToBackend();
                }, 300000);
            }
            
            this.emit('dataSync', { action: 'initialized' });
            
        } catch (error) {
            console.error('Failed to initialize Unified Employee Manager:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            // 🎯 PRIORITY 1: Try to load from backend database first
            if (window.backendApiService && window.backendApiService.isAvailable) {
                console.log('🔗 Attempting to load data from backend database...');
                const backendData = await window.backendApiService.loadFromBackend();
                
                if (backendData && backendData.employees && backendData.attendanceRecords) {
                    this.employees = backendData.employees;
                    this.attendanceRecords = backendData.attendanceRecords;
                    
                    console.log('✅ Loaded data from backend database:', {
                        employees: this.employees.length,
                        attendance: this.attendanceRecords.length
                    });

                    // Ensure today's attendance data exists
                    this.ensureTodayAttendanceData();
                    
                    // Save to localStorage as backup
                    this.saveToLocalStorage();
                    return;
                }
            }

            // PRIORITY 2: Try to load from localStorage
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.employees = data.employees || [];
                this.attendanceRecords = data.attendanceRecords || [];
                console.log('📦 Loaded data from localStorage:', {
                    employees: this.employees.length,
                    attendance: this.attendanceRecords.length
                });
                
                this.ensureTodayAttendanceData();
                return;
            }

            // PRIORITY 3: Try to migrate from existing sources
            await this.migrateFromExistingSources();
            
            // PRIORITY 4: If no data found, create initial data
            if (this.employees.length === 0) {
                console.log('No data found during migration, creating initial data...');
                await this.createInitialData();
            } else {
                this.ensureTodayAttendanceData();
            }
            
            // Sync to backend if available
            if (window.backendApiService && window.backendApiService.isAvailable) {
                console.log('🔄 Syncing initial data to backend...');
                await this.syncToBackend();
            }
            
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
        
        // Note: Legacy dataManager support removed - using direct data service integration

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
        
        // Only save unified data if we actually found some employees
        if (this.employees.length > 0) {
            console.log('Migration found data, saving...');
            this.saveData();
            
            // Clean up old data sources to prevent conflicts
            this.cleanupOldDataSources();
        } else {
            console.log('Migration found no employees, will need to create initial data');
        }
        
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
        
        // Add sample attendance records for today to prevent dashboard showing 0 present
        this.ensureTodayAttendanceData();
        
        this.saveData();
    }

    /**
     * Create minimal fallback data when mock data is not available
     */
    createFallbackData() {
        console.warn('🚨 USING FALLBACK DATA - Mock data failed to load!');
        console.warn('Creating 3 fallback employees instead of full mock data set');
        this.employees = [
            {
                id: 1,
                employeeCode: 'emp_001',
                firstName: 'Fallback',
                lastName: 'Employee 1',
                fullName: 'Fallback Employee 1',
                name: 'Fallback Employee 1',
                email: 'fallback1@company.com',
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
                firstName: 'Fallback',
                lastName: 'Employee 2',
                fullName: 'Fallback Employee 2',
                name: 'Fallback Employee 2',
                email: 'fallback2@company.com',
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
                firstName: 'Fallback',
                lastName: 'Employee 3',
                fullName: 'Fallback Employee 3',
                name: 'Fallback Employee 3',
                email: 'fallback3@company.com',
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
        
        // Add sample attendance for today
        this.ensureTodayAttendanceData();
    }

    /**
     * Ensure there are attendance records for today to show meaningful dashboard stats
     */
    ensureTodayAttendanceData() {
        const today = new Date().toISOString().split('T')[0];
        
        console.log('🎯 ensureTodayAttendanceData() called for date:', today);
        console.log('🎯 Current attendance records count:', this.attendanceRecords.length);
        console.log('🎯 Current employees count:', this.employees.length);
        
        // Check if we already have attendance records for today
        const todayRecords = this.attendanceRecords.filter(record => 
            record.date === today || record.clockInDate === today
        );
        
        console.log('🎯 Existing records for today:', todayRecords.length);
        if (todayRecords.length > 0) {
            console.log('🎯 Existing today records:', todayRecords.map(r => `${r.employeeName} (${r.status})`));
        }
        
        if (todayRecords.length === 0 && this.employees.length > 0) {
            console.log('🎯 Creating sample attendance records for today to show meaningful dashboard stats');
            console.log('Current date for attendance:', today);
            console.log('Active employees count:', this.employees.filter(emp => emp.status === 'active').length);
            
            // Create sample attendance for most employees (simulate realistic attendance)
            const activeEmployees = this.employees.filter(emp => emp.status === 'active');
            const sampleAttendance = [];
            
            console.log('🎯 Active employees for attendance creation:', activeEmployees.map(e => e.fullName || e.name));
            
            activeEmployees.forEach((emp, index) => {
                // Use deterministic "randomness" based on employee ID and date
                // This ensures the same pattern is generated every time for the same day
                const seed = this.createDateSeed(today, emp.id);
                const attendanceChance = this.seededRandom(seed, 1);
                const lateChance = this.seededRandom(seed, 2);
                const timeVariation = this.seededRandom(seed, 3);
                
                // Simulate 80% attendance rate with deterministic pattern
                if (attendanceChance < 0.8 || index < 3) { // Ensure at least first 3 are present
                    const isLate = lateChance < 0.2; // 20% chance of being late (but deterministic)
                    const baseTime = isLate ? '09:15:00' : '09:00:00';
                    const clockInTime = this.addDeterministicMinutes(baseTime, timeVariation, isLate ? 30 : 15);
                    
                    const attendanceRecord = {
                        id: `att_${today}_${emp.id}`,
                        employeeId: emp.id,
                        employeeName: emp.fullName || emp.name,
                        date: today,  // This is the key field for filtering
                        clockInDate: today,
                        clockInTime: clockInTime,
                        timeIn: clockInTime,
                        status: isLate ? 'late' : 'present',
                        clockIn: `${today}T${clockInTime}`,
                        notes: isLate ? 'Late arrival' : 'On time',
                        createdAt: new Date().toISOString()
                    };
                    
                    sampleAttendance.push(attendanceRecord);
                    console.log(`✅ Created attendance for ${emp.fullName || emp.name}: ${attendanceRecord.status} at ${clockInTime}`);
                }
            });
            
            console.log(`✅ Created ${sampleAttendance.length} sample attendance records for today`);
            console.log('Sample attendance summary:', sampleAttendance.map(att => `${att.employeeName} (${att.status})`));
            
            // Add to existing attendance records
            const beforeCount = this.attendanceRecords.length;
            this.attendanceRecords = [...this.attendanceRecords, ...sampleAttendance];
            
            console.log('🎯 Total attendance records after adding today\'s data:', this.attendanceRecords.length);
            console.log(`🎯 Added ${this.attendanceRecords.length - beforeCount} new records`);
            
            // Verify the records were added correctly
            const verifyTodayRecords = this.attendanceRecords.filter(record => record.date === today);
            console.log('🎯 Verification - Records with today\'s date:', verifyTodayRecords.length);
            
        } else if (todayRecords.length > 0) {
            console.log(`✅ Found ${todayRecords.length} existing attendance records for today`);
            console.log('Existing records:', todayRecords.map(rec => `${rec.employeeName} (${rec.status})`));
        } else {
            console.log('⚠️ No active employees found to create attendance records for');
        }
    }

    /**
     * Helper method to add random minutes to a time string
     */
    addRandomMinutes(timeStr, maxMinutes) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + Math.floor(Math.random() * maxMinutes);
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`;
    }

    /**
     * Create a deterministic seed based on date and employee ID
     */
    createDateSeed(date, employeeId) {
        // Create a consistent seed from date and employee ID
        const dateNumber = parseInt(date.replace(/-/g, ''));
        const empIdNumber = parseInt(employeeId) || 1;
        return dateNumber + empIdNumber;
    }

    /**
     * Generate a deterministic "random" number between 0 and 1 based on a seed
     */
    seededRandom(seed, variation = 1) {
        // Simple deterministic pseudo-random generator
        const x = Math.sin(seed * variation) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Add deterministic minutes to a time string (replaces Math.random())
     */
    addDeterministicMinutes(timeStr, randomValue, maxMinutes) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const additionalMinutes = Math.floor(randomValue * maxMinutes);
        const totalMinutes = hours * 60 + minutes + additionalMinutes;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`;
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
            
            // Save to localStorage
            this.saveToLocalStorage(data);
            
            // Sync to backend if available (async, don't wait)
            this.syncToBackend().catch(error => {
                console.warn('Backend sync failed:', error);
            });
            
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    saveToLocalStorage(data = null) {
        try {
            const dataToSave = data || {
                employees: this.employees,
                attendanceRecords: this.attendanceRecords,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            // Save to primary unified storage
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            
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
     * Backend Integration Methods
     */

    // Sync data to backend
    async syncToBackend() {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            console.log('⚠️ Backend not available for sync');
            return { success: false, message: 'Backend not available' };
        }

        try {
            console.log('🔄 Syncing to backend...', {
                employees: this.employees.length,
                attendance: this.attendanceRecords.length
            });

            const result = await window.backendApiService.syncToBackend(
                this.employees,
                this.attendanceRecords
            );

            if (result.success) {
                console.log('✅ Backend sync completed successfully');
            } else {
                console.warn('⚠️ Backend sync failed:', result.message);
            }

            return result;
        } catch (error) {
            console.error('❌ Backend sync error:', error);
            return { success: false, message: error.message };
        }
    }

    // Load data from backend
    async loadFromBackend() {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            console.log('⚠️ Backend not available for loading');
            return null;
        }

        try {
            console.log('📥 Loading from backend...');
            const data = await window.backendApiService.loadFromBackend();
            
            if (data && data.employees && data.attendanceRecords) {
                console.log('✅ Backend data loaded successfully');
                return data;
            } else {
                console.warn('⚠️ No valid data from backend');
                return null;
            }
        } catch (error) {
            console.error('❌ Backend load error:', error);
            return null;
        }
    }

    // Save individual employee to backend
    async saveEmployeeToBackend(employee) {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            return { success: false, message: 'Backend not available' };
        }

        try {
            const result = await window.backendApiService.saveEmployee(employee);
            return result;
        } catch (error) {
            console.error('❌ Failed to save employee to backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Save individual attendance record to backend
    async saveAttendanceToBackend(record) {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            return { success: false, message: 'Backend not available' };
        }

        try {
            const result = await window.backendApiService.saveAttendanceRecord(record);
            return result;
        } catch (error) {
            console.error('❌ Failed to save attendance to backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Delete employee from backend
    async deleteEmployeeFromBackend(employeeId) {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            return { success: false, message: 'Backend not available' };
        }

        try {
            const result = await window.backendApiService.deleteEmployee(employeeId);
            return result;
        } catch (error) {
            console.error('❌ Failed to delete employee from backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Check backend health and availability
    async checkBackendHealth() {
        if (!window.backendApiService) {
            return false;
        }

        try {
            const isHealthy = await window.backendApiService.healthCheck();
            console.log('🔗 Backend health check:', isHealthy ? 'Healthy' : 'Unhealthy');
            return isHealthy;
        } catch (error) {
            console.error('❌ Backend health check failed:', error);
            return false;
        }
    }

    // Manual sync trigger for debugging/admin
    async forceSyncToBackend() {
        console.log('🔄 Force syncing to backend...');
        const result = await this.syncToBackend();
        
        if (result.success) {
            this.emit('dataSync', { 
                action: 'force_sync_to_backend', 
                success: true,
                message: 'Force sync to backend completed successfully'
            });
        } else {
            this.emit('dataSync', { 
                action: 'force_sync_to_backend', 
                success: false,
                message: result.message
            });
        }
        
        return result;
    }

    // Manual load trigger for debugging/admin
    async forceLoadFromBackend() {
        console.log('📥 Force loading from backend...');
        const data = await this.loadFromBackend();
        
        if (data) {
            // Update local data
            this.employees = data.employees;
            this.attendanceRecords = data.attendanceRecords;
            
            // Ensure data consistency
            this.ensureTodayAttendanceData();
            
            // Save to localStorage
            this.saveToLocalStorage();
            
            this.emit('dataSync', { 
                action: 'force_load_from_backend', 
                success: true,
                message: 'Force load from backend completed successfully',
                data: {
                    employees: this.employees.length,
                    attendance: this.attendanceRecords.length
                }
            });
            
            return { success: true, data };
        } else {
            this.emit('dataSync', { 
                action: 'force_load_from_backend', 
                success: false,
                message: 'Failed to load data from backend'
            });
            
            return { success: false, message: 'Failed to load data from backend' };
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
        
        // Note: Legacy dataManager support removed - using direct data service integration

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
        
        // Only save unified data if we actually found some employees
        if (this.employees.length > 0) {
            console.log('Migration found data, saving...');
            this.saveData();
            
            // Clean up old data sources to prevent conflicts
            this.cleanupOldDataSources();
        } else {
            console.log('Migration found no employees, will need to create initial data');
        }
        
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
        
        // Add sample attendance records for today to prevent dashboard showing 0 present
        this.ensureTodayAttendanceData();
        
        this.saveData();
    }

    /**
     * Create minimal fallback data when mock data is not available
     */
    createFallbackData() {
        console.warn('🚨 USING FALLBACK DATA - Mock data failed to load!');
        console.warn('Creating 3 fallback employees instead of full mock data set');
        this.employees = [
            {
                id: 1,
                employeeCode: 'emp_001',
                firstName: 'Fallback',
                lastName: 'Employee 1',
                fullName: 'Fallback Employee 1',
                name: 'Fallback Employee 1',
                email: 'fallback1@company.com',
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
                firstName: 'Fallback',
                lastName: 'Employee 2',
                fullName: 'Fallback Employee 2',
                name: 'Fallback Employee 2',
                email: 'fallback2@company.com',
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
                firstName: 'Fallback',
                lastName: 'Employee 3',
                fullName: 'Fallback Employee 3',
                name: 'Fallback Employee 3',
                email: 'fallback3@company.com',
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
        
        // Add sample attendance for today
        this.ensureTodayAttendanceData();
    }

    /**
     * Ensure there are attendance records for today to show meaningful dashboard stats
     */
    ensureTodayAttendanceData() {
        const today = new Date().toISOString().split('T')[0];
        
        console.log('🎯 ensureTodayAttendanceData() called for date:', today);
        console.log('🎯 Current attendance records count:', this.attendanceRecords.length);
        console.log('🎯 Current employees count:', this.employees.length);
        
        // Check if we already have attendance records for today
        const todayRecords = this.attendanceRecords.filter(record => 
            record.date === today || record.clockInDate === today
        );
        
        console.log('🎯 Existing records for today:', todayRecords.length);
        if (todayRecords.length > 0) {
            console.log('🎯 Existing today records:', todayRecords.map(r => `${r.employeeName} (${r.status})`));
        }
        
        if (todayRecords.length === 0 && this.employees.length > 0) {
            console.log('🎯 Creating sample attendance records for today to show meaningful dashboard stats');
            console.log('Current date for attendance:', today);
            console.log('Active employees count:', this.employees.filter(emp => emp.status === 'active').length);
            
            // Create sample attendance for most employees (simulate realistic attendance)
            const activeEmployees = this.employees.filter(emp => emp.status === 'active');
            const sampleAttendance = [];
            
            console.log('🎯 Active employees for attendance creation:', activeEmployees.map(e => e.fullName || e.name));
            
            activeEmployees.forEach((emp, index) => {
                // Use deterministic "randomness" based on employee ID and date
                // This ensures the same pattern is generated every time for the same day
                const seed = this.createDateSeed(today, emp.id);
                const attendanceChance = this.seededRandom(seed, 1);
                const lateChance = this.seededRandom(seed, 2);
                const timeVariation = this.seededRandom(seed, 3);
                
                // Simulate 80% attendance rate with deterministic pattern
                if (attendanceChance < 0.8 || index < 3) { // Ensure at least first 3 are present
                    const isLate = lateChance < 0.2; // 20% chance of being late (but deterministic)
                    const baseTime = isLate ? '09:15:00' : '09:00:00';
                    const clockInTime = this.addDeterministicMinutes(baseTime, timeVariation, isLate ? 30 : 15);
                    
                    const attendanceRecord = {
                        id: `att_${today}_${emp.id}`,
                        employeeId: emp.id,
                        employeeName: emp.fullName || emp.name,
                        date: today,  // This is the key field for filtering
                        clockInDate: today,
                        clockInTime: clockInTime,
                        timeIn: clockInTime,
                        status: isLate ? 'late' : 'present',
                        clockIn: `${today}T${clockInTime}`,
                        notes: isLate ? 'Late arrival' : 'On time',
                        createdAt: new Date().toISOString()
                    };
                    
                    sampleAttendance.push(attendanceRecord);
                    console.log(`✅ Created attendance for ${emp.fullName || emp.name}: ${attendanceRecord.status} at ${clockInTime}`);
                }
            });
            
            console.log(`✅ Created ${sampleAttendance.length} sample attendance records for today`);
            console.log('Sample attendance summary:', sampleAttendance.map(att => `${att.employeeName} (${att.status})`));
            
            // Add to existing attendance records
            const beforeCount = this.attendanceRecords.length;
            this.attendanceRecords = [...this.attendanceRecords, ...sampleAttendance];
            
            console.log('🎯 Total attendance records after adding today\'s data:', this.attendanceRecords.length);
            console.log(`🎯 Added ${this.attendanceRecords.length - beforeCount} new records`);
            
            // Verify the records were added correctly
            const verifyTodayRecords = this.attendanceRecords.filter(record => record.date === today);
            console.log('🎯 Verification - Records with today\'s date:', verifyTodayRecords.length);
            
        } else if (todayRecords.length > 0) {
            console.log(`✅ Found ${todayRecords.length} existing attendance records for today`);
            console.log('Existing records:', todayRecords.map(rec => `${rec.employeeName} (${rec.status})`));
        } else {
            console.log('⚠️ No active employees found to create attendance records for');
        }
    }

    /**
     * Helper method to add random minutes to a time string
     */
    addRandomMinutes(timeStr, maxMinutes) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + Math.floor(Math.random() * maxMinutes);
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`;
    }

    /**
     * Create a deterministic seed based on date and employee ID
     */
    createDateSeed(date, employeeId) {
        // Create a consistent seed from date and employee ID
        const dateNumber = parseInt(date.replace(/-/g, ''));
        const empIdNumber = parseInt(employeeId) || 1;
        return dateNumber + empIdNumber;
    }

    /**
     * Generate a deterministic "random" number between 0 and 1 based on a seed
     */
    seededRandom(seed, variation = 1) {
        // Simple deterministic pseudo-random generator
        const x = Math.sin(seed * variation) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Add deterministic minutes to a time string (replaces Math.random())
     */
    addDeterministicMinutes(timeStr, randomValue, maxMinutes) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const additionalMinutes = Math.floor(randomValue * maxMinutes);
        const totalMinutes = hours * 60 + minutes + additionalMinutes;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`;
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
            
            // Save to localStorage
            this.saveToLocalStorage(data);
            
            // Sync to backend if available (async, don't wait)
            this.syncToBackend().catch(error => {
                console.warn('Backend sync failed:', error);
            });
            
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    saveToLocalStorage(data = null) {
        try {
            const dataToSave = data || {
                employees: this.employees,
                attendanceRecords: this.attendanceRecords,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            // Save to primary unified storage
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            
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
            
            // Create initial attendance record with "waiting" status for today
            const today = new Date().toISOString().split('T')[0];
            const initialAttendanceRecord = {
                id: Date.now(),
                employeeId: newEmployee.id,
                employeeCode: newEmployee.employeeCode,
                employeeName: newEmployee.fullName,
                department: newEmployee.department || 'Unassigned',
                date: today,
                clockIn: null,
                clockOut: null,
                status: 'waiting',
                hours: 0,
                notes: 'New employee - waiting for first check-in',
                lastModified: new Date().toISOString()
            };
            
            this.attendanceRecords.push(initialAttendanceRecord);
            this.saveData();
            
            // Broadcast employee addition to all systems
            this.emit('employeeUpdate', { action: 'add', employee: newEmployee });
            this.emit('employeeAdded', { employee: newEmployee });
            
            // Broadcast attendance record creation
            this.emit('attendanceUpdate', { action: 'add', record: initialAttendanceRecord });
            
            return newEmployee;
        } catch (error) {
            console.error('Failed to add employee:', error);
            throw error;
        }
    }

    // Backend integration methods
    async syncToBackend() {
        if (!window.backendApiService?.isAvailable) return { success: false };
        try {
            return await window.backendApiService.syncToBackend(this.employees, this.attendanceRecords);
        } catch (error) {
            console.error('Backend sync error:', error);
            return { success: false, message: error.message };
        }
    }

    async forceLoadFromBackend() {
        if (!window.backendApiService?.isAvailable) return { success: false };
        try {
            const data = await window.backendApiService.loadFromBackend();
            if (data) {
                this.employees = data.employees;
                this.attendanceRecords = data.attendanceRecords;
                this.ensureTodayAttendanceData();
                this.saveToLocalStorage();
                this.emit('dataSync', { action: 'backend_load', success: true });
                return { success: true, data };
            }
            return { success: false };
        } catch (error) {
            console.error('Backend load error:', error);
            return { success: false, message: error.message };
        }
    }
}