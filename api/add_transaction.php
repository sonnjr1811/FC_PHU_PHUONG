<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

// Bảo mật: Chỉ admin mới được thực hiện
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['amount']) && !empty($data['type'])) {
    try {
        $sql = "INSERT INTO funds (type, amount, date, description) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['type'], 
            $data['amount'], 
            $data['date'] ?: date('Y-m-d H:i:s'), 
            $data['description']
        ]);
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["error" => "Thiếu thông tin số tiền hoặc loại giao dịch"]);
}
?>