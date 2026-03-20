<?php
header('Content-Type: application/json');
include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['amount']) && !empty($data['type'])) {
    try {
        $sql = "INSERT INTO transactions (type, amount, date, description) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['type'], 
            $data['amount'], 
            $data['date'] ?: date('Y-m-d'), 
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