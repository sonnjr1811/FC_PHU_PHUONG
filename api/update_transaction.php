<?php
header('Content-Type: application/json');
include 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id'])) {
    try {
        // 1. Lấy dữ liệu cũ trước khi sửa để lưu vết
        $old = $conn->prepare("SELECT amount, description, type FROM transactions WHERE id = ?");
        $old->execute([$data['id']]);
        $oldItem = $old->fetch(PDO::FETCH_ASSOC);
        
        $oldText = "Số tiền: " . $oldItem['amount'] . " | Loại: " . $oldItem['type'] . " | Nội dung: " . $oldItem['description'];

        // 2. Cập nhật dữ liệu mới và ghi đè vào cột old_content
        $sql = "UPDATE transactions SET 
                type = ?, amount = ?, date = ?, description = ?, 
                updated_at = NOW(), 
                old_content = ? 
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['type'], 
            $data['amount'], 
            $data['date'], 
            $data['description'],
            $oldText,
            $data['id']
        ]);
        
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>