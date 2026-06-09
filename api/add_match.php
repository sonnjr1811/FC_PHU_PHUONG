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

if (!empty($data['opponent'])) {
    try {
        $status = $data['status'] ?? 'Upcoming';
        $our_score = (isset($data['our_score']) && $data['our_score'] !== '' && $data['our_score'] !== null) ? (int)$data['our_score'] : null;
        $opp_score = (isset($data['opp_score']) && $data['opp_score'] !== '' && $data['opp_score'] !== null) ? (int)$data['opp_score'] : null;

        $sql = "INSERT INTO matches (opponent, match_date, stadium, status, our_score, opp_score) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['opponent'], 
            $data['match_date'], 
            $data['stadium'] ?? null,
            $status,
            $our_score,
            $opp_score
        ]);
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Lỗi: " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Thiếu thông tin đối thủ"]);
}
?>