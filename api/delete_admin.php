<?php
session_start();
header('Content-Type: application/json');
include 'db.php';

if (!isset($_SESSION['admin_logged_in'])) {
    die(json_encode(["success" => false]));
}

$id = $_GET['id'];
// Không cho phép xóa chính mình để tránh lỗi hệ thống không có admin
// if($id == $_SESSION['admin_id']) die(json_encode(["success"=>false, "message"=>"Không thể tự xóa chính mình!"]));

$stmt = $conn->prepare("DELETE FROM admins WHERE id = ?");
$stmt->execute([$id]);
echo json_encode(["success" => true]);
?>