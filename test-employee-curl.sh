#!/bin/bash
# Test employee creation with curl

echo "Testing employee creation with curl..."

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
echo "Token: $TOKEN"

# Test employee creation
curl -v -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_code": "EMP005",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "555-1234",
    "department": "IT",
    "position": "Developer",
    "date_hired": "2024-01-15",
    "hourly_rate": 25.00,
    "overtime_rate": 37.50,
    "status": "active"
  }'
