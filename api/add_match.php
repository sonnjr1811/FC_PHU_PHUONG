<?php
header('Content-Type: application/json');
include 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['opponent'])) {
    $sql = "INSERT INTO matches (opponent, match_date, location, result) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$data['opponent'], $data['match_date'], $data['location'], $data['result']]);
    echo json_encode(["success" => true]);
}
?>