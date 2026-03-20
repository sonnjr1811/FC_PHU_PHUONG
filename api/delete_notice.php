<?php
session_start();
include 'db.php';
if (!isset($_SESSION['admin_logged_in'])) die();
$data = json_decode(file_get_contents("php://input"), true);
$stmt = $conn->prepare("UPDATE notices SET content = ? WHERE id = ?");
$stmt->execute([$data['content'], $data['id']]);
echo json_encode(["success" => true]);