# Test Employee Creation Script
Write-Host "Testing Employee Creation..." -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$loginUrl = "$baseUrl/api/auth/login"
$employeeUrl = "$baseUrl/api/employees"

# Login credentials
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Step 1: Logging in..." -ForegroundColor Yellow

try {
    # Login request with timeout
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 30
    
    if ($loginResponse.success) {
        Write-Host "✅ Login successful!" -ForegroundColor Green
        $token = $loginResponse.data.token
        Write-Host "Token received: $($token.Substring(0, 20))..." -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Creating employee..." -ForegroundColor Yellow

# Employee data
$employeeData = @{
    first_name = "John"
    last_name = "Doe"
    email = "john.doe@example.com"
    phone = "555-1234"
    department = "IT"
    position = "Developer"
    date_hired = "2025-01-15"
    salary = 50000
    username = "john.doe"
    password = "password123"
    role = "employee"
} | ConvertTo-Json

# Headers with authentication
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    # Create employee request with timeout
    $createResponse = Invoke-RestMethod -Uri $employeeUrl -Method POST -Body $employeeData -Headers $headers -TimeoutSec 30
    
    if ($createResponse.success) {
        Write-Host "✅ Employee created successfully!" -ForegroundColor Green
        Write-Host "Employee ID: $($createResponse.data.employee.employee_code)" -ForegroundColor Green
        Write-Host "Full Name: $($createResponse.data.employee.full_name)" -ForegroundColor Green
    } else {
        Write-Host "❌ Employee creation failed: $($createResponse.message)" -ForegroundColor Red
    }
} catch {
    $errorMessage = $_.Exception.Message
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "❌ Employee creation error (Status: $statusCode): $errorMessage" -ForegroundColor Red
        
        # Try to get error details from response
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Error details: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Employee creation error: $errorMessage" -ForegroundColor Red
    }
}

Write-Host "Test completed." -ForegroundColor Cyan
