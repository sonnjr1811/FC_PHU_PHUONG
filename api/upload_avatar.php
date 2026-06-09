<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

// Bảo mật: Chỉ admin mới được upload
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === 0) {
    $folder = "../uploads/";
    
    // Tạo thư mục nếu chưa có
    if (!file_exists($folder)) {
        mkdir($folder, 0777, true);
    }

    $ext = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
    if (empty($ext)) {
        $ext = 'jpg'; // Mặc định nếu không lấy được extension
    }
    
    $filename = 'avatar_' . time() . '_' . uniqid() . '.' . $ext;
    $path = $folder . $filename;
    $db_path = "uploads/" . $filename;

    if (move_uploaded_file($_FILES['avatar']['tmp_name'], $path)) {
        echo json_encode([
            "success" => true,
            "message" => "Tải ảnh lên thành công",
            "url" => $db_path
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Không thể lưu file ảnh vào thư mục uploads"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Lỗi hoặc không tìm thấy file ảnh tải lên"]);
}
?>
