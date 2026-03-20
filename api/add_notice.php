<?php
session_start();
include 'db.php';
if (!isset($_SESSION['admin_logged_in'])) die();
$data = json_decode(file_get_contents("php://input"), true);
$stmt = $conn->prepare("INSERT INTO notices (content, created_at) VALUES (?, NOW())");
$stmt->execute([$data['content']]);
echo json_encode(["success" => true]);