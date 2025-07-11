/**
 * Dashboard Calendar Component for Bricks Attendance System
 * Integrates the new modern calendar with dashboard functionality
 */

class DashboardCalendar {
    constructor() {
        // Calendar state
        this.date = new Date();
        this.currYear = this.date.getFullYear();
        this.currMonth = this.date.getMonth();
        
        // Calendar elements
        this.daysTag = null;
        this.currentDate = null;
        this.prevNextIcon = null;
        
        // Dashboard integration
        this.notes = new Map();
        this.holidays = new Map();
        this.attendanceData = new Map();
        
        // Month names
        this.months = [
            "January", "February", "March", "April", "May", "June", "July",
            "August", "September", "October", "November", "December"
        ];
        
        // Callbacks for dashboard integration
        this.onDateSelect = null;
        this.onNoteAdd = null;
        this.onNoteUpdate = null;
        this.onNoteDelete = null;
    }

    /**
     * Initialize the calendar
     */
    async init() {
        try {
            this.setupCalendarElements();
            this.setupEventListeners();
            await this.loadDashboardData();
            this.renderCalendar();
            
            console.log('Calendar initialized with notes:', this.notes.size, 'holidays:', this.holidays.size);
        } catch (error) {
            console.error('Error initializing calendar:', error);
            throw error;
        }
    }

    /**
     * Setup calendar DOM elements
     */
    setupCalendarElements() {
        this.daysTag = document.querySelector(".days");
        this.currentDate = document.querySelector(".current-date");
        this.prevNextIcon = document.querySelectorAll(".icons span");
        
        if (!this.daysTag || !this.currentDate || !this.prevNextIcon.length) {
            console.warn('Some calendar elements not found, checking for calendar container...');
            
            // Check if we're in the dashboard context
            const container = document.getElementById('dashboard-calendar');
            if (container) {
                this.daysTag = container.querySelector(".days");
                this.currentDate = container.querySelector(".current-date");
                this.prevNextIcon = container.querySelectorAll(".icons span");
            }
            
            if (!this.daysTag || !this.currentDate || !this.prevNextIcon.length) {
                throw new Error('Calendar elements not found in DOM');
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        this.prevNextIcon.forEach(icon => {
            icon.addEventListener("click", () => {
                // Navigate months
                this.currMonth = icon.id === "prev" ? this.currMonth - 1 : this.currMonth + 1;

                if (this.currMonth < 0 || this.currMonth > 11) {
                    // Handle year changes
                    this.date = new Date(this.currYear, this.currMonth, new Date().getDate());
                    this.currYear = this.date.getFullYear();
                    this.currMonth = this.date.getMonth();
                } else {
                    this.date = new Date();
                }
                this.renderCalendar();
            });
        });

        // Day clicks for notes
        this.daysTag.addEventListener('click', (e) => {
            const dayElement = e.target.closest('li');
            if (dayElement && !dayElement.classList.contains('inactive')) {
                this.handleDayClick(dayElement);
            }
        });
    }

    /**
     * Load dashboard data (notes, holidays, attendance)
     */
    async loadDashboardData() {
        try {
            // Load notes from localStorage or data service
            await this.loadNotes();
            await this.loadHolidays();
            await this.loadAttendanceData();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Load notes data
     */
    async loadNotes() {
        try {
            const savedNotes = localStorage.getItem('calendar-notes');
            if (savedNotes) {
                const notesData = JSON.parse(savedNotes);
                Object.entries(notesData).forEach(([date, note]) => {
                    this.notes.set(date, note);
                });
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    /**
     * Load holidays data
     */
    async loadHolidays() {
        try {
            // Load Philippine holidays for the current year
            const currentYear = new Date().getFullYear();
            const philippineHolidays = this.getPhilippineHolidays(currentYear);
            
            philippineHolidays.forEach(holiday => {
                const dateKey = this.formatDateKey(new Date(holiday.date));
                this.holidays.set(dateKey, holiday);
            });

            // Also check if dataService is available for additional holidays
            if (typeof dataService !== 'undefined') {
                try {
                    const additionalHolidays = await dataService.getPhilippineHolidays();
                    additionalHolidays.forEach(holiday => {
                        const dateKey = this.formatDateKey(new Date(holiday.date));
                        this.holidays.set(dateKey, holiday);
                    });
                } catch (serviceError) {
                    console.warn('Data service holidays not available:', serviceError);
                }
            }
        } catch (error) {
            console.error('Error loading holidays:', error);
        }
    }

    /**
     * Load attendance data
     */
    async loadAttendanceData() {
        try {
            // Load attendance patterns for the calendar
            if (typeof dataService !== 'undefined') {
                const attendanceData = await dataService.getAttendanceOverview();
                // Process attendance data for calendar display
                // This would mark days with high/low attendance, etc.
            }
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }

    /**
     * Render the calendar
     */
    renderCalendar() {
        let firstDayofMonth = new Date(this.currYear, this.currMonth, 1).getDay();
        let lastDateofMonth = new Date(this.currYear, this.currMonth + 1, 0).getDate();
        let lastDayofMonth = new Date(this.currYear, this.currMonth, lastDateofMonth).getDay();
        let lastDateofLastMonth = new Date(this.currYear, this.currMonth, 0).getDate();
        let liTag = "";

        // Previous month's trailing days
        for (let i = firstDayofMonth; i > 0; i--) {
            liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;
        }

        // Current month's days
        for (let i = 1; i <= lastDateofMonth; i++) {
            const dateKey = this.formatDateKey(new Date(this.currYear, this.currMonth, i));
            const isToday = i === new Date().getDate() && 
                           this.currMonth === new Date().getMonth() && 
                           this.currYear === new Date().getFullYear();
            
            let classes = [];
            if (isToday) classes.push("active");
            if (this.notes.has(dateKey)) classes.push("has-note");
            if (this.holidays.has(dateKey)) classes.push("holiday");
            
            const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : "";
            const title = this.getDayTitle(dateKey);
            
            liTag += `<li${classStr} data-date="${dateKey}" title="${title}">${i}</li>`;
        }

        // Next month's leading days
        for (let i = lastDayofMonth; i < 6; i++) {
            liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;
        }

        // Update the calendar display
        this.currentDate.innerText = `${this.months[this.currMonth]} ${this.currYear}`;
        this.daysTag.innerHTML = liTag;
    }

    /**
     * Handle day click
     */
    handleDayClick(dayElement) {
        const dateKey = dayElement.dataset.date;
        if (!dateKey) return;

        // Remove previous selection
        this.daysTag.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked day
        dayElement.classList.add('selected');

        // Open note modal
        this.openNoteModal(dateKey);
    }

    /**
     * Open note modal for a specific date
     */
    openNoteModal(dateKey) {
        const modal = document.getElementById('noteModal');
        if (!modal) return;

        const date = new Date(dateKey);
        const existingNote = this.notes.get(dateKey) || '';
        
        // Setup modal
        const titleElement = document.getElementById('noteModalTitle');
        const dateInput = document.getElementById('noteDate');
        const contentTextarea = document.getElementById('noteContent');
        const deleteBtn = document.getElementById('deleteNoteBtn');

        if (titleElement) {
            titleElement.textContent = existingNote ? 'Edit Note' : 'Add Note';
        }
        
        if (dateInput) {
            dateInput.value = this.formatDateLong(date);
        }
        
        if (contentTextarea) {
            contentTextarea.value = existingNote;
        }
        
        if (deleteBtn) {
            deleteBtn.style.display = existingNote ? 'block' : 'none';
        }

        modal.dataset.currentDate = dateKey;
        modal.classList.add('active');
        
        if (contentTextarea) {
            contentTextarea.focus();
        }

        // Setup modal event listeners
        this.setupModalEventListeners(modal, dateKey);
    }

    /**
     * Setup modal event listeners
     */
    setupModalEventListeners(modal, dateKey) {
        const closeBtn = document.getElementById('noteModalClose');
        const cancelBtn = document.getElementById('cancelNoteBtn');
        const saveBtn = document.getElementById('saveNoteBtn');
        const deleteBtn = document.getElementById('deleteNoteBtn');
        const contentTextarea = document.getElementById('noteContent');

        // Remove any existing listeners to avoid duplicates
        const newCloseBtn = closeBtn ? closeBtn.cloneNode(true) : null;
        const newCancelBtn = cancelBtn ? cancelBtn.cloneNode(true) : null;
        const newSaveBtn = saveBtn ? saveBtn.cloneNode(true) : null;
        const newDeleteBtn = deleteBtn ? deleteBtn.cloneNode(true) : null;

        if (closeBtn && newCloseBtn) closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        if (cancelBtn && newCancelBtn) cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        if (saveBtn && newSaveBtn) saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        if (deleteBtn && newDeleteBtn) deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        // Close modal function
        const closeModal = () => {
            modal.classList.remove('active');
            document.removeEventListener('keydown', handleKeyDown);
        };

        // Close modal handlers
        if (newCloseBtn) {
            newCloseBtn.onclick = closeModal;
        }
        
        if (newCancelBtn) {
            newCancelBtn.onclick = closeModal;
        }

        // Save note handler
        if (newSaveBtn) {
            newSaveBtn.onclick = () => {
                const content = contentTextarea ? contentTextarea.value.trim() : '';
                this.saveNote(dateKey, content);
                closeModal();
            };
        }

        // Delete note handler
        if (newDeleteBtn) {
            newDeleteBtn.onclick = () => {
                this.deleteNote(dateKey);
                closeModal();
            };
        }

        // ESC key to close
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }

    /**
     * Save a note
     */
    saveNote(dateKey, content) {
        if (content) {
            this.notes.set(dateKey, content);
        } else {
            this.notes.delete(dateKey);
        }
        
        // Save to localStorage
        const notesObj = Object.fromEntries(this.notes);
        localStorage.setItem('calendar-notes', JSON.stringify(notesObj));
        
        // Re-render calendar to show note indicator
        this.renderCalendar();
        
        // Trigger callback if available
        if (this.onNoteAdd && content) {
            this.onNoteAdd({ date: dateKey, content });
        } else if (this.onNoteUpdate && content) {
            this.onNoteUpdate({ date: dateKey, content });
        }
        
        console.log('Note saved for', dateKey, ':', content ? 'added/updated' : 'removed');
    }

    /**
     * Delete a note
     */
    deleteNote(dateKey) {
        this.notes.delete(dateKey);
        
        // Save to localStorage
        const notesObj = Object.fromEntries(this.notes);
        localStorage.setItem('calendar-notes', JSON.stringify(notesObj));
        
        // Re-render calendar
        this.renderCalendar();
        
        // Trigger callback if available
        if (this.onNoteDelete) {
            this.onNoteDelete({ date: dateKey });
        }
        
        console.log('Note deleted for', dateKey);
    }

    /**
     * Format date as key (YYYY-MM-DD)
     */
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format date for display
     */
    formatDateLong(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Get title for a day (tooltip)
     */
    getDayTitle(dateKey) {
        const titles = [];
        
        if (this.notes.has(dateKey)) {
            titles.push('Has note');
        }
        
        if (this.holidays.has(dateKey)) {
            const holiday = this.holidays.get(dateKey);
            titles.push(`Holiday: ${holiday.name}`);
        }
        
        return titles.length > 0 ? titles.join(', ') : 'Click to add note';
    }

    /**
     * Navigate to specific month/year
     */
    navigateToDate(year, month) {
        this.currYear = year;
        this.currMonth = month;
        this.renderCalendar();
    }

    /**
     * Get current displayed month/year
     */
    getCurrentDate() {
        return {
            year: this.currYear,
            month: this.currMonth,
            monthName: this.months[this.currMonth]
        };
    }

    /**
     * Get Philippine holidays for a given year
     */
    getPhilippineHolidays(year) {
        return [
            // Fixed holidays
            { date: `${year}-01-01`, name: "New Year's Day", type: "regular" },
            { date: `${year}-04-09`, name: "Araw ng Kagitingan (Day of Valor)", type: "regular" },
            { date: `${year}-05-01`, name: "Labor Day", type: "regular" },
            { date: `${year}-06-12`, name: "Independence Day", type: "regular" },
            { date: `${year}-08-21`, name: "Ninoy Aquino Day", type: "special" },
            { date: `${year}-08-29`, name: "National Heroes Day", type: "regular" },
            { date: `${year}-11-30`, name: "Bonifacio Day", type: "regular" },
            { date: `${year}-12-25`, name: "Christmas Day", type: "regular" },
            { date: `${year}-12-30`, name: "Rizal Day", type: "regular" },
            { date: `${year}-12-31`, name: "New Year's Eve", type: "special" },
            
            // Variable holidays (approximate dates for 2025)
            { date: `${year}-02-29`, name: "EDSA People Power Revolution Anniversary", type: "special" },
            { date: `${year}-11-01`, name: "All Saints' Day", type: "special" },
            { date: `${year}-11-02`, name: "All Souls' Day", type: "special" },
            
            // Religious holidays (2025 dates)
            ...(year === 2025 ? [
                { date: "2025-04-17", name: "Maundy Thursday", type: "regular" },
                { date: "2025-04-18", name: "Good Friday", type: "regular" },
                { date: "2025-04-19", name: "Black Saturday", type: "special" },
                { date: "2025-04-20", name: "Easter Sunday", type: "special" },
            ] : []),
        ];
    }

}
