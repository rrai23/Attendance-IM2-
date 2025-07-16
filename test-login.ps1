# Simple login test
Write-Host "Testing login endpoint..." -ForegroundColor Yellow

$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginUrl = "http://localhost:3000/api/auth/login"
$loginHeaders = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Making login request..." -ForegroundColor Cyan
    Write-Host "URL: $loginUrl" -ForegroundColor Gray
    Write-Host "Data: $loginData" -ForegroundColor Gray
    
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Headers $loginHeaders -Body $loginData
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Response: $($loginResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get the response content
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseText = $reader.ReadToEnd()
            Write-Host "Response content: $responseText" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read response content" -ForegroundColor Gray
        }
    }
}
