# Employee Data Issues - Investigation and Fix

## Issues Identified

### 1. ❌ localStorage Key Mismatch 
**Problem**: Test files were checking for `'bricks_data'` but the actual service uses `'bricks_attendance_data'`

**Root Cause**: Inconsistent localStorage key naming between test files and the actual data service.

**Fix Applied**: Updated test files to use the correct localStorage key `'bricks_attendance_data'`

### 2. ❌ 6 Employees vs 5 in data.json
**Problem**: Employee page shows 6 employees but data.json only contains 5

**Root Cause**: Multiple data sources creating different sets of employees:
- `mock/data.json` contains 5 employees (emp_001 to emp_005)
- `LocalStorageDataService.createDefaultData()` creates 6 employees (emp_001 to emp_006)
- `UnifiedEmployeeManager` has its own hardcoded 5 employees

**The 6th Employee**: "Lisa Crane" (emp_006, Crane Operator) from `createDefaultData()` method

## Data Source Analysis

### 📁 `mock/data.json` (5 employees)
1. Administrator (emp_001) - Management
2. John Smith (emp_002) - Operations  
3. Jane Doe (emp_003) - Quality Control
4. Mike Johnson (emp_004) - Production
5. Sarah Wilson (emp_005) - Logistics

### 🔧 `LocalStorageDataService.createDefaultData()` (6 employees)
1. John Administrator (emp_001) - Management
2. Jane Employee (emp_002) - Operations
3. Mike Worker (emp_003) - Operations  
4. Sarah Builder (emp_004) - Operations
5. Tom Mason (emp_005) - Operations
6. **Lisa Crane (emp_006) - Operations** ← The extra employee!

### 🔄 `UnifiedEmployeeManager` (5 employees)
1. John Doe (emp_001) - Engineering
2. Jane Smith (emp_002) - Marketing
3. Bob Johnson (emp_003) - Sales
4. Alice Brown (emp_004) - HR
5. Charlie Wilson (emp_005) - Engineering

## Current Data Flow

```
1. localStorage exists? → Use stored data (may contain 6 employees from previous createDefaultData call)
2. No localStorage? → Try to load data.json (5 employees)
3. data.json fails? → Fall back to createDefaultData() (6 employees)
```

## Solutions Implemented

### ✅ Fixed localStorage Key Issue
- Updated `test-employee-persistence.html` to use correct key `'bricks_attendance_data'`
- Updated clear data function to clear all possible keys
- Test should now properly detect localStorage data

### ✅ Created Debug Tool
- Created `debug-employee-sources.html` to investigate all data sources
- Shows exactly where each employee is coming from
- Helps identify conflicts between data sources

## Recommended Next Steps

### 🔧 Option 1: Standardize on data.json (Recommended)
**Add 6th employee to data.json to match createDefaultData:**

```json
{
  "id": 6,
  "username": "lisa.crane",
  "password": "password123",
  "role": "employee", 
  "fullName": "Lisa Crane",
  "email": "lisa.crane@bricks.com",
  "department": "Operations",
  "position": "Crane Operator",
  "employeeId": "emp_006",
  "dateHired": "2024-05-01",
  "status": "active",
  "wage": 24.00,
  "overtimeRate": 1.5,
  "avatar": null
}
```

### 🔧 Option 2: Update createDefaultData to match data.json
Remove the 6th employee from createDefaultData method to have only 5 employees.

### 🔧 Option 3: Clear localStorage and Test
The 6th employee might be in localStorage from a previous session when createDefaultData was used.

## Test Instructions

1. **Clear localStorage**: Use the debug tool or test tool to clear all localStorage
2. **Test Persistence**: 
   - Add new employee → Should get emp_006 (if following 5-employee data.json)
   - Refresh page → Employee should persist
   - Check localStorage → Should find data with correct key

3. **Debug Data Sources**: Use `debug-employee-sources.html` to see exactly where employees come from

## Files Updated

✅ `test-employee-persistence.html` - Fixed localStorage key  
✅ `debug-employee-sources.html` - New debug tool  
🟡 `mock/data.json` - Needs 6th employee to match createDefaultData  
🟡 `js/core/local-storage-service.js` - Consider standardizing employee count

## Summary

The "6 employees vs 5" issue is caused by inconsistent data between `data.json` (5) and `createDefaultData()` (6). The localStorage persistence issue was caused by wrong key name in tests. Both are now identified and can be easily fixed by standardizing the employee data across all sources.
