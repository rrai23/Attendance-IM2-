# API Promise Structure Reference

## Standardized Response Formats

### Success Response Structure
```javascript
{
  success: true,
  data: <response_data>,
  message?: <optional_success_message>,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Error Response Structure
```javascript
{
  success: false,
  message: <error_message>,
  error?: <detailed_error_info>,
  code?: <error_code>
}
```

## API Endpoints Response Formats

### Attendance Records
- **GET /api/attendance/**
  ```javascript
  {
    success: true,
    data: {
      records: [
        {
          id: number,
          employee_id: string,
          date: string,
          time_in: string,
          time_out: string,
          hours_worked: number,
          status: string,
          notes: string,
          created_at: string,
          updated_at: string,
          first_name: string,
          last_name: string,
          department: string,
          position: string
        }
      ],
      pagination: {...}
    }
  }
  ```

- **POST /api/attendance/manual**
  ```javascript
  {
    success: true,
    message: "Manual attendance record created successfully",
    data: {
      record: {...}
    }
  }
  ```

- **PUT /api/attendance/:id**
  ```javascript
  {
    success: true,
    message: "Attendance record updated successfully",
    data: {
      record: {...}
    }
  }
  ```

- **DELETE /api/attendance/:id**
  ```javascript
  {
    success: true,
    message: "Attendance record deleted successfully",
    data: {
      deleted_record: {
        id: number,
        employee_id: string,
        date: string,
        deleted_by: string,
        deleted_at: string
      }
    }
  }
  ```

### Employee Records
- **GET /api/employees/**
  ```javascript
  {
    success: true,
    data: {
      employees: [
        {
          id: number,
          employee_id: string,
          first_name: string,
          last_name: string,
          full_name: string,
          email: string,
          department: string,
          position: string,
          hire_date: string,
          status: string
        }
      ]
    }
  }
  ```

### Authentication
- **POST /api/auth/login**
  ```javascript
  {
    success: true,
    message: "Login successful",
    token: string,
    user: {
      employee_id: string,
      username: string,
      role: string,
      full_name: string
    }
  }
  ```

## Frontend Error Handling Best Practices

### Promise Handling Pattern
```javascript
async function apiCall() {
  try {
    const response = await api.someMethod();
    
    // Check for success
    if (response && response.success) {
      // Handle successful response
      return response.data;
    } else {
      // Handle API error response
      throw new Error(response?.message || 'API call failed');
    }
  } catch (error) {
    // Handle network/parsing errors
    console.error('API call failed:', error);
    throw error;
  }
}
```

### Response Data Extraction Pattern
```javascript
// For paginated data (attendance records)
if (response && response.success && response.data && response.data.records) {
  this.data = response.data.records;
  this.pagination = response.data.pagination;
}

// For direct array data (employees)
if (response && response.success && response.data && response.data.employees) {
  this.employees = response.data.employees;
}

// For single record operations
if (response && response.success && response.data && response.data.record) {
  const updatedRecord = response.data.record;
}
```

### Button State Management Pattern
```javascript
async function handleButtonAction() {
  const button = document.getElementById('actionBtn');
  
  if (!button) {
    console.warn('Button not found');
    return;
  }
  
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  
  try {
    // Show loading state
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    button.disabled = true;
    
    // Perform action
    await someAsyncOperation();
    
  } catch (error) {
    console.error('Action failed:', error);
    // Handle error
  } finally {
    // Reset button state
    if (btnText) btnText.classList.remove('hidden');
    if (btnLoading) btnLoading.classList.add('hidden');
    button.disabled = false;
  }
}
```

## Common Issues & Solutions

### Issue: `refreshBtn is null`
**Cause**: Element doesn't exist in DOM when accessed
**Solution**: Always check for element existence
```javascript
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  // Safe to use refreshBtn
}
```

### Issue: `querySelector` on null element
**Cause**: Parent element is null
**Solution**: Check parent element first
```javascript
const button = document.getElementById('someBtn');
if (button) {
  const btnText = button.querySelector('.btn-text');
  if (btnText) {
    // Safe to use btnText
  }
}
```

### Issue: Response format inconsistency
**Cause**: Different endpoints return different structures
**Solution**: Handle multiple response formats
```javascript
let data = [];
if (Array.isArray(response)) {
  data = response;
} else if (response?.success && response?.data) {
  data = response.data.records || response.data.employees || response.data || [];
} else if (response?.data) {
  data = response.data;
}
```