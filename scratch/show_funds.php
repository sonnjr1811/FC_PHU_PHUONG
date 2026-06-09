<?php
include __DIR__ . '/../api/db.php';
$stmt = $conn->query("SHOW CREATE TABLE funds");
print_r($stmt->fetch());
?>
