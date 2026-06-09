<?php
// api/save_attendance.php
session_start();
header('Content-Type: application/json');
include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$match_id = isset($data['match_id']) ? (int)$data['match_id'] : 0;
if ($match_id <= 0) {
    http_response_code(400);
    die(json_encode(["success" => false, "message" => "ID trận đấu không hợp lệ"]));
}

$isAdmin = (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true);

try {
    if ($isAdmin && isset($data['attendances']) && is_array($data['attendances'])) {
        // Trường hợp Admin: Lưu hàng loạt
        $sql = "INSERT INTO match_attendances (match_id, player_id, status, note) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)";
        $stmt = $conn->prepare($sql);
        
        foreach ($data['attendances'] as $att) {
            $player_id = (int)$att['player_id'];
            $status = $att['status'] ?: 'no_response';
            $note = isset($att['note']) ? trim($att['note']) : null;
            
            if ($player_id > 0) {
                $stmt->execute([$match_id, $player_id, $status, $note]);
            }
        }
        
        echo json_encode(["success" => true, "message" => "Cập nhật danh sách điểm danh thành công!"]);
    } else {
        // Trường hợp Cầu thủ tự điểm danh (Hoặc Admin lưu đơn lẻ)
        $player_id = isset($data['player_id']) ? (int)$data['player_id'] : 0;
        $status = isset($data['status']) ? trim($data['status']) : '';
        $note = isset($data['note']) ? trim($data['note']) : null;
        
        if ($player_id <= 0 || empty($status)) {
            http_response_code(400);
            die(json_encode(["success" => false, "message" => "Thông tin điểm danh không đầy đủ"]));
        }
        
        $allowed_statuses = ['going', 'late', 'absent', 'no_response'];
        if (!in_array($status, $allowed_statuses)) {
            http_response_code(400);
            die(json_encode(["success" => false, "message" => "Trạng thái điểm danh không hợp lệ"]));
        }
        
        $sql = "INSERT INTO match_attendances (match_id, player_id, status, note) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$match_id, $player_id, $status, $note]);
        
        // Lấy tên cầu thủ để trả về thông báo hiển thị cho trực quan
        $stmtName = $conn->prepare("SELECT name FROM players WHERE id = ?");
        $stmtName->execute([$player_id]);
        $playerName = $stmtName->fetchColumn() ?: 'Cầu thủ';
        
        echo json_encode(["success" => true, "message" => "Đã ghi nhận điểm danh cho: $playerName!"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Lỗi CSDL: " . $e->getMessage()]);
}
?>
