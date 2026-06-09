<?php
// scratch/test_db.php
include __DIR__ . '/../api/db.php';

try {
    echo "====================================\n";
    echo "KET NOI DATABASE: THANH CONG\n";
    echo "====================================\n\n";

    $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "Bang: $table\n";
        echo "------------------------------------\n";
        $columns = $conn->query("DESCRIBE `$table`")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $col) {
            echo sprintf("  - %-15s | %-15s | %-8s | %s\n", 
                $col['Field'], 
                $col['Type'], 
                $col['Null'], 
                $col['Key']
            );
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "LOI DATABASE: " . $e->getMessage() . "\n";
}
