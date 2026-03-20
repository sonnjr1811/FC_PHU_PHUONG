<?php
header('Content-Type: application/json');
include 'db.php'; // Đảm bảo bạn đã có file kết nối db.php

// Nhận dữ liệu từ JSON gửi tới
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['name'])) {
    try {
        // Chuẩn bị câu lệnh SQL (chống SQL Injection)
        $sql = "INSERT INTO players (name, position, shirt_number, join_date, leave_date) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        $success = $stmt->execute([
            $data['name'],
            $data['position'],
            $data['shirt_number'],
            $data['join_date'] ?: date('Y-m-d'), // Nếu trống thì lấy ngày hôm nay
            !empty($data['leave_date']) ? $data['leave_date'] : null
        ]);

        echo json_encode(["success" => true, "message" => "Thêm cầu thủ thành công"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Thiếu tên cầu thủ"]);
}
?>