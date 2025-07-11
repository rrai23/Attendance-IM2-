/**
 * Enhanced Calendar Component for Bricks Attendance System
 * Properly handles Philippine holidays and note functionality
 */

class EnhancedCalendar {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`Calendar container with ID '${containerId}' not found`);
        }

        // Configuration options
        this.options = {
            showWeekNumbers: false,
            highlightToday: true,
            allowNoteEditing: true,
            showAttendancePatterns: true,
            firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday
            dateFormat: 'YYYY-MM-DD',
            ...options
        };

        // State management
        this.currentDate = new Date();
        this.selectedDate = null;
        this.notes = new Map();
        this.holidays = new Map();
        this.isLoading = false;

        // Event callbacks
        this.onDateSelect = options.onDateSelect || null;
        this.onNoteAdd = options.onNoteAdd || null;
        this.onNoteUpdate = options.onNoteUpdate || null;
        this.onNoteDelete = options.onNoteDelete || null;

        // Month names and day names
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        this.dayNamesLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        this.init();
    }

    async init() {
        this.render();
        this.bindEvents();
        await this.loadData();
        this.updateCalendar();
    }

    render() {
        this.container.innerHTML = `
            <div class="calendar-wrapper">
                <div class="calendar-header">
                    <div class="calendar-nav">
                        <button type="button" class="calendar-nav-btn" id="prev-month" aria-label="Previous month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15,18 9,12 15,6"></polyline>
                            </svg>
                        </button>
                        <div class="calendar-title">
                            <h3 class="calendar-month-year" id="month-year"></h3>
                            <button type="button" class="calendar-today-btn" id="today-btn">Today</button>
                        </div>
                        <button type="button" class="calendar-nav-btn" id="next-month" aria-label="Next month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="calendar-legend">
                        <div class="legend-item">
                            <span class="legend-dot holiday-dot"></span>
                            <span class="legend-text">Philippine Holidays</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot notes-dot"></span>
                            <span class="legend-text">Has Notes</span>
                        </div>
                    </div>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-weekdays" id="weekdays"></div>
                    <div class="calendar-days" id="calendar-days"></div>
                </div>
                <div class="calendar-loading" id="calendar-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Loading calendar data...</span>
                </div>
            </div>
        `;

        this.renderWeekdays();
    }

    renderWeekdays() {
        const weekdaysContainer = document.getElementById('weekdays');
        let weekdaysHTML = '';

        for (let i = 0; i < 7; i++) {
            const dayIndex = (this.options.firstDayOfWeek + i) % 7;
            weekdaysHTML += `<div class="weekday">${this.dayNames[dayIndex]}</div>`;
        }

        weekdaysContainer.innerHTML = weekdaysHTML;
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('prev-month').addEventListener('click', () => {
            this.previousMonth();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.nextMonth();
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            this.goToToday();
        });

        // Date selection and note editing
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') || e.target.closest('.calendar-day')) {
                const dayElement = e.target.classList.contains('calendar-day') ? e.target : e.target.closest('.calendar-day');
                this.selectDate(dayElement);
            }
        });

        // Double-click to add/edit notes
        this.container.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('calendar-day') || e.target.closest('.calendar-day')) {
                const dayElement = e.target.classList.contains('calendar-day') ? e.target : e.target.closest('.calendar-day');
                if (this.options.allowNoteEditing) {
                    this.editNote(dayElement);
                }
            }
        });

        // Setup note modal event handlers
        this.setupNoteModalHandlers();
    }

    setupNoteModalHandlers() {
        const modal = document.getElementById('noteModal');
        if (!modal) return;

        const closeBtn = document.getElementById('noteModalClose');
        const cancelBtn = document.getElementById('cancelNoteBtn');
        const saveBtn = document.getElementById('saveNoteBtn');
        const deleteBtn = document.getElementById('deleteNoteBtn');

        // Close modal handlers
        const closeModal = () => {
            modal.classList.remove('active');
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Save note handler
        saveBtn?.addEventListener('click', async () => {
            const dateStr = modal.dataset.currentDate;
            const content = document.getElementById('noteContent').value.trim();

            if (content && dateStr) {
                await this.saveNote(dateStr, { content, type: 'general' });
            } else if (!content && dateStr && this.notes.get(dateStr)) {
                await this.deleteNote(dateStr);
            }
            closeModal();
        });

        // Delete note handler
        deleteBtn?.addEventListener('click', async () => {
            const dateStr = modal.dataset.currentDate;
            if (dateStr && confirm('Are you sure you want to delete this note?')) {
                await this.deleteNote(dateStr);
                closeModal();
            }
        });
    }

    async loadData() {
        this.setLoading(true);

        try {
            await this.loadNotes();
            await this.loadHolidays();
        } catch (error) {
            console.error('Error loading calendar data:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async loadNotes() {
        try {
            // Load notes from local storage for demo
            const allNotes = JSON.parse(localStorage.getItem('calendar-notes') || '[]');
            
            this.notes.clear();
            allNotes.forEach(note => {
                this.notes.set(note.date, note);
            });

        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    async loadHolidays() {
        try {
            // Load Philippine holidays from local data
            const response = await fetch('/mock/philippines-holidays.json');
            const holidaysData = await response.json();
            
            const currentYear = this.currentDate.getFullYear().toString();
            const yearHolidays = holidaysData[currentYear] || {};
            
            this.holidays.clear();
            Object.entries(yearHolidays).forEach(([date, holiday]) => {
                // Convert MM-DD format to full date for current year
                const fullDate = `${currentYear}-${date}`;
                this.holidays.set(fullDate, {
                    ...holiday,
                    date: fullDate,
                    isPhilippineHoliday: true
                });
            });

        } catch (error) {
            console.error('Error loading holidays:', error);
            // Fallback to hardcoded holidays for current year
            this.loadFallbackHolidays();
        }
    }

    loadFallbackHolidays() {
        const currentYear = this.currentDate.getFullYear();
        const fallbackHolidays = [
            { date: `${currentYear}-01-01`, name: "New Year's Day", type: "regular" },
            { date: `${currentYear}-02-25`, name: "EDSA People Power Revolution Anniversary", type: "regular" },
            { date: `${currentYear}-04-09`, name: "Araw ng Kagitingan (Day of Valor)", type: "regular" },
            { date: `${currentYear}-05-01`, name: "Labor Day", type: "regular" },
            { date: `${currentYear}-06-12`, name: "Independence Day", type: "regular" },
            { date: `${currentYear}-08-25`, name: "National Heroes Day", type: "regular" },
            { date: `${currentYear}-11-01`, name: "All Saints Day", type: "regular" },
            { date: `${currentYear}-11-30`, name: "Bonifacio Day", type: "regular" },
            { date: `${currentYear}-12-25`, name: "Christmas Day", type: "regular" },
            { date: `${currentYear}-12-30`, name: "Rizal Day", type: "regular" }
        ];

        this.holidays.clear();
        fallbackHolidays.forEach(holiday => {
            this.holidays.set(holiday.date, {
                ...holiday,
                isPhilippineHoliday: true
            });
        });
    }

    updateCalendar() {
        this.updateMonthYearDisplay();
        this.renderCalendarDays();
    }

    updateMonthYearDisplay() {
        const monthYearElement = document.getElementById('month-year');
        const monthName = this.monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        monthYearElement.textContent = `${monthName} ${year}`;
    }

    renderCalendarDays() {
        const daysContainer = document.getElementById('calendar-days');
        const today = new Date();
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();

        // Get first day of the month
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        // Calculate starting position
        let startDate = new Date(firstDay);
        const dayOfWeek = (firstDay.getDay() - this.options.firstDayOfWeek + 7) % 7;
        startDate.setDate(startDate.getDate() - dayOfWeek);

        // Generate 6 weeks of days
        let daysHTML = '';
        const totalDays = 42; // 6 weeks × 7 days

        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dateStr = this.formatDate(date);
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = this.isSameDay(date, today);
            const isSelected = this.selectedDate && this.isSameDay(date, this.selectedDate);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            // Get additional data for this date
            const note = this.notes.get(dateStr);
            const holiday = this.holidays.get(dateStr);

            // Build CSS classes
            const classes = ['calendar-day'];
            if (!isCurrentMonth) classes.push('other-month');
            if (isToday && this.options.highlightToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (isWeekend) classes.push('weekend');
            if (note) classes.push('has-notes');
            if (holiday) classes.push('holiday');

            // Build data attributes
            const dataAttrs = [
                `data-date="${dateStr}"`,
                `data-day="${date.getDate()}"`,
                `data-month="${date.getMonth()}"`,
                `data-year="${date.getFullYear()}"`
            ];

            // Build title for tooltip
            let title = this.formatDateLong(date);
            if (holiday) title += `\\nHoliday: ${holiday.name}`;
            if (note) title += `\\nNote: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`;

            daysHTML += `
                <div class="${classes.join(' ')}" 
                     ${dataAttrs.join(' ')} 
                     title="${title}"
                     tabindex="0"
                     role="gridcell"
                     aria-label="${title}">
                    <span class="day-number">${date.getDate()}</span>
                    ${this.renderDayIndicators(note, holiday)}
                </div>
            `;
        }

        daysContainer.innerHTML = daysHTML;
    }

    renderDayIndicators(note, holiday) {
        let indicators = '';

        if (holiday) {
            indicators += '<div class="day-indicator holiday-indicator" title="Philippine Holiday"></div>';
        }

        if (note) {
            indicators += '<div class="day-indicator note-indicator" title="Has notes"></div>';
        }

        return indicators ? `<div class="day-indicators">${indicators}</div>` : '';
    }

    selectDate(dayElement) {
        // Remove previous selection
        this.container.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked day
        dayElement.classList.add('selected');

        // Update selected date
        const dateStr = dayElement.dataset.date;
        this.selectedDate = this.parseDate(dateStr);

        // Trigger callback
        if (this.onDateSelect) {
            this.onDateSelect(this.selectedDate, dateStr);
        }
    }

    async editNote(dayElement) {
        const dateStr = dayElement.dataset.date;
        const date = this.parseDate(dateStr);
        const existingNote = this.notes.get(dateStr);

        // Use the existing note modal from the HTML
        const modal = document.getElementById('noteModal');
        if (!modal) {
            console.error('Note modal not found');
            return;
        }

        // Populate modal with data
        const titleElement = document.getElementById('noteModalTitle');
        const dateInput = document.getElementById('noteDate');
        const contentTextarea = document.getElementById('noteContent');
        const deleteBtn = document.getElementById('deleteNoteBtn');

        titleElement.textContent = existingNote ? 'Edit Note' : 'Add Note';
        dateInput.value = this.formatDateLong(date);
        contentTextarea.value = existingNote ? existingNote.content : '';
        deleteBtn.style.display = existingNote ? 'block' : 'none';

        // Store the current date for saving
        modal.dataset.currentDate = dateStr;

        // Show modal
        modal.classList.add('active');
        contentTextarea.focus();
    }

    async saveNote(dateStr, noteData) {
        try {
            const existingNote = this.notes.get(dateStr);
            
            const note = {
                id: existingNote?.id || Date.now().toString(),
                date: dateStr,
                content: noteData.content.trim(),
                type: noteData.type || 'general',
                createdAt: existingNote?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to local storage
            let allNotes = JSON.parse(localStorage.getItem('calendar-notes') || '[]');
            const existingIndex = allNotes.findIndex(n => n.date === dateStr);
            
            if (existingIndex >= 0) {
                allNotes[existingIndex] = note;
            } else {
                allNotes.push(note);
            }
            
            localStorage.setItem('calendar-notes', JSON.stringify(allNotes));

            // Update local cache
            this.notes.set(dateStr, note);

            // Refresh the calendar display
            this.renderCalendarDays();

            // Show success notification
            this.showNotification(`Note ${existingNote ? 'updated' : 'added'} successfully`, 'success');

            if (this.onNoteAdd && !existingNote) {
                this.onNoteAdd(note);
            } else if (this.onNoteUpdate && existingNote) {
                this.onNoteUpdate(note);
            }

        } catch (error) {
            console.error('Error saving note:', error);
            this.showNotification('Failed to save note. Please try again.', 'error');
        }
    }

    async deleteNote(dateStr) {
        try {
            const existingNote = this.notes.get(dateStr);
            if (!existingNote) return;

            // Remove from local storage
            let allNotes = JSON.parse(localStorage.getItem('calendar-notes') || '[]');
            allNotes = allNotes.filter(n => n.date !== dateStr);
            localStorage.setItem('calendar-notes', JSON.stringify(allNotes));
            
            // Remove from local cache
            this.notes.delete(dateStr);
            
            // Refresh the calendar display
            this.renderCalendarDays();

            // Show success notification
            this.showNotification('Note deleted successfully', 'success');

            if (this.onNoteDelete) {
                this.onNoteDelete(existingNote);
            }

        } catch (error) {
            console.error('Error deleting note:', error);
            this.showNotification('Failed to delete note. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Close notification">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            if (notification.parentNode) {
                notification.remove();
            }
        });
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadData().then(() => {
            this.updateCalendar();
        });
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadData().then(() => {
            this.updateCalendar();
        });
    }

    goToToday() {
        const today = new Date();
        this.currentDate = new Date(today);
        this.loadData().then(() => {
            this.updateCalendar();
            this.selectDateByValue(today);
        });
    }

    selectDateByValue(date) {
        const dateStr = this.formatDate(date);
        const dayElement = this.container.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            this.selectDate(dayElement);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElement = document.getElementById('calendar-loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'flex' : 'none';
        }
    }

    // Utility methods
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateLong(date) {
        const dayName = this.dayNamesLong[date.getDay()];
        const monthName = this.monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${dayName}, ${monthName} ${day}, ${year}`;
    }

    parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // Public API methods
    refresh() {
        this.loadData().then(() => {
            this.updateCalendar();
        });
    }

    getSelectedDate() {
        return this.selectedDate;
    }

    getNotes() {
        return Array.from(this.notes.values());
    }

    getNotesForDate(date) {
        const dateStr = this.formatDate(date);
        return this.notes.get(dateStr) || null;
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

// Export for module usage and replace the old Calendar class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCalendar;
} else {
    window.Calendar = EnhancedCalendar;
}
