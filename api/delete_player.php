<?php
header('Content-Type: application/json');
include 'db.php';

if (isset($_GET['id'])) {
    $stmt = $conn->prepare("DELETE FROM players WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    echo json_encode(["success" => true]);
}
// Đầu file api/delete_player.php chẳng hạn:
session_start();
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die(json_encode(["error" => "Bạn không có quyền thực hiện thao tác này"]));
}
?>