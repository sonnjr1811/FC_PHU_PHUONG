<?php
// api/save_lineup.php
session_start();
header('Content-Type: application/json');
include 'db.php';

// Bảo mật: Chỉ admin mới được thực hiện
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["success" => false, "message" => "Bạn không có quyền thực hiện thao tác này"]));
}

$data = json_decode(file_get_contents("php://input"), true);

$match_id = isset($data['match_id']) ? (int)$data['match_id'] : 0;
$pitch_type = isset($data['pitch_type']) ? trim($data['pitch_type']) : '7';
$formation = isset($data['formation']) ? trim($data['formation']) : '2-3-1';
$player_positions = isset($data['player_positions']) ? $data['player_positions'] : null;

if ($match_id <= 0) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "ID trận đấu không hợp lệ"]));
}

if ($player_positions === null || !is_array($player_positions)) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "Danh sách vị trí cầu thủ không hợp lệ"]));
}

$player_positions_json = json_encode($player_positions);

try {
    $sql = "INSERT INTO match_lineups (match_id, pitch_type, formation, player_positions) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE pitch_type = VALUES(pitch_type), formation = VALUES(formation), player_positions = VALUES(player_positions)";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$match_id, $pitch_type, $formation, $player_positions_json]);
    
    echo json_encode(["success" => true, "message" => "Lưu sơ đồ sa bàn chiến thuật thành công!"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Lỗi CSDL: " . $e->getMessage()]);
}
?>
