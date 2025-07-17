# Automatic User Account Creation for Employees

## Overview

The Bricks Attendance System now automatically creates user accounts for every new employee added to the system. This ensures seamless integration between employee records and authentication systems.

## Features

### 🔄 Automatic Account Generation
- **User accounts are created automatically** for every new employee
- **No manual intervention required** for basic account setup
- **Immediate access** - employees can log in right after creation

### 🏷️ Smart Username Generation
- **Pattern**: Concatenate first name + last name, remove spaces, convert to lowercase
- **Example**: "Erika Bianca Api" → `erikabiancaapi`
- **Uniqueness**: If username exists, automatically append numbers (`erikabiancaapi2`, etc.)

### 🔐 Password Convention
- **Pattern**: Last name + "123", remove spaces, convert to lowercase  
- **Example**: "Api" → `api123`
- **Secure**: Passwords are hashed using bcrypt with 12 salt rounds

### 🎫 Long-term JWT Tokens
- **Duration**: 365 days (1 year) from creation
- **Purpose**: Enables long-term API access for employees
- **Storage**: Tokens are stored in the database for session management

## Implementation Details

### Backend Changes

#### 1. Employee Creation Route (`backend/routes/employees.js`)
```javascript
// Auto-generate credentials based on naming convention
const generateCredentials = (firstName, lastName) => {
    const username = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
    const password = `${lastName.toLowerCase().replace(/\s+/g, '')}123`;
    return { username, password };
};

// Ensure username uniqueness
const ensureUniqueUsername = async (baseUsername) => {
    let uniqueUsername = baseUsername;
    let counter = 1;
    
    while (true) {
        const existing = await db.execute('SELECT username FROM user_accounts WHERE username = ?', [uniqueUsername]);
        if (existing.length === 0) {
            return uniqueUsername;
        }
        counter++;
        uniqueUsername = `${baseUsername}${counter}`;
    }
};
```

#### 2. JWT Token Helper Functions (`backend/routes/auth.js`)
```javascript
// Helper function to create JWT token with custom expiry
const createJWTToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Helper function to calculate expiry date from duration string
const calculateExpiryDate = (duration) => {
    const expiryDate = new Date();
    
    if (duration.includes('d')) {
        const days = parseInt(duration);
        expiryDate.setDate(expiryDate.getDate() + days);
    } else if (duration.includes('h')) {
        const hours = parseInt(duration);
        expiryDate.setHours(expiryDate.getHours() + hours);
    } else if (duration.includes('y')) {
        const years = parseInt(duration);
        expiryDate.setFullYear(expiryDate.getFullYear() + years);
    }
    
    return expiryDate;
};
```

### Database Integration

#### Tables Used:
1. **`employees`** - Employee information
2. **`user_accounts`** - Authentication credentials
3. **`user_sessions`** - JWT token storage

#### Transaction Safety:
- Employee and user account creation happens in a **single database transaction**
- If any step fails, the entire operation is rolled back
- Ensures data consistency

### API Response

When creating an employee, the API now returns:

```json
{
  "success": true,
  "message": "Employee and user account created successfully",
  "data": {
    "employee": {
      "employee_id": "EMP250009",
      "first_name": "Erika Bianca",
      "last_name": "Api",
      "email": "erika.bianca.api@company.com",
      "status": "active",
      // ... other employee fields
    },
    "credentials": {
      "username": "erikabiancaapi",
      "password": "api123",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenExpiry": "2026-07-17T11:07:40.668Z",
      "note": "Please share these credentials securely with the employee. The JWT token has a 365-day expiry and can be used for API access."
    }
  }
}
```

## Usage Examples

### 1. Basic Employee Creation
```javascript
// POST /api/employees
{
  "first_name": "Erika Bianca",
  "last_name": "Api",
  "email": "erika.bianca.api@company.com",
  "phone": "+1-555-0123",
  "department": "Software Development",
  "position": "Frontend Developer",
  "hire_date": "2025-01-17",
  "wage": 25.00
}

// Automatically generates:
// Username: erikabiancaapi
// Password: api123
// JWT Token: 365-day expiry
```

### 2. Complex Names
```javascript
// Employee: "Maria Elena Rodriguez Garcia"
// Username: mariaelenarodriguezgarcia
// Password: rodriguezgarcia123

// Employee: "Bob Johnson Jr"
// Username: bobjohnsonjr  
// Password: johnsonjr123
```

### 3. Username Collision Handling
```javascript
// First employee: "John Smith" → username: johnsmith
// Second employee: "John Smith" → username: johnsmith2
// Third employee: "John Smith" → username: johnsmith3
```

## Security Considerations

### ✅ Security Features
- **Password Hashing**: All passwords are hashed with bcrypt (12 salt rounds)
- **Unique Usernames**: Automatic collision detection and resolution
- **Long-term Tokens**: 365-day JWT tokens for sustained access
- **Session Tracking**: All tokens are stored in the database for monitoring

### ⚠️ Security Notes
- **Default passwords are predictable** - employees should change them after first login
- **Passwords are returned in API response** - handle securely on frontend
- **JWT tokens are long-lived** - monitor for potential misuse

## Integration with Existing Systems

### Authentication Flow
1. Employee logs in with auto-generated credentials
2. System validates against `user_accounts` table  
3. JWT token is issued (standard 24h for login, or existing long-term token)
4. Employee can access all system features based on their role

### Frontend Integration
- **Employee management UI** automatically gets credentials
- **No additional form fields** needed for username/password
- **Credentials can be displayed** to administrators for sharing
- **Login system remains unchanged** - works with auto-generated accounts

## Testing

### Test Scripts Created:
1. **`test-auto-employee-creation.js`** - Tests basic functionality with "Erika Bianca Api"
2. **`test-username-uniqueness.js`** - Tests username collision handling
3. **`test-name-patterns.js`** - Tests various name patterns

### Test Results:
- ✅ Username generation follows exact specification
- ✅ Password generation follows exact specification  
- ✅ Username uniqueness is maintained
- ✅ JWT tokens created with 365-day expiry
- ✅ Immediate login functionality works
- ✅ Database transactions maintain consistency

## Migration Notes

### Existing Employees
- **No impact** on existing employee records
- **Existing user accounts** remain unchanged
- **New feature applies** only to newly created employees

### Backward Compatibility
- **API remains compatible** with existing clients
- **Optional parameters** (username, password) are now ignored
- **Response format enhanced** but doesn't break existing integrations

## Future Enhancements

### Potential Improvements:
1. **Password complexity options** - Allow custom password patterns
2. **Email notifications** - Automatically send credentials to new employees
3. **Temporary passwords** - Force password change on first login
4. **Role-based defaults** - Different token expiry based on employee role
5. **Audit logging** - Track credential generation and usage

---

## Quick Start

To use the new automatic account creation:

1. **Create employee as usual** through the API or UI
2. **Credentials are automatically generated** and returned
3. **Share credentials securely** with the new employee
4. **Employee can log in immediately** with generated credentials

The system handles all the complexity of username generation, password creation, and account setup automatically!
