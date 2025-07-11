// Payroll calculation and management module for the Bricks Attendance System
class Payroll {
    constructor() {
        this.dataStore = DataStore.getInstance();
    }

    /**
     * Calculate gross pay for an employee based on hours worked
     * @param {number} regularHours 
     * @param {number} overtimeHours 
     * @param {number} hourlyRate 
     * @param {number} overtimeRate 
     * @returns {object}
     */
    calculateGrossPay(regularHours, overtimeHours, hourlyRate, overtimeRate = 1.5) {
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * overtimeRate;
        const grossPay = regularPay + overtimePay;

        return {
            regularHours,
            overtimeHours,
            regularPay: Math.round(regularPay * 100) / 100,
            overtimePay: Math.round(overtimePay * 100) / 100,
            grossPay: Math.round(grossPay * 100) / 100
        };
    }

    /**
     * Calculate hours breakdown for payroll period
     * @param {Array} attendanceRecords 
     * @param {number} standardHours 
     * @returns {object}
     */
    calculateHoursBreakdown(attendanceRecords, standardHours = 8) {
        let totalHours = 0;
        let workDays = 0;

        attendanceRecords.forEach(record => {
            if (record.hoursWorked > 0) {
                totalHours += record.hoursWorked;
                workDays++;
            }
        });

        const expectedHours = workDays * standardHours;
        const regularHours = Math.min(totalHours, expectedHours);
        const overtimeHours = Math.max(0, totalHours - expectedHours);

        return {
            totalHours: Math.round(totalHours * 100) / 100,
            regularHours: Math.round(regularHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            workDays
        };
    }

    /**
     * Calculate deductions (basic tax estimation)
     * @param {number} grossPay 
     * @returns {object}
     */
    calculateDeductions(grossPay) {
        // Simplified tax calculation (this would be more complex in reality)
        const federalTax = grossPay * 0.10; // 10% federal tax estimate
        const stateTax = grossPay * 0.05; // 5% state tax estimate
        const socialSecurity = grossPay * 0.062; // 6.2% Social Security
        const medicare = grossPay * 0.0145; // 1.45% Medicare
        
        const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
        const netPay = grossPay - totalDeductions;

        return {
            federalTax: Math.round(federalTax * 100) / 100,
            stateTax: Math.round(stateTax * 100) / 100,
            socialSecurity: Math.round(socialSecurity * 100) / 100,
            medicare: Math.round(medicare * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            netPay: Math.round(netPay * 100) / 100
        };
    }

    /**
     * Generate payroll for a specific period
     * @param {string} employeeId 
     * @param {string} startDate 
     * @param {string} endDate 
     * @returns {Promise<object>}
     */
    async generatePayroll(employeeId, startDate, endDate) {
        try {
            const employee = await this.dataStore.getEmployee(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const settings = await this.dataStore.getSettings();
            const payrollSettings = settings.payroll || {};
            
            const hourlyRate = payrollSettings.standardWage || 15.00;
            const overtimeRate = payrollSettings.overtimeRate || 1.5;
            const standardHours = settings.company?.workingHours || 8;

            // Get attendance records for the period
            const attendanceRecords = await this.dataStore.getAttendance({
                employeeId,
                startDate,
                endDate
            });

            // Calculate hours breakdown
            const hoursBreakdown = this.calculateHoursBreakdown(attendanceRecords, standardHours);

            // Calculate gross pay
            const grossPayData = this.calculateGrossPay(
                hoursBreakdown.regularHours,
                hoursBreakdown.overtimeHours,
                hourlyRate,
                overtimeRate
            );

            // Calculate deductions
            const deductions = this.calculateDeductions(grossPayData.grossPay);

            // Create payroll record
            const payrollRecord = {
                employeeId,
                employeeName: employee.fullName,
                payPeriodStart: startDate,
                payPeriodEnd: endDate,
                hourlyRate,
                overtimeRate,
                ...hoursBreakdown,
                ...grossPayData,
                ...deductions,
                payDate: this.getNextPayDate(endDate, payrollSettings.frequency),
                status: 'calculated',
                generatedAt: new Date().toISOString()
            };

            return payrollRecord;
        } catch (error) {
            console.error('Error generating payroll:', error);
            throw error;
        }
    }

    /**
     * Get next pay date based on frequency
     * @param {string} periodEndDate 
     * @param {string} frequency 
     * @returns {string}
     */
    getNextPayDate(periodEndDate, frequency = 'biweekly') {
        const endDate = new Date(periodEndDate);
        let payDate = new Date(endDate);

        switch (frequency) {
            case 'weekly':
                payDate.setDate(endDate.getDate() + 3); // Pay 3 days after period end
                break;
            case 'biweekly':
                payDate.setDate(endDate.getDate() + 5); // Pay 5 days after period end
                break;
            case 'monthly':
                payDate.setDate(endDate.getDate() + 7); // Pay 7 days after period end
                break;
            default:
                payDate.setDate(endDate.getDate() + 5);
        }

        return payDate.toISOString().split('T')[0];
    }

    /**
     * Calculate next payday countdown
     * @returns {Promise<object>}
     */
    async calculatePaydayCountdown() {
        try {
            const settings = await this.dataStore.getSettings();
            const frequency = settings.payroll?.frequency || 'biweekly';
            
            const today = new Date();
            const nextPayday = this.getNextPaydayDate(today, frequency);
            const daysUntilPayday = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));

            // Calculate estimated amount for current user
            const currentUser = Auth.getCurrentUser();
            let estimatedAmount = 0;

            if (currentUser) {
                const employee = await this.getEmployeeByUsername(currentUser.username);
                if (employee) {
                    estimatedAmount = await this.estimateCurrentPeriodPay(employee.id);
                }
            }

            return {
                nextPayday: nextPayday.toISOString().split('T')[0],
                daysUntilPayday: Math.max(0, daysUntilPayday),
                estimatedAmount: Math.round(estimatedAmount * 100) / 100,
                frequency
            };
        } catch (error) {
            console.error('Error calculating payday countdown:', error);
            return {
                nextPayday: new Date().toISOString().split('T')[0],
                daysUntilPayday: 0,
                estimatedAmount: 0,
                frequency: 'biweekly'
            };
        }
    }

    /**
     * Get next payday date based on frequency
     * @param {Date} fromDate 
     * @param {string} frequency 
     * @returns {Date}
     */
    getNextPaydayDate(fromDate, frequency) {
        const date = new Date(fromDate);
        
        switch (frequency) {
            case 'weekly':
                // Next Friday
                const daysUntilFriday = (5 - date.getDay() + 7) % 7;
                date.setDate(date.getDate() + (daysUntilFriday || 7));
                break;
            
            case 'biweekly':
                // Every other Friday (assuming a reference point)
                const daysUntilBiweeklyFriday = (5 - date.getDay() + 7) % 7;
                date.setDate(date.getDate() + (daysUntilBiweeklyFriday || 14));
                break;
            
            case 'monthly':
                // Last day of the month
                date.setMonth(date.getMonth() + 1, 0);
                break;
            
            default:
                // Default to next Friday
                const defaultDays = (5 - date.getDay() + 7) % 7;
                date.setDate(date.getDate() + (defaultDays || 7));
        }

        return date;
    }

    /**
     * Estimate pay for current period
     * @param {string} employeeId 
     * @returns {Promise<number>}
     */
    async estimateCurrentPeriodPay(employeeId) {
        try {
            const settings = await this.dataStore.getSettings();
            const frequency = settings.payroll?.frequency || 'biweekly';
            
            // Calculate current pay period start date
            const today = new Date();
            const periodStart = this.getCurrentPeriodStart(today, frequency);
            const periodStartStr = periodStart.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

            // Generate payroll for current period
            const payrollData = await this.generatePayroll(employeeId, periodStartStr, todayStr);
            
            return payrollData.netPay || 0;
        } catch (error) {
            console.error('Error estimating current period pay:', error);
            return 0;
        }
    }

    /**
     * Get current pay period start date
     * @param {Date} fromDate 
     * @param {string} frequency 
     * @returns {Date}
     */
    getCurrentPeriodStart(fromDate, frequency) {
        const date = new Date(fromDate);
        
        switch (frequency) {
            case 'weekly':
                // Start of current week (Monday)
                const dayOfWeek = date.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                date.setDate(date.getDate() - daysToMonday);
                break;
            
            case 'biweekly':
                // Start of current biweekly period (Monday)
                const biweeklyDayOfWeek = date.getDay();
                const daysToBiweeklyMonday = biweeklyDayOfWeek === 0 ? 6 : biweeklyDayOfWeek - 1;
                date.setDate(date.getDate() - daysToBiweeklyMonday);
                
                // Adjust to biweekly boundary (this is simplified)
                const weekNumber = Math.floor(date.getDate() / 7);
                if (weekNumber % 2 === 1) {
                    date.setDate(date.getDate() - 7);
                }
                break;
            
            case 'monthly':
                // First day of current month
                date.setDate(1);
                break;
            
            default:
                // Default to start of week
                const defaultDayOfWeek = date.getDay();
                const defaultDaysToMonday = defaultDayOfWeek === 0 ? 6 : defaultDayOfWeek - 1;
                date.setDate(date.getDate() - defaultDaysToMonday);
        }

        return date;
    }

    /**
     * Get employee by username
     * @param {string} username 
     * @returns {Promise<object|null>}
     */
    async getEmployeeByUsername(username) {
        const employees = await this.dataStore.getEmployees();
        return employees.find(emp => emp.username === username) || null;
    }

    /**
     * Save payroll record
     * @param {object} payrollRecord 
     * @returns {Promise<object>}
     */
    async savePayrollRecord(payrollRecord) {
        return await this.dataStore.addPayrollRecord(payrollRecord);
    }

    /**
     * Get payroll history for employee
     * @param {string} employeeId 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getPayrollHistory(employeeId, limit = 10) {
        const payrollRecords = await this.dataStore.getPayroll({ employeeId });
        return payrollRecords.slice(0, limit);
    }

    /**
     * Get current period summary for employee
     * @param {string} employeeId 
     * @returns {Promise<object>}
     */
    async getCurrentPeriodSummary(employeeId) {
        try {
            const settings = await this.dataStore.getSettings();
            const frequency = settings.payroll?.frequency || 'biweekly';
            
            const today = new Date();
            const periodStart = this.getCurrentPeriodStart(today, frequency);
            const periodStartStr = periodStart.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

            const payrollData = await this.generatePayroll(employeeId, periodStartStr, todayStr);
            
            return {
                periodStart: periodStartStr,
                periodEnd: todayStr,
                hoursWorked: payrollData.totalHours,
                estimatedPay: payrollData.netPay,
                overtime: payrollData.overtimeHours > 0
            };
        } catch (error) {
            console.error('Error getting current period summary:', error);
            return {
                periodStart: new Date().toISOString().split('T')[0],
                periodEnd: new Date().toISOString().split('T')[0],
                hoursWorked: 0,
                estimatedPay: 0,
                overtime: false
            };
        }
    }

    /**
     * Format currency for display
     * @param {number} amount 
     * @param {string} currency 
     * @returns {string}
     */
    formatCurrency(amount, currency = 'PHP') {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Calculate overtime eligibility
     * @param {number} hoursWorked 
     * @param {number} standardHours 
     * @param {number} minOvertimeHours 
     * @returns {object}
     */
    calculateOvertimeEligibility(hoursWorked, standardHours = 8, minOvertimeHours = 8) {
        const isEligible = hoursWorked > minOvertimeHours;
        const overtimeHours = Math.max(0, hoursWorked - minOvertimeHours);
        
        return {
            isEligible,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            threshold: minOvertimeHours
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Payroll;
} else if (typeof window !== 'undefined') {
    window.Payroll = Payroll;
}
