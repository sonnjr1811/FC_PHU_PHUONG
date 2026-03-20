<?php
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "fc_phu_phuong";

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(["error" => $e->getMessage()]));
}
?>