<?php
header('Content-Type: application/json');
include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id'])) {
    try {
        $sql = "UPDATE players SET name=?, position=?, shirt_number=?, join_date=?, leave_date=? WHERE id=?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $data['name'], 
            $data['position'], 
            $data['shirt_number'], 
            $data['join_date'], 
            $data['leave_date'] ?: null, 
            $data['id']
        ]);
        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>