<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode(["success" => false, "message" => "Hết phiên đăng nhập!"]));
}

$data = json_decode(file_get_contents("php://input"), true);
$user = trim($data['username']);
$pass = trim($data['password']);

if (empty($user) || empty($pass)) {
    die(json_encode(["success" => false, "message" => "Không bỏ trống thông tin!"]));
}

try {
    // Kiểm tra trùng tên trong bảng users
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$user]);
    if ($check->rowCount() > 0) {
        die(json_encode(["success" => false, "message" => "Tên đăng nhập này đã tồn tại!"]));
    }

    // Chèn vào bảng users
    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    $stmt->execute([$user, $pass]);
    echo json_encode(["success" => true, "message" => "Đã tạo tài khoản Admin mới!"]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Lỗi: " . $e->getMessage()]);
}
?>