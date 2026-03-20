<?php
session_start();
include 'db.php';

// Bảo mật: Chỉ admin mới được upload
if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode(["success" => false, "message" => "Bạn không có quyền!"]));
}

if ($_FILES['photo']['error'] === 0) {
    $title = $_POST['title'];
    $folder = "../uploads/";
    
    // Tạo thư mục nếu chưa có
    if (!file_exists($folder)) mkdir($folder, 0777, true);

    $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $filename = time() . '_' . uniqid() . '.' . $ext; // Tên file ngẫu nhiên tránh trùng
    $path = $folder . $filename;
    $db_path = "uploads/" . $filename;

    if (move_uploaded_file($_FILES['photo']['tmp_name'], $path)) {
        // Lưu vào DB
        $stmt = $conn->prepare("INSERT INTO album (title, image_url, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([$title, $db_path]);
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Không thể lưu file vào thư mục uploads."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Lỗi file tải lên."]);
}
?>