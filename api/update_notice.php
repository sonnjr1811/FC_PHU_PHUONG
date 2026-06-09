<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id']) && isset($data['content'])) {
    try {
        $stmt = $conn->prepare("UPDATE notices SET content = ? WHERE id = ?");
        $stmt->execute([$data['content'], $data['id']]);
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Thiếu thông tin cập nhật"]);
}
?>