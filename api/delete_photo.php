<?php
session_start();
include 'db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode(["success" => false, "message" => "Access Denied"]));
}

$id = $_GET['id'];

// Lấy đường dẫn file ảnh để xóa file vật lý
$stmt_get = $conn->prepare("SELECT image_url FROM album WHERE id = ?");
$stmt_get->execute([$id]);
$photo = $stmt_get->fetch(PDO::FETCH_ASSOC);

if ($photo) {
    // Xóa file vật lý trên server
    unlink('../' . $photo['image_url']);
    
    // Xóa dữ liệu trong database
    $stmt = $conn->prepare("DELETE FROM album WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Không tìm thấy ảnh."]);
}
?>