/**
 * ID Utility - Centralized ID matching and conversion functions
 * Handles both string and numeric IDs consistently across the system
 */

class IdUtility {
    /**
     * Robust ID matching that handles both string and numeric IDs
     * @param {any} id1 - First ID to compare
     * @param {any} id2 - Second ID to compare
     * @returns {boolean} True if IDs match
     */
    static idsMatch(id1, id2) {
        // Direct match first (handles exact matches including string IDs like "emp_001")
        if (id1 === id2) return true;
        
        // Try numeric comparison for legacy support
        const numericId1 = parseInt(id1);
        const numericId2 = parseInt(id2);
        if (!isNaN(numericId1) && !isNaN(numericId2)) {
            return numericId1 === numericId2;
        }
        
        // Try string comparison as fallback
        return String(id1) === String(id2);
    }

    /**
     * Find an employee by ID using robust matching
     * @param {Array} employees - Array of employee objects
     * @param {any} id - ID to search for
     * @returns {Object|undefined} Found employee or undefined
     */
    static findEmployeeById(employees, id) {
        return employees.find(emp => this.idsMatch(emp.id, id));
    }

    /**
     * Find employee index by ID using robust matching
     * @param {Array} employees - Array of employee objects
     * @param {any} id - ID to search for
     * @returns {number} Index of employee or -1 if not found
     */
    static findEmployeeIndex(employees, id) {
        return employees.findIndex(emp => this.idsMatch(emp.id, id));
    }

    /**
     * Filter attendance records by employee ID using robust matching
     * @param {Array} records - Array of attendance records
     * @param {any} employeeId - Employee ID to filter by
     * @returns {Array} Filtered records
     */
    static filterRecordsByEmployeeId(records, employeeId) {
        return records.filter(record => this.idsMatch(record.employeeId, employeeId));
    }

    /**
     * Normalize an ID to the current system format
     * If the system uses string IDs (emp_XXX), convert numeric IDs to that format
     * @param {any} id - ID to normalize
     * @param {string} format - Target format ('string' or 'number')
     * @returns {any} Normalized ID
     */
    static normalizeId(id, format = 'string') {
        if (format === 'string') {
            // If it's already a string starting with emp_, return as-is
            if (typeof id === 'string' && id.startsWith('emp_')) {
                return id;
            }
            
            // If it's a number or numeric string, convert to emp_XXX format
            const numericId = parseInt(id);
            if (!isNaN(numericId)) {
                return `emp_${String(numericId).padStart(3, '0')}`;
            }
            
            // Return as string
            return String(id);
        } else if (format === 'number') {
            const numericId = parseInt(id);
            return isNaN(numericId) ? id : numericId;
        }
        
        return id;
    }

    /**
     * Validate and fix attendance record employee IDs
     * @param {Array} attendanceRecords - Array of attendance records
     * @param {Array} employees - Array of employees
     * @returns {Object} Fix results with count and details
     */
    static fixAttendanceRecordIds(attendanceRecords, employees) {
        let fixedCount = 0;
        const fixes = [];

        attendanceRecords.forEach(record => {
            const employee = this.findEmployeeById(employees, record.employeeId);
            if (employee && record.employeeId !== employee.id) {
                fixes.push({
                    oldId: record.employeeId,
                    newId: employee.id,
                    employee: `${employee.firstName} ${employee.lastName}`,
                    date: record.date
                });
                record.employeeId = employee.id;
                fixedCount++;
            }
        });

        return {
            fixedCount,
            fixes,
            message: fixedCount > 0 ? 
                `Fixed ${fixedCount} attendance record IDs` : 
                'All attendance records already have correct IDs'
        };
    }

    /**
     * Get ID type statistics for debugging
     * @param {Array} items - Array of items with ID field
     * @param {string} idField - Name of the ID field (default: 'id')
     * @returns {Object} Statistics about ID types
     */
    static getIdTypeStats(items, idField = 'id') {
        const stats = {
            total: items.length,
            types: {},
            formats: {
                numeric: 0,
                empPrefix: 0,
                other: 0
            }
        };

        items.forEach(item => {
            const id = item[idField];
            const type = typeof id;
            
            // Count by type
            stats.types[type] = (stats.types[type] || 0) + 1;
            
            // Count by format
            if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
                stats.formats.numeric++;
            } else if (typeof id === 'string' && id.startsWith('emp_')) {
                stats.formats.empPrefix++;
            } else {
                stats.formats.other++;
            }
        });

        return stats;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.IdUtility = IdUtility;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdUtility;
}
