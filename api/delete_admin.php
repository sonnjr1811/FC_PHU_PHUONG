<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    die(json_encode(["success" => false, "message" => "Hết phiên đăng nhập!"]));
}

$id = $_GET['id'] ?? null;
if (!$id) {
    die(json_encode(["success" => false, "message" => "Thiếu ID"]));
}

// Không cho phép xóa chính mình để tránh lỗi hệ thống không có admin
if ($id == $_SESSION['admin_id']) {
    die(json_encode(["success" => false, "message" => "Không thể tự xóa chính mình!"]));
}

try {
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Lỗi: " . $e->getMessage()]);
}
?>