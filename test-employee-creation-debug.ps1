# Test employee creation API with debug
Write-Host "Testing employee creation API with debug..." -ForegroundColor Yellow

# First, let's login to get a valid token
Write-Host "Logging in to get valid token..." -ForegroundColor Cyan

$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginUrl = "http://localhost:3000/api/auth/login"
$loginHeaders = @{
    "Content-Type" = "application/json"
}

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Headers $loginHeaders -Body $loginData
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful, token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Employee data with correct field names
$employeeData = @{
    employee_code = "EMP004"
    first_name = "John"
    last_name = "Doe"
    email = "john.doe@example.com"
    phone = "555-1234"
    department = "IT"
    position = "Developer"
    date_hired = "2024-01-15"
    hourly_rate = 25.00
    overtime_rate = 37.50
    status = "active"
    # Optional user account creation
    username = "john.doe"
    password = "Test123!"
    role = "employee"
} | ConvertTo-Json

# API endpoint
$url = "http://localhost:3000/api/employees"

# Request headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Authorization header: $($headers.Authorization.Substring(0, 30))..." -ForegroundColor Blue

try {
    # Make POST request
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $employeeData
    
    Write-Host "✅ Employee creation successful!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Employee creation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Response)" -ForegroundColor Red
    }
}
