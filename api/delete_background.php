<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

// Bảo mật: Chỉ admin mới được thực hiện
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    die(json_encode(["success" => false, "message" => "ID không hợp lệ."]));
}

// Lấy đường dẫn file ảnh để xóa file vật lý
$stmt_get = $conn->prepare("SELECT image_url FROM backgrounds WHERE id = ?");
$stmt_get->execute([$id]);
$bg = $stmt_get->fetch(PDO::FETCH_ASSOC);

if ($bg) {
    // Xóa file vật lý trên server
    $filePath = '../' . $bg['image_url'];
    if (file_exists($filePath)) {
        @unlink($filePath);
    }
    
    // Xóa dữ liệu trong database
    $stmt = $conn->prepare("DELETE FROM backgrounds WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Không tìm thấy hình nền."]);
}
?>
