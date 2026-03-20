<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode([]));
}

$stmt = $conn->query("SELECT id, username FROM users ORDER BY id DESC");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>