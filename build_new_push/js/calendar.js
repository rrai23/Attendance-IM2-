/**
 * Interactive Calendar Component for Bricks Attendance System
 * Handles month display, date selection, notes management, and attendance visualization
 */

class Calendar {
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
        this.attendanceData = new Map();
        this.holidays = new Map();
        this.isLoading = false;
        this.navigationDebounceTimer = null;
        this.lastFocusedDate = null;

        // Navigation button references for loading state management
        this.navButtons = {
            prev: null,
            next: null,
            today: null
        };

        // Touch gesture handling
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchThreshold = 50;

        // Context menu state
        this.activeContextMenu = null;
        this.contextMenuFocusIndex = -1;

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
                        <div class="legend-item">
                            <span class="legend-dot attendance-high"></span>
                            <span class="legend-text">High Attendance</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot attendance-medium"></span>
                            <span class="legend-text">Medium Attendance</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot attendance-low"></span>
                            <span class="legend-text">Low Attendance</span>
                        </div>
                    </div>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-weekdays" id="weekdays"></div>
                    <div class="calendar-days" id="calendar-days" style="grid-auto-rows: minmax(50px, auto);"></div>
                </div>
                <div class="calendar-loading" id="calendar-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Loading calendar data...</span>
                </div>
                <div class="calendar-error" id="calendar-error" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">
                        <h4>Unable to load calendar data</h4>
                        <p>Please check your connection and try again.</p>
                        <button type="button" class="btn btn-primary" id="retry-btn">Retry</button>
                    </div>
                </div>
            </div>
        `;

        // Store navigation button references
        this.navButtons.prev = document.getElementById('prev-month');
        this.navButtons.next = document.getElementById('next-month');
        this.navButtons.today = document.getElementById('today-btn');

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
        // Navigation buttons with debouncing
        this.navButtons.prev.addEventListener('click', () => {
            this.debouncedPreviousMonth();
        });

        this.navButtons.next.addEventListener('click', () => {
            this.debouncedNextMonth();
        });

        this.navButtons.today.addEventListener('click', () => {
            this.goToToday();
        });

        // Retry button for error state
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Date selection with modifier key support for note editing
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') || e.target.closest('.calendar-day')) {
                const dayElement = e.target.classList.contains('calendar-day') ? e.target : e.target.closest('.calendar-day');
                
                // Check for modifier keys for note editing (Ctrl/Cmd + click)
                if ((e.ctrlKey || e.metaKey) && this.options.allowNoteEditing) {
                    e.preventDefault();
                    this.editNote(dayElement);
                } else {
                    this.selectDate(dayElement);
                }
            }
        });

        // Touch gesture support for mobile navigation
        this.container.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        }, { passive: true });

        // Context menu for additional options
        this.container.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('calendar-day') || e.target.closest('.calendar-day')) {
                e.preventDefault();
                const dayElement = e.target.classList.contains('calendar-day') ? e.target : e.target.closest('.calendar-day');
                this.showContextMenu(e, dayElement);
            }
        });

        // Global click handler to close context menu
        document.addEventListener('click', (e) => {
            if (this.activeContextMenu && !this.activeContextMenu.contains(e.target)) {
                this.closeContextMenu();
            }
        });

        // Global escape key handler for context menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeContextMenu) {
                this.closeContextMenu();
            }
        });
    }

    async loadData() {
        this.setLoading(true);
        this.hideError();

        try {
            // Load calendar notes
            await this.loadNotes();
            
            // Load attendance data
            if (this.options.showAttendancePatterns) {
                await this.loadAttendanceData();
            }

            // Load holidays
            await this.loadHolidays();

        } catch (error) {
            console.error('Error loading calendar data:', error);
            this.showError('Failed to load calendar data. Please check your connection and try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async loadNotes() {
        try {
            const startDate = this.getMonthStart();
            const endDate = this.getMonthEnd();
            
            const notes = await dataService.getCalendarNotes(
                this.formatDate(startDate),
                this.formatDate(endDate)
            );

            this.notes.clear();
            notes.forEach(note => {
                this.notes.set(note.date, note);
            });
        } catch (error) {
            console.error('Error loading notes:', error);
            throw new Error('Failed to load calendar notes');
        }
    }

    async loadAttendanceData() {
        try {
            const startDate = this.getMonthStart();
            const endDate = this.getMonthEnd();
            
            const attendanceRecords = await dataService.getAttendanceRecords(
                null,
                this.formatDate(startDate),
                this.formatDate(endDate)
            );

            // Process attendance data by date
            this.attendanceData.clear();
            const attendanceByDate = {};

            attendanceRecords.forEach(record => {
                if (!attendanceByDate[record.date]) {
                    attendanceByDate[record.date] = [];
                }
                attendanceByDate[record.date].push(record);
            });

            // Calculate attendance levels for each date
            Object.entries(attendanceByDate).forEach(([date, records]) => {
                const totalEmployees = records.length;
                const presentEmployees = records.filter(r => r.status === 'present').length;
                const attendanceRate = totalEmployees > 0 ? (presentEmployees / totalEmployees) : 0;

                let level = 'none';
                if (attendanceRate >= 0.8) level = 'high';
                else if (attendanceRate >= 0.6) level = 'medium';
                else if (attendanceRate > 0) level = 'low';

                this.attendanceData.set(date, {
                    total: totalEmployees,
                    present: presentEmployees,
                    rate: attendanceRate,
                    level: level
                });
            });
        } catch (error) {
            console.error('Error loading attendance data:', error);
            throw new Error('Failed to load attendance data');
        }
    }

    async loadHolidays() {
        try {
            // Load Philippine holidays from local data
            const response = await fetch('/mock/philippines-holidays.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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
            const attendance = this.attendanceData.get(dateStr);
            const holiday = this.holidays.get(dateStr);

            // Build CSS classes
            const classes = ['calendar-day'];
            if (!isCurrentMonth) classes.push('other-month');
            if (isToday && this.options.highlightToday) classes.push('today');
            if (isSelected) classes.push('selected');
            if (isWeekend) classes.push('weekend');
            if (note) classes.push('has-notes');
            if (holiday) classes.push('holiday');
            if (attendance) classes.push(`attendance-${attendance.level}`);

            // Build data attributes
            const dataAttrs = [
                `data-date="${dateStr}"`,
                `data-day="${date.getDate()}"`,
                `data-month="${date.getMonth()}"`,
                `data-year="${date.getFullYear()}"`
            ];

            // Build title for tooltip
            let title = this.formatDateLong(date);
            if (holiday) title += `\nHoliday: ${holiday.name}`;
            if (attendance) title += `\nAttendance: ${attendance.present}/${attendance.total} (${Math.round(attendance.rate * 100)}%)`;
            if (note) title += `\nNote: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`;

            daysHTML += `
                <div class="${classes.join(' ')}" 
                     ${dataAttrs.join(' ')} 
                     title="${title}"
                     tabindex="0"
                     role="gridcell"
                     aria-label="${title}">
                    <span class="day-number">${date.getDate()}</span>
                    ${this.renderDayIndicators(note, attendance, holiday)}
                </div>
            `;
        }

        daysContainer.innerHTML = daysHTML;
    }

    renderDayIndicators(note, attendance, holiday) {
        // Implement priority system for multiple states to prevent overlap
        const indicators = [];
        
        // Priority 1: Holidays (highest priority)
        if (holiday) {
            indicators.push({
                type: 'holiday',
                html: '<div class="day-indicator holiday-indicator" title="Holiday"></div>',
                priority: 1
            });
        }

        // Priority 2: Notes
        if (note) {
            indicators.push({
                type: 'note',
                html: '<div class="day-indicator note-indicator" title="Has notes"></div>',
                priority: 2
            });
        }

        // Priority 3: Attendance (lowest priority, only show if no higher priority indicators)
        if (attendance && attendance.level !== 'none' && indicators.length === 0) {
            indicators.push({
                type: 'attendance',
                html: `<div class="day-indicator attendance-indicator ${attendance.level}" title="Attendance: ${Math.round(attendance.rate * 100)}%"></div>`,
                priority: 3
            });
        }

        // Sort by priority and take top 2 indicators to prevent overcrowding
        indicators.sort((a, b) => a.priority - b.priority);
        const displayIndicators = indicators.slice(0, 2);

        return displayIndicators.length > 0 ? 
            `<div class="day-indicators">${displayIndicators.map(i => i.html).join('')}</div>` : '';
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
        this.lastFocusedDate = this.selectedDate;

        // Ensure the selected element has focus for keyboard navigation
        dayElement.focus();

        // Trigger callback
        if (this.onDateSelect) {
            this.onDateSelect(this.selectedDate, dateStr);
        }

        // Announce selection for screen readers
        this.announceSelection(dayElement);
    }

    async editNote(dayElement) {
        const dateStr = dayElement.dataset.date;
        const date = this.parseDate(dateStr);
        const existingNote = this.notes.get(dateStr);

        const modalId = modalManager.create({
            title: `Note for ${this.formatDateLong(date)}`,
            form: {
                fields: [
                    {
                        type: 'textarea',
                        name: 'content',
                        label: 'Note Content',
                        value: existingNote ? existingNote.content : '',
                        placeholder: 'Enter your note here...',
                        rows: 4,
                        required: false
                    },
                    {
                        type: 'select',
                        name: 'type',
                        label: 'Note Type',
                        value: existingNote ? existingNote.type : 'general',
                        options: [
                            { value: 'general', text: 'General Note' },
                            { value: 'reminder', text: 'Reminder' },
                            { value: 'meeting', text: 'Meeting' },
                            { value: 'holiday', text: 'Holiday' },
                            { value: 'maintenance', text: 'Maintenance' }
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
                ...(existingNote ? [{
                    text: 'Delete',
                    class: 'btn-danger',
                    action: 'delete'
                }] : []),
                {
                    text: existingNote ? 'Update' : 'Save',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                if (data.content.trim()) {
                    await this.saveNote(dateStr, data);
                } else if (existingNote) {
                    await this.deleteNote(dateStr);
                }
                return true;
            },
            onAction: async (action) => {
                if (action === 'delete' && existingNote) {
                    const confirmed = await this.confirmDelete();
                    if (confirmed) {
                        await this.deleteNote(dateStr);
                        return true;
                    }
                    return false;
                }
            }
        });
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

            // Save to local storage for demo purposes
            // In a real app, this would be an API call
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

    async loadNotes() {
        try {
            // Load notes from local storage for demo
            // In a real app, this would be an API call
            const allNotes = JSON.parse(localStorage.getItem('calendar-notes') || '[]');
            
            this.notes.clear();
            allNotes.forEach(note => {
                this.notes.set(note.date, note);
            });

        } catch (error) {
            console.error('Error loading notes:', error);
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

    async confirmDelete() {
        return new Promise((resolve) => {
            if (typeof modalManager !== 'undefined') {
                modalManager.confirm({
                    title: 'Delete Note',
                    message: 'Are you sure you want to delete this note? This action cannot be undone.',
                    confirmText: 'Delete',
                    confirmClass: 'btn-danger',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            } else {
                // Fallback to native confirm if modalManager is not available
                resolve(confirm('Are you sure you want to delete this note?'));
            }
        });
    }
        try {
            const existingNote = this.notes.get(dateStr);
            let savedNote;

            if (existingNote) {
                // Update existing note
                savedNote = await dataService.updateCalendarNote(existingNote.id, {
                    content: noteData.content,
                    type: noteData.type
                });
                
                if (this.onNoteUpdate) {
                    this.onNoteUpdate(savedNote);
                }
            } else {
                // Create new note
                savedNote = await dataService.createCalendarNote({
                    date: dateStr,
                    content: noteData.content,
                    type: noteData.type
                });
                
                if (this.onNoteAdd) {
                    this.onNoteAdd(savedNote);
                }
            }

            // Update local cache
            this.notes.set(dateStr, savedNote);
            
            // Refresh the calendar display
            this.renderCalendarDays();

        } catch (error) {
            console.error('Error saving note:', error);
            modalManager.alert({
                title: 'Error',
                message: 'Failed to save note. Please try again.'
            });
        }
    }

    async deleteNote(dateStr) {
        try {
            const existingNote = this.notes.get(dateStr);
            if (!existingNote) return;

            await dataService.deleteCalendarNote(existingNote.id);
            
            // Remove from local cache
            this.notes.delete(dateStr);
            
            // Refresh the calendar display
            this.renderCalendarDays();

            if (this.onNoteDelete) {
                this.onNoteDelete(existingNote);
            }

        } catch (error) {
            console.error('Error deleting note:', error);
            modalManager.alert({
                title: 'Error',
                message: 'Failed to delete note. Please try again.'
            });
        }
    }

    async confirmDelete() {
        return new Promise((resolve) => {
            modalManager.confirm({
                title: 'Delete Note',
                message: 'Are you sure you want to delete this note? This action cannot be undone.',
                confirmText: 'Delete',
                confirmClass: 'btn-danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    showContextMenu(event, dayElement) {
        // Close any existing context menu
        this.closeContextMenu();

        const dateStr = dayElement.dataset.date;
        const hasNote = this.notes.has(dateStr);

        // Create context menu with enhanced accessibility
        const menu = document.createElement('div');
        menu.className = 'calendar-context-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Calendar day options');
        menu.innerHTML = `
            <div class="context-menu-item" data-action="select" role="menuitem" tabindex="0">
                <span>Select Date</span>
            </div>
            ${this.options.allowNoteEditing ? `
                <div class="context-menu-item" data-action="add-note" role="menuitem" tabindex="0">
                    <span>${hasNote ? 'Edit Note' : 'Add Note'}</span>
                </div>
                ${hasNote ? `
                    <div class="context-menu-item" data-action="delete-note" role="menuitem" tabindex="0">
                        <span>Delete Note</span>
                    </div>
                ` : ''}
            ` : ''}
            <div class="context-menu-item" data-action="view-attendance" role="menuitem" tabindex="0">
                <span>View Attendance</span>
            </div>
        `;

        // Position menu with viewport boundary checking
        const rect = this.container.getBoundingClientRect();
        const menuWidth = 200; // Approximate menu width
        const menuHeight = 150; // Approximate menu height
        
        let left = event.pageX;
        let top = event.pageY;
        
        // Adjust if menu would go off-screen
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }
        if (top + menuHeight > window.innerHeight) {
            top = event.pageY - menuHeight;
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;

        // Add to document
        document.body.appendChild(menu);
        this.activeContextMenu = menu;
        this.contextMenuFocusIndex = 0;

        // Focus first item
        const firstItem = menu.querySelector('.context-menu-item');
        if (firstItem) {
            firstItem.focus();
        }

        // Handle menu interactions
        menu.addEventListener('click', async (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            await this.handleContextMenuAction(action, dayElement, dateStr);
        });

        // Handle keyboard navigation
        menu.addEventListener('keydown', (e) => {
            this.handleContextMenuKeyboard(e, menu);
        });
    }

    async handleContextMenuAction(action, dayElement, dateStr) {
        switch (action) {
            case 'select':
                this.selectDate(dayElement);
                break;
            case 'add-note':
                await this.editNote(dayElement);
                break;
            case 'delete-note':
                if (await this.confirmDelete()) {
                    await this.deleteNote(dateStr);
                }
                break;
            case 'view-attendance':
                this.showAttendanceDetails(dateStr);
                break;
        }
        
        this.closeContextMenu();
    }

    handleContextMenuKeyboard(event, menu) {
        const items = menu.querySelectorAll('.context-menu-item');
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.contextMenuFocusIndex = (this.contextMenuFocusIndex + 1) % items.length;
                items[this.contextMenuFocusIndex].focus();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.contextMenuFocusIndex = (this.contextMenuFocusIndex - 1 + items.length) % items.length;
                items[this.contextMenuFocusIndex].focus();
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                items[this.contextMenuFocusIndex].click();
                break;
            case 'Escape':
                event.preventDefault();
                this.closeContextMenu();
                break;
        }
    }

    closeContextMenu() {
        if (this.activeContextMenu) {
            document.body.removeChild(this.activeContextMenu);
            this.activeContextMenu = null;
            this.contextMenuFocusIndex = -1;
        }
    }

    showAttendanceDetails(dateStr) {
        const attendance = this.attendanceData.get(dateStr);
        const date = this.parseDate(dateStr);

        if (!attendance) {
            modalManager.alert({
                title: 'No Attendance Data',
                message: `No attendance data available for ${this.formatDateLong(date)}.`
            });
            return;
        }

        modalManager.create({
            title: `Attendance for ${this.formatDateLong(date)}`,
            content: `
                <div class="attendance-details">
                    <div class="attendance-summary">
                        <div class="attendance-stat">
                            <span class="stat-label">Present:</span>
                            <span class="stat-value">${attendance.present}</span>
                        </div>
                        <div class="attendance-stat">
                            <span class="stat-label">Total:</span>
                            <span class="stat-value">${attendance.total}</span>
                        </div>
                        <div class="attendance-stat">
                            <span class="stat-label">Rate:</span>
                            <span class="stat-value">${Math.round(attendance.rate * 100)}%</span>
                        </div>
                    </div>
                    <div class="attendance-level ${attendance.level}">
                        Attendance Level: ${attendance.level.charAt(0).toUpperCase() + attendance.level.slice(1)}
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Close',
                    class: 'btn-primary',
                    action: 'close'
                }
            ],
            options: {
                size: 'small'
            }
        });
    }

    handleKeyboardNavigation(event) {
        // Don't handle navigation if context menu is open
        if (this.activeContextMenu) return;

        if (!this.selectedDate) {
            // If no date is selected, select today
            const today = new Date();
            this.selectDateByValue(today);
            return;
        }

        let newDate = new Date(this.selectedDate);
        let handled = true;

        switch (event.key) {
            case 'ArrowLeft':
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'ArrowRight':
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'ArrowUp':
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'ArrowDown':
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'Home':
                newDate.setDate(1);
                break;
            case 'End':
                newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
                break;
            case 'PageUp':
                if (event.shiftKey) {
                    newDate.setFullYear(newDate.getFullYear() - 1);
                } else {
                    newDate.setMonth(newDate.getMonth() - 1);
                }
                break;
            case 'PageDown':
                if (event.shiftKey) {
                    newDate.setFullYear(newDate.getFullYear() + 1);
                } else {
                    newDate.setMonth(newDate.getMonth() + 1);
                }
                break;
            case 'Enter':
            case ' ':
                if (this.options.allowNoteEditing) {
                    const dayElement = this.container.querySelector(`[data-date="${this.formatDate(this.selectedDate)}"]`);
                    if (dayElement) {
                        this.editNote(dayElement);
                    }
                }
                break;
            default:
                handled = false;
        }

        if (handled) {
            event.preventDefault();
            
            // Check if we need to change months
            if (newDate.getMonth() !== this.currentDate.getMonth() || 
                newDate.getFullYear() !== this.currentDate.getFullYear()) {
                this.currentDate = new Date(newDate);
                this.loadData().then(() => {
                    this.updateCalendar();
                    this.selectDateByValue(newDate);
                });
            } else {
                this.selectDateByValue(newDate);
            }
        }
    }

    selectDateByValue(date) {
        const dateStr = this.formatDate(date);
        const dayElement = this.container.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
            this.selectDate(dayElement);
        }
    }

    // Debounced navigation methods to prevent rapid navigation issues
    debouncedPreviousMonth() {
        if (this.navigationDebounceTimer) {
            clearTimeout(this.navigationDebounceTimer);
        }
        
        this.navigationDebounceTimer = setTimeout(() => {
            this.previousMonth();
        }, 150);
    }

    debouncedNextMonth() {
        if (this.navigationDebounceTimer) {
            clearTimeout(this.navigationDebounceTimer);
        }
        
        this.navigationDebounceTimer = setTimeout(() => {
            this.nextMonth();
        }, 150);
    }

    previousMonth() {
        if (this.isLoading) return;
        
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadData().then(() => {
            this.updateCalendar();
            this.restoreFocusAfterRender();
        });
    }

    nextMonth() {
        if (this.isLoading) return;
        
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadData().then(() => {
            this.updateCalendar();
            this.restoreFocusAfterRender();
        });
    }

    restoreFocusAfterRender() {
        // Restore focus to the previously selected date or today
        if (this.lastFocusedDate) {
            const dateStr = this.formatDate(this.lastFocusedDate);
            const dayElement = this.container.querySelector(`[data-date="${dateStr}"]`);
            if (dayElement) {
                this.selectDate(dayElement);
                return;
            }
        }
        
        // If the previously focused date is not in the current month, focus today if visible
        const today = new Date();
        if (today.getMonth() === this.currentDate.getMonth() && 
            today.getFullYear() === this.currentDate.getFullYear()) {
            this.selectDateByValue(today);
        }
    }

    goToToday() {
        const today = new Date();
        this.currentDate = new Date(today);
        this.loadData().then(() => {
            this.updateCalendar();
            this.selectDateByValue(today);
        });
    }

    goToDate(date) {
        this.currentDate = new Date(date);
        this.loadData().then(() => {
            this.updateCalendar();
            this.selectDateByValue(date);
        });
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElement = document.getElementById('calendar-loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'flex' : 'none';
        }

        // Disable navigation buttons during loading
        if (this.navButtons.prev) this.navButtons.prev.disabled = loading;
        if (this.navButtons.next) this.navButtons.next.disabled = loading;
        if (this.navButtons.today) this.navButtons.today.disabled = loading;
    }

    showError(message) {
        const errorElement = document.getElementById('calendar-error');
        if (errorElement) {
            const messageElement = errorElement.querySelector('.error-message p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            errorElement.style.display = 'flex';
        }
    }

    hideError() {
        const errorElement = document.getElementById('calendar-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Touch gesture handling for mobile navigation
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
        }
    }

    handleTouchEnd(event) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        
        // Check if it's a horizontal swipe (more horizontal than vertical movement)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.touchThreshold) {
            if (deltaX > 0) {
                // Swipe right - go to previous month
                this.debouncedPreviousMonth();
            } else {
                // Swipe left - go to next month
                this.debouncedNextMonth();
            }
        }
        
        // Reset touch coordinates
        this.touchStartX = null;
        this.touchStartY = null;
    }

    announceSelection(dayElement) {
        const dateStr = dayElement.dataset.date;
        const date = this.parseDate(dateStr);
        const announcement = `Selected ${this.formatDateLong(date)}`;
        
        // Create or update live region for screen readers
        let liveRegion = document.getElementById('calendar-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'calendar-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = announcement;
    }

    // Utility methods
    getMonthStart() {
        return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    }

    getMonthEnd() {
        return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    }

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
        // Clear any pending timers
        if (this.navigationDebounceTimer) {
            clearTimeout(this.navigationDebounceTimer);
        }

        // Close any open context menu
        this.closeContextMenu();

        // Clean up event listeners and DOM
        this.container.innerHTML = '';
        
        // Remove live region
        const liveRegion = document.getElementById('calendar-live-region');
        if (liveRegion) {
            document.body.removeChild(liveRegion);
        }

        // Clear references
        this.navButtons = { prev: null, next: null, today: null };
        this.activeContextMenu = null;
        this.lastFocusedDate = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
} else {
    window.Calendar = Calendar;
}
