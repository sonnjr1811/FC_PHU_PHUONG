<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

// Kiểm tra quyền
if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode(["success" => false, "message" => "Hết phiên làm việc!"]));
}

$data = json_decode(file_get_contents("php://input"), true);
$newPass = trim($data['password']);
$currentUser = $_SESSION['admin_user']; // Tên user đang đăng nhập

if (empty($newPass)) {
    die(json_encode(["success" => false, "message" => "Mật khẩu không được để trống"]));
}

try {
    $stmt = $conn->prepare("UPDATE admins SET password = ? WHERE username = ?");
    $stmt->execute([$newPass, $currentUser]);
    
    echo json_encode(["success" => true, "message" => "Đổi mật khẩu thành công!"]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Lỗi: " . $e->getMessage()]);
}
?>