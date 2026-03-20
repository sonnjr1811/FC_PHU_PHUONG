<?php
header('Content-Type: application/json');
include 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id'])) {
    $sql = "UPDATE matches SET opponent=?, match_date=?, location=?, result=? WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['opponent'], $data['match_date'], $data['location'], $data['result'], $data['id']]);
    echo json_encode(["success" => true]);
}
?>