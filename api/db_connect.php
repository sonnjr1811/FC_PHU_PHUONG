<?php
$host = "127.0.0.1";
$user = "root";
$pass = "";
$dbname = "fcphuphuong";

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Nếu chạy file này trực tiếp mà hiện "Kết nối thành công" là ok
    // echo "Kết nối thành công"; 
} catch(PDOException $e) {
    echo "Kết nối thất bại: " . $e->getMessage();
}
?>