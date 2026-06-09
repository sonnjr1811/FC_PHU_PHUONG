<?php
// Cấu hình thông tin kết nối MySQL
$host = '127.0.0.1'; // Sử dụng 127.0.0.1 thay vì localhost để tránh lỗi phân giải IPv6 trên Windows
$db   = 'fcphuphuong'; 
$user = 'root';             // Mặc định của XAMPP/Laragon
$pass = '';                 // Mặc định của XAMPP để trống
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Đẩy lỗi ra ngoại lệ để dễ debug
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Trả dữ liệu dạng mảng kết hợp (Associative Array)
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Tăng cường bảo mật chống SQL Injection
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     $conn = $pdo; // Thiết lập cả $conn và $pdo để tương thích với tất cả file API
} catch (\PDOException $e) {
     // Trả về lỗi định dạng JSON nếu không kết nối được DB để Front-end nhận biết
     header('Content-Type: application/json');
     echo json_encode(['error' => 'Kết nối Database thất bại: ' . $e->getMessage()]);
     exit;
}
?>