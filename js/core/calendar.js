// Interactive calendar component for the Bricks Attendance System
class Calendar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showNotes: true,
            enableNoteCreation: true,
            onDateClick: null,
            onNoteAdd: null,
            onNoteUpdate: null,
            onNoteDelete: null,
            ...options
        };
        
        this.currentDate = new Date();
        this.selectedDate = null;
        this.notes = [];
        this.attendanceData = [];
        
        this.dataStore = DataStore.getInstance();
        
        this.init();
    }

    /**
     * Initialize calendar
     */
    async init() {
        if (!this.container) {
            console.error('Calendar container not found');
            return;
        }

        await this.loadData();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Load calendar data (notes and attendance)
     */
    async loadData() {
        try {
            if (this.options.showNotes) {
                this.notes = await this.dataStore.getCalendarNotes();
            }
            
            // Load attendance data for visual indicators
            this.attendanceData = await this.dataStore.getAttendance();
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }

    /**
     * Render calendar
     */
    render() {
        this.container.innerHTML = this.generateCalendarHTML();
        this.updateCalendarDays();
    }

    /**
     * Generate calendar HTML structure
     */
    generateCalendarHTML() {
        const monthName = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        return `
            <div class="calendar-header">
                <button class="calendar-nav-button" id="prevMonth">&lt;</button>
                <div class="calendar-month">${monthName}</div>
                <button class="calendar-nav-button" id="nextMonth">&gt;</button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day-header">Sun</div>
                <div class="calendar-day-header">Mon</div>
                <div class="calendar-day-header">Tue</div>
                <div class="calendar-day-header">Wed</div>
                <div class="calendar-day-header">Thu</div>
                <div class="calendar-day-header">Fri</div>
                <div class="calendar-day-header">Sat</div>
                ${this.generateCalendarDays()}
            </div>
        `;
    }

    /**
     * Generate calendar days
     */
    generateCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Get the starting day of the week for the first day
        const startingDayOfWeek = firstDay.getDay();
        
        // Days in the month
        const daysInMonth = lastDay.getDate();
        
        let daysHTML = '';
        
        // Previous month's trailing days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNumber = prevMonthDays - i;
            const dateStr = this.formatDate(year, month - 1, dayNumber);
            daysHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${dayNumber}</div>`;
        }
        
        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDate(year, month, day);
            const isToday = this.isToday(year, month, day);
            const hasNote = this.hasNoteForDate(dateStr);
            const hasAttendance = this.hasAttendanceForDate(dateStr);
            
            let dayClasses = 'calendar-day';
            if (isToday) dayClasses += ' today';
            if (hasNote) dayClasses += ' has-note';
            if (hasAttendance) dayClasses += ' has-attendance';
            
            daysHTML += `<div class="${dayClasses}" data-date="${dateStr}">${day}</div>`;
        }
        
        // Next month's leading days
        const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
        
        for (let day = 1; day <= remainingCells; day++) {
            const dateStr = this.formatDate(year, month + 1, day);
            daysHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
        }
        
        return daysHTML;
    }

    /**
     * Update calendar days (refresh without full re-render)
     */
    updateCalendarDays() {
        const calendarGrid = this.container.querySelector('.calendar-grid');
        if (!calendarGrid) return;

        // Remove existing day elements
        const existingDays = calendarGrid.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());

        // Add new day elements
        calendarGrid.insertAdjacentHTML('beforeend', this.generateCalendarDays());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        const prevBtn = this.container.querySelector('#prevMonth');
        const nextBtn = this.container.querySelector('#nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }

        // Day click events
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('other-month')) {
                this.handleDayClick(e.target);
            }
        });
    }

    /**
     * Handle day click
     */
    handleDayClick(dayElement) {
        const dateStr = dayElement.getAttribute('data-date');
        this.selectedDate = dateStr;
        
        // Remove previous selection
        this.container.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
        
        // Add selection to clicked day
        dayElement.classList.add('selected');
        
        // Call custom handler if provided
        if (this.options.onDateClick) {
            this.options.onDateClick(dateStr, this.getNotesForDate(dateStr));
        } else if (this.options.enableNoteCreation) {
            this.showNoteModal(dateStr);
        }
    }

    /**
     * Navigate to previous month
     */
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
        this.addTransitionEffect('prev');
    }

    /**
     * Navigate to next month
     */
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
        this.addTransitionEffect('next');
    }

    /**
     * Add transition effect for month changes
     */
    addTransitionEffect(direction) {
        const calendarGrid = this.container.querySelector('.calendar-grid');
        if (!calendarGrid) return;

        calendarGrid.style.transform = direction === 'next' ? 'translateX(-20px)' : 'translateX(20px)';
        calendarGrid.style.opacity = '0.7';
        
        setTimeout(() => {
            calendarGrid.style.transform = 'translateX(0)';
            calendarGrid.style.opacity = '1';
        }, 150);
    }

    /**
     * Show note modal for selected date
     */
    showNoteModal(dateStr) {
        const modal = document.getElementById('calendarModal');
        const modalDate = document.getElementById('modalDate');
        const noteTextarea = document.getElementById('noteTextarea');
        
        if (!modal || !modalDate || !noteTextarea) return;

        const existingNote = this.getNotesForDate(dateStr)[0];
        const formattedDate = this.formatDateForDisplay(dateStr);
        
        modalDate.textContent = `Note for ${formattedDate}`;
        noteTextarea.value = existingNote ? existingNote.content : '';
        
        modal.classList.add('show');
        noteTextarea.focus();
        
        // Store current date for saving
        modal.setAttribute('data-date', dateStr);
        modal.setAttribute('data-note-id', existingNote ? existingNote.id : '');
    }

    /**
     * Hide note modal
     */
    hideNoteModal() {
        const modal = document.getElementById('calendarModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Save note from modal
     */
    async saveNote() {
        const modal = document.getElementById('calendarModal');
        const noteTextarea = document.getElementById('noteTextarea');
        
        if (!modal || !noteTextarea) return;

        const dateStr = modal.getAttribute('data-date');
        const noteId = modal.getAttribute('data-note-id');
        const content = noteTextarea.value.trim();
        
        try {
            if (content) {
                if (noteId) {
                    // Update existing note
                    await this.dataStore.updateCalendarNote(noteId, { content });
                    if (this.options.onNoteUpdate) {
                        this.options.onNoteUpdate(dateStr, content);
                    }
                } else {
                    // Create new note
                    const note = {
                        date: dateStr,
                        content: content,
                        createdBy: Auth.getCurrentUser()?.username || 'unknown'
                    };
                    await this.dataStore.addCalendarNote(note);
                    if (this.options.onNoteAdd) {
                        this.options.onNoteAdd(dateStr, content);
                    }
                }
            } else if (noteId) {
                // Delete empty note
                await this.dataStore.deleteCalendarNote(noteId);
                if (this.options.onNoteDelete) {
                    this.options.onNoteDelete(dateStr);
                }
            }
            
            await this.loadData();
            this.render();
            this.hideNoteModal();
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error saving note. Please try again.');
        }
    }

    /**
     * Get notes for specific date
     */
    getNotesForDate(dateStr) {
        return this.notes.filter(note => note.date === dateStr);
    }

    /**
     * Check if date has note
     */
    hasNoteForDate(dateStr) {
        return this.notes.some(note => note.date === dateStr);
    }

    /**
     * Check if date has attendance record
     */
    hasAttendanceForDate(dateStr) {
        return this.attendanceData.some(record => record.date === dateStr);
    }

    /**
     * Check if date is today
     */
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() && 
               month === today.getMonth() && 
               day === today.getDate();
    }

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(year, month, day) {
        const monthStr = (month + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    }

    /**
     * Format date for display
     */
    formatDateForDisplay(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Go to specific date
     */
    goToDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.render();
        
        // Highlight the specific date
        setTimeout(() => {
            const dayElement = this.container.querySelector(`[data-date="${dateStr}"]`);
            if (dayElement && !dayElement.classList.contains('other-month')) {
                this.handleDayClick(dayElement);
            }
        }, 100);
    }

    /**
     * Refresh calendar data
     */
    async refresh() {
        await this.loadData();
        this.render();
    }

    /**
     * Get current month data
     */
    getCurrentMonthData() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const startDate = this.formatDate(year, month, 1);
        const endDate = this.formatDate(year, month + 1, 0);
        
        return {
            year,
            month,
            startDate,
            endDate,
            monthName: this.currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            })
        };
    }

    /**
     * Set calendar options
     */
    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Destroy calendar instance
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Static method to create calendar instance
     */
    static create(containerId, options = {}) {
        return new Calendar(containerId, options);
    }
}

// Setup global modal event handlers when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Modal close handlers
        const modalClose = document.getElementById('modalClose');
        const cancelNote = document.getElementById('cancelNote');
        const saveNote = document.getElementById('saveNote');
        const calendarModal = document.getElementById('calendarModal');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                if (window.calendarInstance) {
                    window.calendarInstance.hideNoteModal();
                }
            });
        }

        if (cancelNote) {
            cancelNote.addEventListener('click', () => {
                if (window.calendarInstance) {
                    window.calendarInstance.hideNoteModal();
                }
            });
        }

        if (saveNote) {
            saveNote.addEventListener('click', () => {
                if (window.calendarInstance) {
                    window.calendarInstance.saveNote();
                }
            });
        }

        // Close modal when clicking outside
        if (calendarModal) {
            calendarModal.addEventListener('click', (e) => {
                if (e.target === calendarModal && window.calendarInstance) {
                    window.calendarInstance.hideNoteModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && window.calendarInstance) {
                window.calendarInstance.hideNoteModal();
            }
        });
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
} else if (typeof window !== 'undefined') {
    window.Calendar = Calendar;
}
