# Test Settings Page DirectFlow Integration
Write-Host "Testing Settings Page with DirectFlow..." -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$loginUrl = "$baseUrl/api/auth/login"
$settingsUrl = "$baseUrl/api/settings"

# Login credentials
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Step 1: Logging in..." -ForegroundColor Yellow

try {
    # Login request
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

Write-Host "Step 2: Testing settings GET..." -ForegroundColor Yellow

# Headers with authentication
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    # Get settings
    $settingsResponse = Invoke-RestMethod -Uri $settingsUrl -Method GET -Headers $headers -TimeoutSec 30
    
    if ($settingsResponse.success) {
        Write-Host "✅ Settings retrieved successfully!" -ForegroundColor Green
        Write-Host "Settings data: $($settingsResponse.data.settings | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Settings retrieval failed: $($settingsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Settings GET error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Step 3: Testing settings POST..." -ForegroundColor Yellow

# Test settings data
$testSettings = @{
    company_name = "Test Company"
    timezone = "Asia/Manila"
    theme = "dark"
} | ConvertTo-Json

try {
    # Save settings
    $saveResponse = Invoke-RestMethod -Uri $settingsUrl -Method POST -Body $testSettings -Headers $headers -TimeoutSec 30
    
    if ($saveResponse.success) {
        Write-Host "✅ Settings saved successfully!" -ForegroundColor Green
        Write-Host "Save results: $($saveResponse.data | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Settings save failed: $($saveResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Settings POST error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Settings test completed." -ForegroundColor Cyan
