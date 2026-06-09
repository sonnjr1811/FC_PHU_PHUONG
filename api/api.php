<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Cho phép JavaScript gọi dữ liệu không bị chặn

require_once 'db.php'; // Nhúng file kết nối cơ sở dữ liệu

// Lấy hành động (action) được gửi từ file app.js
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    
    // ----------------------------------------------------
    // PHÂN HỆ: TỔNG QUAN (DASHBOARD)
    // ----------------------------------------------------
    case 'get_dashboard':
        try {
            // 1. Đếm số lượng cầu thủ đang hoạt động
            $stmtPlayers = $pdo->query("SELECT COUNT(*) as total FROM players WHERE status = 'Active'");
            $totalPlayers = $stmtPlayers->fetch()['total'];

            // 2. Tính toán số dư quỹ hiện tại (Tổng thu - Tổng chi)
            $stmtFunds = $pdo->query("
                SELECT 
                    SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END) - 
                    SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END) as balance 
                FROM funds
            ");
            $balance = $stmtFunds->fetch()['balance'] ?? 0;

            // Lấy thời gian giao dịch quỹ gần nhất
            $stmtLastUpdate = $pdo->query("SELECT MAX(date) as last_update FROM funds");
            $lastUpdateRaw = $stmtLastUpdate->fetch()['last_update'];
            $lastUpdate = $lastUpdateRaw ? date('H:i:s - d/m/Y', strtotime($lastUpdateRaw)) : 'Chưa có giao dịch';

            // 3. Tìm trận đấu sắp diễn ra gần nhất với thời gian hiện tại
            $stmtMatch = $pdo->query("
                SELECT opponent, match_date, stadium 
                FROM matches 
                WHERE status = 'Upcoming' AND match_date >= NOW()
                ORDER BY match_date ASC 
                LIMIT 1
            ");
            $nextMatch = $stmtMatch->fetch();

            // 4. Lấy Top 5 ghi bàn
            $stmtTopScorers = $pdo->query("
                SELECT p.id, p.name, p.avatar_url, SUM(pp.goals) as total_goals 
                FROM player_performances pp
                JOIN players p ON pp.player_id = p.id
                GROUP BY p.id
                HAVING total_goals > 0
                ORDER BY total_goals DESC, p.name ASC
                LIMIT 5
            ");
            $topScorers = $stmtTopScorers->fetchAll();

            // 5. Lấy Top 5 kiến tạo
            $stmtTopAssisters = $pdo->query("
                SELECT p.id, p.name, p.avatar_url, SUM(pp.assists) as total_assists 
                FROM player_performances pp
                JOIN players p ON pp.player_id = p.id
                GROUP BY p.id
                HAVING total_assists > 0
                ORDER BY total_assists DESC, p.name ASC
                LIMIT 5
            ");
            $topAssisters = $stmtTopAssisters->fetchAll();

            // 6. Lấy Top 5 rating trung bình
            $stmtTopRatings = $pdo->query("
                SELECT p.id, p.name, p.avatar_url, ROUND(AVG(pp.rating), 1) as avg_rating, COUNT(pp.match_id) as matches_played
                FROM player_performances pp
                JOIN players p ON pp.player_id = p.id
                WHERE pp.rating > 0
                GROUP BY p.id
                ORDER BY avg_rating DESC, matches_played DESC, p.name ASC
                LIMIT 5
            ");
            $topRatings = $stmtTopRatings->fetchAll();

            // Phản hồi kết quả về cho Front-end
            echo json_encode([
                'total_players' => $totalPlayers,
                'current_funds' => number_format($balance) . 'đ',
                'funds_last_update' => $lastUpdate,
                'next_match' => $nextMatch ? [
                    'opponent' => $nextMatch['opponent'],
                    'date' => date('H:i - d/m/Y', strtotime($nextMatch['match_date'])),
                    'stadium' => $nextMatch['stadium']
                ] : null,
                'top_scorers' => $topScorers,
                'top_assisters' => $topAssisters,
                'top_ratings' => $topRatings
            ]);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // PHÂN HỆ: ĐỘI HÌNH (PLAYERS)
    // ----------------------------------------------------
    case 'get_players':
        try {
            // Lấy danh sách toàn bộ cầu thủ sắp xếp tăng dần theo số áo
            $stmt = $pdo->query("SELECT id, name, phone, position, shirt_number, status, avatar_url FROM players ORDER BY shirt_number ASC");
            $players = $stmt->fetchAll();
            echo json_encode($players);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // PHÂN HỆ: LỊCH THI ĐẤU (MATCHES)
    // ----------------------------------------------------
    case 'get_matches':
        try {
            // Lấy danh sách các trận đấu, định dạng lại ngày giờ cho đẹp mắt
            $stmt = $pdo->query("
                SELECT id, opponent, stadium, our_score, opp_score, status, note,
                       DATE_FORMAT(match_date, '%H:%i - %d/%m/%Y') as match_date 
                FROM matches 
                ORDER BY id DESC
            ");
            $matches = $stmt->fetchAll();
            echo json_encode($matches);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // PHÂN HỆ: QUỸ ĐỘI (FUNDS)
    // ----------------------------------------------------
    case 'get_funds':
        try {
            // Lấy lịch sử thu chi kết hợp truy vấn tên cầu thủ đóng tiền (nếu có)
            $stmt = $pdo->query("
                SELECT f.id, f.type, f.amount, f.description, DATE_FORMAT(f.date, '%H:%i:%s - %d/%m/%Y') as date, p.name as player_name
                FROM funds f
                LEFT JOIN players p ON f.player_id = p.id
                ORDER BY f.date DESC, f.id DESC
            ");
            $funds = $stmt->fetchAll();
            echo json_encode($funds);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ----------------------------------------------------
    // PHÂN HỆ: ẢNH KỈ NIỆM (ALBUM)
    // ----------------------------------------------------
    case 'get_album':
        try {
            // Lấy danh sách ảnh từ bảng album trong CSDL
            $stmt = $pdo->query("SELECT id, title, image_url as url, created_at FROM album ORDER BY id DESC");
            $images = $stmt->fetchAll();
            echo json_encode($images);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'get_backgrounds':
        try {
            // Lấy danh sách các hình nền đã tải lên và hình mẫu trong DB
            $stmt = $pdo->query("SELECT id, image_url, label FROM backgrounds ORDER BY id DESC");
            $backgrounds = $stmt->fetchAll();
            echo json_encode($backgrounds);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'get_match_performances':
        try {
            $match_id = isset($_GET['match_id']) ? (int)$_GET['match_id'] : 0;
            if ($match_id > 0) {
                $stmt = $pdo->prepare("SELECT player_id, goals, assists, rating FROM player_performances WHERE match_id = ?");
                $stmt->execute([$match_id]);
                echo json_encode($stmt->fetchAll());
            } else {
                echo json_encode([]);
            }
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'get_match_lineup_data':
        try {
            $match_id = isset($_GET['match_id']) ? (int)$_GET['match_id'] : 0;
            if ($match_id <= 0) {
                echo json_encode(['error' => 'ID trận đấu không hợp lệ!']);
                exit;
            }

            // 1. Lấy thông tin trận đấu (đối thủ, ngày) để hiển thị tiêu đề
            $stmtMatch = $pdo->prepare("SELECT opponent, DATE_FORMAT(match_date, '%H:%i - %d/%m/%Y') as match_date, stadium FROM matches WHERE id = ?");
            $stmtMatch->execute([$match_id]);
            $matchInfo = $stmtMatch->fetch();

            if (!$matchInfo) {
                echo json_encode(['error' => 'Không tìm thấy trận đấu!']);
                exit;
            }

            // 2. Lấy danh sách cầu thủ kết hợp với trạng thái điểm danh hiện tại của họ
            $stmtPlayers = $pdo->prepare("
                SELECT p.id, p.name, p.position, p.shirt_number, p.avatar_url,
                       COALESCE(a.status, 'no_response') as attendance_status,
                       a.note as attendance_note
                FROM players p
                LEFT JOIN match_attendances a ON p.id = a.player_id AND a.match_id = ?
                ORDER BY p.shirt_number ASC
            ");
            $stmtPlayers->execute([$match_id]);
            $players = $stmtPlayers->fetchAll();

            // 3. Lấy cấu hình sa bàn hiện tại (nếu có)
            $stmtLineup = $pdo->prepare("SELECT pitch_type, formation, player_positions FROM match_lineups WHERE match_id = ?");
            $stmtLineup->execute([$match_id]);
            $lineup = $stmtLineup->fetch();

            if ($lineup) {
                // Giải mã JSON các vị trí cầu thủ
                $lineup['player_positions'] = json_decode($lineup['player_positions'], true);
            } else {
                // Trả về mặc định nếu chưa lưu sa bàn nào
                $lineup = [
                    'pitch_type' => '7',
                    'formation' => '2-3-1',
                    'player_positions' => []
                ];
            }

            echo json_encode([
                'match' => $matchInfo,
                'players' => $players,
                'lineup' => $lineup
            ]);
        } catch (\PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // TRƯỜNG HỢP KHÔNG KHỚP ACTION
    default:
        echo json_encode(['error' => 'Hành động yêu cầu không hợp lệ!']);
        break;
}
?>