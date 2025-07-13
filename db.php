<?php
// Database connection configuration

// Create connection
$conn = mysqli_connect('localhost', 'root', '', 'brix');

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Set charset to utf8
mysqli_set_charset($conn, "utf8");

// Optional: Set timezone (adjust as needed)
mysqli_query($conn, "SET time_zone = '+00:00'");
?>