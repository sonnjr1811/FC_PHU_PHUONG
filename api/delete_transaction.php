<?php
include 'db.php';
if (isset($_GET['id'])) {
    $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->execute([$_GET['id']]);
}
?>