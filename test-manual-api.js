const fetch = require('node-fetch');

const testData = {
    employee_id: "EMP250007",
    date: "2025-07-17",
    time_in: "06:06",
    time_out: "18:06",
    status: "present",
    notes: "test",
    hours_worked: 12
};

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6ImFkbWluXzAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTI3Mzg1MDAsImV4cCI6MTc1MjgyNDkwMH0.ZJvr76pIVCVntleW-Igm_sS9hxPl_7xEHSiBvWzZX1U";

fetch('http://localhost:3000/api/attendance/manual', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testData)
})
.then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    return response.text();
})
.then(data => {
    console.log('Response body:', data);
})
.catch(error => {
    console.error('Error:', error);
});
