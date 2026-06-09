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

if (!empty($data['id'])) {
    try {
        $sql = "UPDATE matches 
                SET opponent = ?, 
                    match_date = ?, 
                    stadium = ?, 
                    our_score = ?, 
                    opp_score = ?, 
                    status = ?, 
                    note = ? 
                WHERE id = ?";
        
        $stmt = $conn->prepare($sql);
        
        // Xử lý các giá trị số và giá trị rỗng
        $our_score = ($data['our_score'] !== '' && $data['our_score'] !== null) ? (int)$data['our_score'] : null;
        $opp_score = ($data['opp_score'] !== '' && $data['opp_score'] !== null) ? (int)$data['opp_score'] : null;
        $status = $data['status'] ?: 'Upcoming';
        
        $stmt->execute([
            $data['opponent'],
            $data['match_date'],
            $data['stadium'] ?? null,
            $our_score,
            $opp_score,
            $status,
            $data['note'] ?? null,
            $data['id']
        ]);

        // Quản lý phong độ cầu thủ sau trận đấu
        // 1. Luôn xóa các thống kê cũ của trận đấu này để cập nhật mới sạch sẽ
        $stmtDel = $conn->prepare("DELETE FROM player_performances WHERE match_id = ?");
        $stmtDel->execute([$data['id']]);

        // 2. Lưu thống kê phong độ mới nếu trận đấu đã kết thúc
        if ($status === 'Finished' && !empty($data['performances']) && is_array($data['performances'])) {
            $sqlInsert = "INSERT INTO player_performances (player_id, match_id, goals, assists, rating) 
                          VALUES (?, ?, ?, ?, ?)";
            $stmtInsert = $conn->prepare($sqlInsert);
            foreach ($data['performances'] as $perf) {
                $p_id = (int)$perf['player_id'];
                $goals = isset($perf['goals']) && $perf['goals'] !== '' ? (int)$perf['goals'] : 0;
                $assists = isset($perf['assists']) && $perf['assists'] !== '' ? (int)$perf['assists'] : 0;
                $rating = isset($perf['rating']) && $perf['rating'] !== '' ? (float)$perf['rating'] : 0.0;

                // Chỉ lưu nếu cầu thủ thực sự có tham gia đóng góp (hoặc được chấm điểm)
                if ($p_id > 0 && ($goals > 0 || $assists > 0 || $rating > 0)) {
                    $stmtInsert->execute([$p_id, $data['id'], $goals, $assists, $rating]);
                }
            }
        }
        
        echo json_encode(["success" => true, "message" => "Cập nhật trận đấu thành công"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Lỗi: " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Thiếu ID trận đấu"]);
}
?>