<?php
// scratch/migrate_lineup.php
// Script khởi tạo các bảng CSDL phục vụ cho chức năng Điểm danh & Sa bàn chiến thuật

include __DIR__ . '/../api/db.php';

try {
    echo "Bat dau qua trinh migration cho chuc nang Sa Ban & Diem Danh...\n";

    // 1. Tao bang match_attendances
    $sqlAttendances = "
        CREATE TABLE IF NOT EXISTS `match_attendances` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `match_id` INT NOT NULL,
            `player_id` INT NOT NULL,
            `status` VARCHAR(20) NOT NULL DEFAULT 'no_response',
            `note` VARCHAR(255) NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_match_player` (`match_id`, `player_id`),
            FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $conn->exec($sqlAttendances);
    echo "-> Da tao/kiem tra bang `match_attendances` thanh cong.\n";

    // 2. Tao bang match_lineups
    $sqlLineups = "
        CREATE TABLE IF NOT EXISTS `match_lineups` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `match_id` INT NOT NULL,
            `pitch_type` VARCHAR(10) NOT NULL DEFAULT '7',
            `formation` VARCHAR(20) NOT NULL DEFAULT '2-3-1',
            `player_positions` TEXT NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_match_lineup` (`match_id`),
            FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $conn->exec($sqlLineups);
    echo "-> Da tao/kiem tra bang `match_lineups` thanh cong.\n";

    echo "==================================================\n";
    echo "MIGRATION HOAN THANH XUAT SAC!\n";
    echo "==================================================\n";

} catch (PDOException $e) {
    echo "LOI MIGRATION: " . $e->getMessage() . "\n";
}
?>
