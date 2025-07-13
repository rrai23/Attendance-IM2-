<?php
// Include authentication and database connection
require_once 'auth.php';
require_once 'db.php';

// Check if user is admin
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    header('Location: /IM2/login.php');
    exit();
}

// Handle POST requests for attendance record updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'update_attendance':
                $attendance_id = mysqli_real_escape_string($conn, $_POST['attendance_id']);
                $status = mysqli_real_escape_string($conn, $_POST['status']);
                $time_in = mysqli_real_escape_string($conn, $_POST['time_in']);
                $time_out = mysqli_real_escape_string($conn, $_POST['time_out']);
                $notes = mysqli_real_escape_string($conn, $_POST['notes']);
                
                $update_query = "UPDATE attendance SET status = ?, time_in = ?, time_out = ?, notes = ? WHERE id = ?";
                $stmt = mysqli_prepare($conn, $update_query);
                mysqli_stmt_bind_param($stmt, "ssssi", $status, $time_in, $time_out, $notes, $attendance_id);
                
                if (mysqli_stmt_execute($stmt)) {
                    $success_message = "Attendance record updated successfully.";
                } else {
                    $error_message = "Error updating attendance record.";
                }
                mysqli_stmt_close($stmt);
                break;
                
            case 'delete_attendance':
                $attendance_id = mysqli_real_escape_string($conn, $_POST['attendance_id']);
                
                $delete_query = "DELETE FROM attendance WHERE id = ?";
                $stmt = mysqli_prepare($conn, $delete_query);
                mysqli_stmt_bind_param($stmt, "i", $attendance_id);
                
                if (mysqli_stmt_execute($stmt)) {
                    $success_message = "Attendance record deleted successfully.";
                } else {
                    $error_message = "Error deleting attendance record.";
                }
                mysqli_stmt_close($stmt);
                break;
        }
    }
}

// Get filter parameters from GET request
$employee_filter = isset($_GET['employee']) ? mysqli_real_escape_string($conn, $_GET['employee']) : '';
$status_filter = isset($_GET['status']) ? mysqli_real_escape_string($conn, $_GET['status']) : '';
$start_date = isset($_GET['start_date']) ? mysqli_real_escape_string($conn, $_GET['start_date']) : '';
$end_date = isset($_GET['end_date']) ? mysqli_real_escape_string($conn, $_GET['end_date']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$records_per_page = 20;
$offset = ($page - 1) * $records_per_page;

// Build WHERE clause for filters
$where_conditions = array();
$params = array();
$param_types = "";

if (!empty($employee_filter)) {
    $where_conditions[] = "a.employee_id = ?";
    $params[] = $employee_filter;
    $param_types .= "i";
}

if (!empty($status_filter)) {
    $where_conditions[] = "a.status = ?";
    $params[] = $status_filter;
    $param_types .= "s";
}

if (!empty($start_date)) {
    $where_conditions[] = "a.date >= ?";
    $params[] = $start_date;
    $param_types .= "s";
}

if (!empty($end_date)) {
    $where_conditions[] = "a.date <= ?";
    $params[] = $end_date;
    $param_types .= "s";
}

$where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

// Get total count for pagination
$count_query = "SELECT COUNT(*) as total FROM attendance a JOIN employees e ON a.employee_id = e.id $where_clause";
if (!empty($params)) {
    $count_stmt = mysqli_prepare($conn, $count_query);
    mysqli_stmt_bind_param($count_stmt, $param_types, ...$params);
    mysqli_stmt_execute($count_stmt);
    $count_result = mysqli_stmt_get_result($count_stmt);
} else {
    $count_result = mysqli_query($conn, $count_query);
}
$total_records = mysqli_fetch_assoc($count_result)['total'];
$total_pages = ceil($total_records / $records_per_page);

// Get attendance records with employee names
$query = "SELECT a.*, e.firstName, e.department, e.position 
          FROM attendance a 
          JOIN employees e ON a.employee_id = e.id 
          $where_clause 
          ORDER BY a.date DESC, a.time_in DESC 
          LIMIT ? OFFSET ?";

$params[] = $records_per_page;
$params[] = $offset;
$param_types .= "ii";

$stmt = mysqli_prepare($conn, $query);
if (!empty($where_conditions)) {
    mysqli_stmt_bind_param($stmt, $param_types, ...$params);
} else {
    mysqli_stmt_bind_param($stmt, "ii", $records_per_page, $offset);
}
mysqli_stmt_execute($stmt);
$attendance_result = mysqli_stmt_get_result($stmt);

// Get all employees for filter dropdown
$employees_query = "SELECT id, firstName FROM employees WHERE status = 'active' ORDER BY firstName";
$employees_result = mysqli_query($conn, $employees_query);

include 'header.php';
?>

<div class="main-content">
    <div class="page-header">
        <h1>Attendance Management</h1>
        <p>Manage and monitor employee attendance records</p>
    </div>

    <?php if (isset($success_message)): ?>
        <div class="alert alert-success">
            <?php echo htmlspecialchars($success_message); ?>
        </div>
    <?php endif; ?>

    <?php if (isset($error_message)): ?>
        <div class="alert alert-error">
            <?php echo htmlspecialchars($error_message); ?>
        </div>
    <?php endif; ?>

    <!-- Filters Section -->
    <div class="filters-section">
        <form method="GET" class="filters-form">
            <div class="filter-group">
                <label for="employee">Employee:</label>
                <select name="employee" id="employee">
                    <option value="">All Employees</option>
                    <?php while ($employee = mysqli_fetch_assoc($employees_result)): ?>
                        <option value="<?php echo $employee['id']; ?>" 
                                <?php echo ($employee_filter == $employee['id']) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($employee['firstName']); ?>
                        </option>
                    <?php endwhile; ?>
                </select>
            </div>

            <div class="filter-group">
                <label for="status">Status:</label>
                <select name="status" id="status">
                    <option value="">All Status</option>
                    <option value="present" <?php echo ($status_filter == 'present') ? 'selected' : ''; ?>>Present</option>
                    <option value="absent" <?php echo ($status_filter == 'absent') ? 'selected' : ''; ?>>Absent</option>
                    <option value="late" <?php echo ($status_filter == 'late') ? 'selected' : ''; ?>>Late</option>
                    <option value="half_day" <?php echo ($status_filter == 'half_day') ? 'selected' : ''; ?>>Half Day</option>
                </select>
            </div>

            <div class="filter-group">
                <label for="start_date">Start Date:</label>
                <input type="date" name="start_date" id="start_date" value="<?php echo htmlspecialchars($start_date); ?>">
            </div>

            <div class="filter-group">
                <label for="end_date">End Date:</label>
                <input type="date" name="end_date" id="end_date" value="<?php echo htmlspecialchars($end_date); ?>">
            </div>

            <div class="filter-actions">
                <button type="submit" class="btn btn-primary">Apply Filters</button>
                <a href="attendance.php" class="btn btn-secondary">Clear Filters</a>
            </div>
        </form>
    </div>

    <!-- Attendance Records Table -->
    <div class="table-container">
        <div class="table-header">
            <h2>Attendance Records</h2>
            <div class="table-info">
                Showing <?php echo min($offset + 1, $total_records); ?> to <?php echo min($offset + $records_per_page, $total_records); ?> of <?php echo $total_records; ?> records
            </div>
        </div>

        <table class="attendance-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                    <th>Hours Worked</th>
                    <th>Notes</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (mysqli_num_rows($attendance_result) > 0): ?>
                    <?php while ($record = mysqli_fetch_assoc($attendance_result)): ?>
                        <tr>
                            <td><?php echo date('M d, Y', strtotime($record['date'])); ?></td>
                            <td><?php echo htmlspecialchars($record['firstName']); ?></td>
                            <td><?php echo htmlspecialchars($record['department']); ?></td>
                            <td><?php echo $record['time_in'] ? date('h:i A', strtotime($record['time_in'])) : '-'; ?></td>
                            <td><?php echo $record['time_out'] ? date('h:i A', strtotime($record['time_out'])) : '-'; ?></td>
                            <td>
                                <span class="status-badge status-<?php echo $record['status']; ?>">
                                    <?php echo ucfirst($record['status']); ?>
                                </span>
                            </td>
                            <td>
                                <?php 
                                if ($record['time_in'] && $record['time_out']) {
                                    $time_in = new DateTime($record['time_in']);
                                    $time_out = new DateTime($record['time_out']);
                                    $diff = $time_in->diff($time_out);
                                    echo $diff->format('%h:%I');
                                } else {
                                    echo '-';
                                }
                                ?>
                            </td>
                            <td><?php echo htmlspecialchars($record['notes'] ?? ''); ?></td>
                            <td class="actions">
                                <button class="btn btn-sm btn-primary" onclick="editAttendance(<?php echo $record['id']; ?>)">
                                    Edit
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteAttendance(<?php echo $record['id']; ?>)">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="9" class="no-records">No attendance records found</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <?php if ($total_pages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page - 1])); ?>" class="btn btn-secondary">Previous</a>
            <?php endif; ?>

            <?php for ($i = max(1, $page - 2); $i <= min($total_pages, $page + 2); $i++): ?>
                <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>" 
                   class="btn <?php echo ($i == $page) ? 'btn-primary' : 'btn-secondary'; ?>">
                    <?php echo $i; ?>
                </a>
            <?php endfor; ?>

            <?php if ($page < $total_pages): ?>
                <a href="?<?php echo http_build_query(array_merge($_GET, ['page' => $page + 1])); ?>" class="btn btn-secondary">Next</a>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</div>

<!-- Edit Attendance Modal -->
<div id="editModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Edit Attendance Record</h3>
            <span class="close" onclick="closeModal()">&times;</span>
        </div>
        <form method="POST" id="editForm">
            <input type="hidden" name="action" value="update_attendance">
            <input type="hidden" name="attendance_id" id="edit_attendance_id">
            
            <div class="form-group">
                <label for="edit_status">Status:</label>
                <select name="status" id="edit_status" required>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                </select>
            </div>

            <div class="form-group">
                <label for="edit_time_in">Time In:</label>
                <input type="time" name="time_in" id="edit_time_in">
            </div>

            <div class="form-group">
                <label for="edit_time_out">Time Out:</label>
                <input type="time" name="time_out" id="edit_time_out">
            </div>

            <div class="form-group">
                <label for="edit_notes">Notes:</label>
                <textarea name="notes" id="edit_notes" rows="3"></textarea>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Record</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div id="deleteModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Confirm Delete</h3>
            <span class="close" onclick="closeDeleteModal()">&times;</span>
        </div>
        <div class="modal-body">
            <p>Are you sure you want to delete this attendance record? This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
            <form method="POST" id="deleteForm">
                <input type="hidden" name="action" value="delete_attendance">
                <input type="hidden" name="attendance_id" id="delete_attendance_id">
                <button type="submit" class="btn btn-danger">Delete</button>
                <button type="button" class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
            </form>
        </div>
    </div>
</div>

<script>
function editAttendance(attendanceId) {
    // Fetch attendance record data via AJAX or use existing data
    fetch('get_attendance.php?id=' + attendanceId)
        .then(response => response.json())
        .then(data => {
            document.getElementById('edit_attendance_id').value = attendanceId;
            document.getElementById('edit_status').value = data.status;
            document.getElementById('edit_time_in').value = data.time_in;
            document.getElementById('edit_time_out').value = data.time_out;
            document.getElementById('edit_notes').value = data.notes || '';
            document.getElementById('editModal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching attendance data:', error);
            alert('Error loading attendance data');
        });
}

function deleteAttendance(attendanceId) {
    document.getElementById('delete_attendance_id').value = attendanceId;
    document.getElementById('deleteModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    if (event.target == editModal) {
        editModal.style.display = 'none';
    }
    if (event.target == deleteModal) {
        deleteModal.style.display = 'none';
    }
}

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.remove();
            }, 300);
        }, 5000);
    });
});
</script>

<style>
.filters-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters-form {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
    min-width: 150px;
}

.filter-group label {
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
}

.filter-group select,
.filter-group input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.filter-actions {
    display: flex;
    gap: 10px;
}

.table-container {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.table-info {
    color: #666;
    font-size: 14px;
}

.attendance-table {
    width: 100%;
    border-collapse: collapse;
}

.attendance-table th,
.attendance-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
}

.attendance-table th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #333;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
}

.status-present {
    background-color: #d4edda;
    color: #155724;
}

.status-absent {
    background-color: #f8d7da;
    color: #721c24;
}

.status-late {
    background-color: #fff3cd;
    color: #856404;
}

.status-half_day {
    background-color: #d1ecf1;
    color: #0c5460;
}

.actions {
    display: flex;
    gap: 5px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    font-size: 14px;
    transition: background-color 0.2s;
}

.btn-primary {
    background-color: #007bff;
    color: white;
}

.btn-primary:hover {
    background-color: #0056b3;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background-color: #545b62;
}

.btn-danger {
    background-color: #dc3545;
    color: white;
}

.btn-danger:hover {
    background-color: #c82333;
}

.btn-sm {
    padding: 4px 8px;
    font-size: 12px;
}

.pagination {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin: 20px 0;
}

.modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 0;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.close {
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    color: #999;
}

.close:hover {
    color: #333;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

.alert {
    padding: 12px 20px;
    margin-bottom: 20px;
    border-radius: 4px;
    transition: opacity 0.3s;
}

.alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.alert-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.no-records {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 40px;
}

@media (max-width: 768px) {
    .filters-form {
        flex-direction: column;
    }
    
    .filter-group {
        min-width: 100%;
    }
    
    .attendance-table {
        font-size: 12px;
    }
    
    .attendance-table th,
    .attendance-table td {
        padding: 8px 4px;
    }
    
    .actions {
        flex-direction: column;
    }
}
</style>

<?php include 'footer.php'; ?>
