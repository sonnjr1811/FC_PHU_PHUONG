<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

try {
    // 1. KIỂM TRA QUYỀN ADMIN (Mặc định là false khi bắt đầu trang web)
    // Chỉ khi nào đã qua bước login.php và lưu vào Session thì mới là true
    $isAdmin = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;

    // 2. LẤY DỮ LIỆU CẦU THỦ
    $players = $conn->query("SELECT * FROM players ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

    // 3. LẤY DỮ LIỆU TRẬN ĐẤU
    $matches = $conn->query("SELECT * FROM matches ORDER BY match_date DESC")->fetchAll(PDO::FETCH_ASSOC);

    // 4. LẤY DỮ LIỆU THÔNG BÁO (Cho trang Tổng quan)
    $notices = $conn->query("SELECT * FROM notices ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

    // 5. LẤY DỮ LIỆU ALBUM ẢNH (Dùng bảng album đã tạo)
    $album = $conn->query("SELECT * FROM album ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

    // 6. LẤY DỮ LIỆU QUỸ & TÍNH TOÁN SỐ DƯ
    $transactions = $conn->query("SELECT * FROM funds ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC);
    
    $totalIncome = 0;
    $totalExpense = 0;
    foreach ($transactions as $t) {
        if ($t['type'] == 'income' || $t['type'] == 'thu') {
            $totalIncome += $t['amount'];
        } else {
            $totalExpense += $t['amount'];
        }
    }
    $balance = $totalIncome - $totalExpense;

    // 7. TỔNG HỢP VÀ TRẢ VỀ JSON
    echo json_encode([
        "isAdmin" => $isAdmin,
        "players" => $players,
        "matches" => $matches,
        "notices" => $notices,
        "album"   => $album,
        "funds"   => [
            "balance" => $balance,
            "transactions" => $transactions
        ]
    ]);

} catch (PDOException $e) {
    // Nếu có lỗi (Ví dụ: Thiếu bảng trong database)
    echo json_encode([
        "error" => "Lỗi Database: " . $e->getMessage(),
        "isAdmin" => false
    ]);
}
?>