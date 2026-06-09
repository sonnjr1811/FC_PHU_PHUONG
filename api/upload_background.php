<?php
session_start();
header('Content-Type: application/json');

// Bảo mật: Chỉ admin mới được thực hiện
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

if (isset($_FILES['background']) && $_FILES['background']['error'] === 0) {
    $folder = "../uploads/";
    
    // Tạo thư mục nếu chưa có
    if (!file_exists($folder)) {
        mkdir($folder, 0777, true);
    }

    $ext = pathinfo($_FILES['background']['name'], PATHINFO_EXTENSION);
    if (empty($ext)) {
        $ext = 'jpg';
    }
    
    $filename = 'bg_' . time() . '_' . uniqid() . '.' . $ext;
    $path = $folder . $filename;
    $db_path = "uploads/" . $filename;

    if (move_uploaded_file($_FILES['background']['tmp_name'], $path)) {
        include 'db.php';
        try {
            $stmt = $conn->prepare("INSERT INTO backgrounds (image_url) VALUES (?)");
            $stmt->execute([$db_path]);
            echo json_encode([
                "success" => true,
                "message" => "Tải ảnh nền lên thành công",
                "url" => $db_path
            ]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Lỗi lưu Database: " . $e->getMessage()]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Không thể lưu file ảnh vào thư mục uploads"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Lỗi hoặc không tìm thấy file ảnh tải lên"]);
}
?>
