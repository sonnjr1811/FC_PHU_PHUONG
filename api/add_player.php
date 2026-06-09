<?php
session_start();
header('Content-Type: application/json');
include 'db.php'; // Đảm bảo bạn đã có file kết nối db.php

// Bảo mật: Chỉ admin mới được thực hiện
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

// Nhận dữ liệu từ JSON gửi tới
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['name'])) {
    // Validate số điện thoại định dạng Việt Nam
    $phone = isset($data['phone']) ? trim($data['phone']) : '';
    if ($phone !== '' && $phone !== null) {
        if (!preg_match('/^0\d{9}$/', $phone)) {
            http_response_code(400);
            die(json_encode(["success" => false, "message" => "Số điện thoại sai định dạng."]));
        }
    }

    // Validate số áo (từ 1 đến 99)
    $shirt_number = isset($data['shirt_number']) ? $data['shirt_number'] : null;
    if ($shirt_number !== '' && $shirt_number !== null) {
        $shirt_int = intval($shirt_number);
        if ($shirt_int < 1 || $shirt_int > 99) {
            http_response_code(400);
            die(json_encode(["success" => false, "message" => "Số áo sai định dạng."]));
        }
    }
    try {
        // Chuẩn bị câu lệnh SQL khớp với cấu trúc bảng thực tế
        $sql = "INSERT INTO players (name, position, shirt_number, join_date, phone, status, avatar_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        $stmt->execute([
            $data['name'],
            $data['position'] ?? null,
            $data['shirt_number'] ?? null,
            $data['join_date'] ?: date('Y-m-d'),
            $data['phone'] ?? null,
            $data['status'] ?? 'Active',
            $data['avatar_url'] ?? null
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