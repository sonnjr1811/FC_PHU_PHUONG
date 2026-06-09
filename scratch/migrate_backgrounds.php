<?php
// scratch/migrate_backgrounds.php
include __DIR__ . '/../api/db.php';

try {
    echo "Bat dau migration cho backgrounds...\n";

    // 1. Kiem tra va them cot label
    $stmt = $conn->query("SHOW COLUMNS FROM backgrounds LIKE 'label'");
    $columnExists = $stmt->fetch();

    if (!$columnExists) {
        $conn->exec("ALTER TABLE backgrounds ADD COLUMN label VARCHAR(255) NULL");
        echo "Da them cot 'label' vao bang backgrounds.\n";
    } else {
        echo "Cot 'label' da ton tai.\n";
    }

    // 2. Danh sach hinh nen mau de chen
    $defaultBgs = [
        [
            'label' => 'Sân Cỏ',
            'image_url' => 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80'
        ],
        [
            'label' => 'Khán Đài',
            'image_url' => 'https://images.unsplash.com/photo-1556056504-517173641041?auto=format&fit=crop&w=400&q=80'
        ],
        [
            'label' => 'Bóng & Sân',
            'image_url' => 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=400&q=80'
        ],
        [
            'label' => 'Công Nghệ',
            'image_url' => 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80'
        ]
    ];

    // Chen cac hinh nen mau neu chua ton tai
    foreach ($defaultBgs as $bg) {
        $stmt_check = $conn->prepare("SELECT id FROM backgrounds WHERE image_url = ?");
        $stmt_check->execute([$bg['image_url']]);
        if (!$stmt_check->fetch()) {
            $stmt_insert = $conn->prepare("INSERT INTO backgrounds (label, image_url) VALUES (?, ?)");
            $stmt_insert->execute([$bg['label'], $bg['image_url']]);
            echo "Da chen hinh nen mau: " . $bg['label'] . "\n";
        } else {
            echo "Hinh nen mau da ton tai trong DB: " . $bg['label'] . "\n";
        }
    }

    echo "Migration hoan thanh thanh cong!\n";
} catch (Exception $e) {
    echo "Loi migration: " . $e->getMessage() . "\n";
}
?>
