<?php
session_start();
include 'db.php';
if (!isset($_SESSION['admin_logged_in'])) die();
$stmt = $conn->prepare("DELETE FROM notices WHERE id = ?");
$stmt->execute([$_GET['id']]);
echo json_encode(["success" => true]);