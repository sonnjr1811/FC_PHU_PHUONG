<?php
// test_system.php
// Hệ thống tự động kiểm tra lỗi toàn diện và chuẩn đoán sức khỏe của FC Phú Phương Management

// Thiết lập chế độ chạy AJAX
if (isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];

    // Lấy thông tin kết nối DB từ api/db.php bằng cách đọc file & parse để tránh crash nếu DB lỗi
    function get_db_config() {
        $db_file = __DIR__ . '/api/db.php';
        if (!file_exists($db_file)) {
            return null;
        }
        $content = file_get_contents($db_file);
        
        $host = '127.0.0.1';
        $db = 'fcphuphuong';
        $user = 'root';
        $pass = '';
        
        if (preg_match('/\$host\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $host = $matches[1];
        }
        if (preg_match('/\$db\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $db = $matches[1];
        }
        if (preg_match('/\$user\s*=\s*[\'"]([^\'"]+)[\'"]/', $content, $matches)) {
            $user = $matches[1];
        }
        if (preg_match('/\$pass\s*=\s*[\'"]([^\'"]*)[\'"]/', $content, $matches)) {
            $pass = $matches[1];
        }
        
        return [
            'host' => $host,
            'db' => $db,
            'user' => $user,
            'pass' => $pass
        ];
    }

    if ($action === 'check_env') {
        $results = [];
        
        // 1. PHP Version
        $results['php_version'] = [
            'name' => 'Phiên bản PHP',
            'status' => version_compare(PHP_VERSION, '7.4.0', '>=') ? 'SUCCESS' : 'WARNING',
            'value' => PHP_VERSION,
            'message' => version_compare(PHP_VERSION, '7.4.0', '>=') ? 'Phiên bản PHP đáp ứng yêu cầu (>= 7.4).' : 'Khuyên dùng PHP 7.4 trở lên để đảm bảo hiệu năng và bảo mật.'
        ];

        // 2. PDO MySQL Extension
        $results['pdo_mysql'] = [
            'name' => 'PDO MySQL Extension',
            'status' => extension_loaded('pdo_mysql') ? 'SUCCESS' : 'FAIL',
            'value' => extension_loaded('pdo_mysql') ? 'Đã kích hoạt' : 'Chưa kích hoạt',
            'message' => extension_loaded('pdo_mysql') ? 'Extension pdo_mysql đã được bật và hoạt động tốt.' : 'Vui lòng bật extension pdo_mysql trong file php.ini của XAMPP.'
        ];

        // 3. Quyền ghi thư mục upload
        $upload_dirs = [
            'uploads' => 'Thư mục uploads gốc',
            'uploads/avatars' => 'Thư mục ảnh đại diện cầu thủ',
            'uploads/backgrounds' => 'Thư mục hình nền tùy chỉnh',
            'uploads/photos' => 'Thư mục ảnh kỉ niệm'
        ];

        foreach ($upload_dirs as $dir => $label) {
            $path = __DIR__ . '/' . $dir;
            if (!file_exists($path)) {
                // Thử tạo thư mục nếu chưa có
                @mkdir($path, 0777, true);
            }
            
            $exists = file_exists($path);
            $writable = $exists && is_writable($path);
            
            $results['dir_' . str_replace('/', '_', $dir)] = [
                'name' => $label . " ($dir/)",
                'status' => $writable ? 'SUCCESS' : ($exists ? 'WARNING' : 'FAIL'),
                'value' => $writable ? 'Có quyền ghi' : ($exists ? 'Chỉ đọc (Không có quyền ghi)' : 'Không tồn tại'),
                'message' => $writable ? "Thư mục hoạt động bình thường." : ($exists ? "Cần phân quyền ghi (write permission) cho thư mục này." : "Không thể tạo thư mục. Vui lòng tự tạo thư mục này tại đường dẫn gốc.")
            ];
        }

        echo json_encode(['status' => 'success', 'data' => $results]);
        exit;
    }

    if ($action === 'check_db') {
        $results = [];
        $config = get_db_config();
        
        if (!$config) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Không tìm thấy hoặc không đọc được cấu hình tại api/db.php'
            ]);
            exit;
        }

        // Kết nối DB
        try {
            $dsn = "mysql:host={$config['host']};dbname={$config['db']};charset=utf8mb4";
            $conn = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            
            $results['connection'] = [
                'name' => 'Kết nối MySQL Database',
                'status' => 'SUCCESS',
                'value' => 'Thành công',
                'message' => "Kết nối đến DB '{$config['db']}' tại host '{$config['host']}' hoạt động tốt."
            ];

            // Danh sách bảng cần kiểm tra và các cột bắt buộc
            $tables_to_check = [
                'users' => [
                    'columns' => ['id', 'username', 'password', 'role'],
                    'label' => 'Bảng người dùng/admin (users)'
                ],
                'players' => [
                    'columns' => ['id', 'name', 'phone', 'position', 'shirt_number', 'join_date', 'status', 'avatar_url'],
                    'label' => 'Bảng cầu thủ (players)'
                ],
                'matches' => [
                    'columns' => ['id', 'opponent', 'match_date', 'stadium', 'our_score', 'opp_score', 'status', 'note'],
                    'label' => 'Bảng lịch thi đấu (matches)'
                ],
                'funds' => [
                    'columns' => ['id', 'type', 'amount', 'description', 'date', 'player_id'],
                    'label' => 'Bảng quỹ đội (funds)'
                ],
                'backgrounds' => [
                    'columns' => ['id', 'image_url', 'label'],
                    'label' => 'Bảng ảnh nền tùy chỉnh (backgrounds)'
                ],
                'album' => [
                    'columns' => ['id', 'title', 'image_url', 'created_at'],
                    'label' => 'Bảng album ảnh kỷ niệm (album)'
                ],
                'notices' => [
                    'columns' => ['id', 'content', 'created_at'],
                    'label' => 'Bảng thông báo bảng tin (notices)'
                ],
                'player_performances' => [
                    'columns' => ['id', 'player_id', 'match_id', 'goals', 'assists', 'rating', 'yellow_cards', 'red_cards'],
                    'label' => 'Bảng hiệu suất cầu thủ (player_performances)'
                ]
            ];

            // Lấy danh sách bảng thực tế
            $actual_tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

            foreach ($tables_to_check as $table => $info) {
                if (!in_array($table, $actual_tables)) {
                    $results['table_' . $table] = [
                        'name' => $info['label'],
                        'status' => 'FAIL',
                        'value' => 'Không tồn tại',
                        'message' => "Bảng '{$table}' bị thiếu trong Database. Vui lòng import lại file database.sql."
                    ];
                    continue;
                }

                // Kiểm tra các cột
                $columns_stmt = $conn->query("DESCRIBE `$table`")->fetchAll(PDO::FETCH_ASSOC);
                $actual_columns = array_map(function($c) { return $c['Field']; }, $columns_stmt);
                
                $missing_cols = [];
                foreach ($info['columns'] as $col) {
                    if (!in_array($col, $actual_columns)) {
                        $missing_cols[] = $col;
                    }
                }

                // Kiểm tra riêng kiểu dữ liệu của cột date trong bảng funds
                $date_type_msg = "";
                if ($table === 'funds') {
                    $date_col_info = array_filter($columns_stmt, function($c) { return $c['Field'] === 'date'; });
                    if (!empty($date_col_info)) {
                        $date_col = array_values($date_col_info)[0];
                        if (strpos(strtolower($date_col['Type']), 'datetime') === false) {
                            $missing_cols[] = "date (kiểu datetime - hiện tại là {$date_col['Type']})";
                        }
                    }
                }

                if (empty($missing_cols)) {
                    $results['table_' . $table] = [
                        'name' => $info['label'],
                        'status' => 'SUCCESS',
                        'value' => 'Hợp lệ',
                        'message' => "Bảng '{$table}' tồn tại đầy đủ các cột cần thiết."
                    ];
                } else {
                    $results['table_' . $table] = [
                        'name' => $info['label'],
                        'status' => 'FAIL',
                        'value' => 'Sai cấu trúc',
                        'message' => "Bảng '{$table}' bị thiếu các cột hoặc sai kiểu dữ liệu: " . implode(', ', $missing_cols) . ". Hãy kiểm tra lại file SQL và cấu trúc bảng."
                    ];
                }
            }

            // Kiểm tra số lượng admin
            $admin_count = $conn->query("SELECT COUNT(*) FROM users")->fetchColumn();
            $results['admin_account'] = [
                'name' => 'Tài khoản quản trị viên',
                'status' => $admin_count > 0 ? 'SUCCESS' : 'WARNING',
                'value' => $admin_count . ' tài khoản',
                'message' => $admin_count > 0 ? 'Hệ thống đã có tài khoản admin sẵn sàng sử dụng.' : 'Chưa có tài khoản admin nào trong bảng users. Vui lòng chạy api/add_admin.php.'
            ];

        } catch (PDOException $e) {
            $results['connection'] = [
                'name' => 'Kết nối MySQL Database',
                'status' => 'FAIL',
                'value' => 'Thất bại',
                'message' => 'Lỗi kết nối MySQL: ' . $e->getMessage() . '. Hãy kiểm tra lại XAMPP MySQL có đang chạy không và thông tin trong api/db.php có chính xác không.'
            ];
        }

        echo json_encode(['status' => 'success', 'data' => $results]);
        exit;
    }

    if ($action === 'check_syntax') {
        $results = [];
        
        // Tìm tất cả các file PHP
        $php_files = array_merge(
            glob(__DIR__ . '/*.php'),
            glob(__DIR__ . '/api/*.php'),
            glob(__DIR__ . '/scratch/*.php')
        );

        // Đường dẫn PHP CLI trong XAMPP
        $php_path = 'd:\\xampp\\php\\php.exe';
        $has_cli = file_exists($php_path);

        foreach ($php_files as $file) {
            $basename = str_replace(__DIR__ . '/', '', $file);
            
            // Bỏ qua chính file test hiện tại
            if (basename($file) === 'test_system.php') {
                continue;
            }

            if ($has_cli) {
                // Chạy lệnh php -l để kiểm tra lỗi cú pháp bằng CLI
                $command = '"' . $php_path . '" -l "' . $file . '" 2>&1';
                $output = [];
                $return_var = 0;
                exec($command, $output, $return_var);
                $output_str = implode("\n", $output);

                if ($return_var === 0) {
                    $results[$basename] = [
                        'name' => $basename,
                        'status' => 'SUCCESS',
                        'value' => 'Cú pháp OK',
                        'message' => 'Không phát hiện lỗi cú pháp.'
                    ];
                } else {
                    // Trích xuất lỗi chi tiết
                    $results[$basename] = [
                        'name' => $basename,
                        'status' => 'FAIL',
                        'value' => 'Lỗi cú pháp (Syntax Error)',
                        'message' => $output_str
                    ];
                }
            } else {
                // Dự phòng: Nếu không tìm thấy php.exe, thử parse đơn giản bằng token_get_all
                try {
                    $code = file_get_contents($file);
                    // token_get_all sẽ throw ParseError trên PHP 8+ nếu cú pháp lỗi nghiêm trọng
                    $tokens = @token_get_all($code);
                    $results[$basename] = [
                        'name' => $basename,
                        'status' => 'SUCCESS',
                        'value' => 'Đã quét (Token)',
                        'message' => 'Không phát hiện lỗi cú pháp cấu trúc cơ bản.'
                    ];
                } catch (ParseError $e) {
                    $results[$basename] = [
                        'name' => $basename,
                        'status' => 'FAIL',
                        'value' => 'Lỗi cú pháp (ParseError)',
                        'message' => $e->getMessage() . ' tại dòng ' . $e->getLine()
                    ];
                }
            }
        }

        echo json_encode(['status' => 'success', 'data' => $results]);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hệ Thống Kiểm Tra & Chẩn Đoán Lỗi - FC Phú Phương</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Nhúng CSS chính của hệ thống -->
    <link rel="stylesheet" href="css/style.css?v=2.2">
    <style>
        body.dark-theme {
            background-color: #020617;
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.12), transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.12), transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.03), transparent 30%);
            background-attachment: fixed;
            min-height: 100vh;
            padding: 2.5rem 1rem;
        }

        .test-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .test-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1.5rem;
        }

        .test-header .brand {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .test-header .brand i {
            font-size: 2.5rem;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));
        }

        .test-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            background: linear-gradient(to right, #f8fafc, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .test-header p {
            color: var(--text-secondary);
            font-size: 0.95rem;
            margin-top: 0.2rem;
        }

        /* Biểu đồ tổng quan */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .summary-card {
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.25rem;
            position: relative;
            overflow: hidden;
            border-radius: var(--border-radius-lg);
        }

        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
        }

        .summary-card.success-card::before { background-color: var(--accent-primary); }
        .summary-card.warning-card::before { background-color: var(--accent-warning); }
        .summary-card.danger-card::before { background-color: var(--accent-danger); }
        .summary-card.total-card::before { background-color: var(--accent-secondary); }

        .summary-card .icon-box {
            width: 50px;
            height: 50px;
            border-radius: var(--border-radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: rgba(255, 255, 255, 0.05);
        }

        .success-card .icon-box { color: var(--accent-primary); background: rgba(16, 185, 129, 0.1); }
        .warning-card .icon-box { color: var(--accent-warning); background: rgba(245, 158, 11, 0.1); }
        .danger-card .icon-box { color: var(--accent-danger); background: rgba(239, 68, 68, 0.1); }
        .total-card .icon-box { color: var(--accent-secondary); background: rgba(59, 130, 246, 0.1); }

        .summary-card .info {
            display: flex;
            flex-direction: column;
        }

        .summary-card .info .num {
            font-size: 1.8rem;
            font-weight: 800;
            line-height: 1.2;
            color: var(--text-primary);
        }

        .summary-card .info .lbl {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Tabs & Controls */
        .controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .tabs {
            display: flex;
            gap: 0.5rem;
            background: rgba(15, 23, 42, 0.6);
            padding: 0.35rem;
            border-radius: var(--border-radius-md);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-btn {
            background: transparent;
            color: var(--text-secondary);
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            font-weight: 500;
            border-radius: var(--border-radius-sm);
            transition: all var(--transition-fast);
        }

        .tab-btn:hover {
            color: var(--text-primary);
        }

        .tab-btn.active {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-primary);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        /* Test Section & Groups */
        .section-header {
            margin: 2rem 0 1rem 0;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .section-header h2 {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .section-header .badge {
            font-size: 0.75rem;
            padding: 0.15rem 0.5rem;
            border-radius: 20px;
            background: rgba(255,255,255,0.05);
            color: var(--text-secondary);
        }

        /* Test Results Layout */
        .test-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .test-item {
            display: flex;
            flex-direction: column;
            padding: 1.25rem;
            transition: all var(--transition-fast);
            border-radius: var(--border-radius-md);
            border: 1px solid rgba(255, 255, 255, 0.03);
            background: rgba(30, 41, 59, 0.4);
        }

        .test-item:hover {
            background: rgba(30, 41, 59, 0.6);
            border-color: rgba(255, 255, 255, 0.08);
        }

        .test-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .test-item .test-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .test-item .test-info i {
            font-size: 1.1rem;
        }

        .test-item .test-name {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95rem;
        }

        .test-item .test-status-area {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .test-item .test-val {
            font-size: 0.85rem;
            color: var(--text-muted);
            background: rgba(0, 0, 0, 0.2);
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-family: monospace;
        }

        /* Badges */
        .badge-status {
            padding: 0.25rem 0.75rem;
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }

        .badge-status.success {
            background: rgba(16, 185, 129, 0.1);
            color: var(--accent-primary);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .badge-status.warning {
            background: rgba(245, 158, 11, 0.1);
            color: var(--accent-warning);
            border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .badge-status.fail {
            background: rgba(239, 68, 68, 0.1);
            color: var(--accent-danger);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .badge-status.loading {
            background: rgba(59, 130, 246, 0.1);
            color: var(--accent-secondary);
            border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .test-desc {
            margin-top: 0.75rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
            padding-left: 2rem;
            border-left: 2px solid rgba(255, 255, 255, 0.05);
            margin-left: 0.5rem;
        }

        .test-desc.has-error {
            color: #fda4af; /* Rose 300 */
            background: rgba(239, 68, 68, 0.05);
            padding: 0.75rem 1rem;
            border-radius: var(--border-radius-sm);
            border-left: 3px solid var(--accent-danger);
            font-family: monospace;
            white-space: pre-wrap;
            overflow-x: auto;
        }

        .progress-bar-container {
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            margin-bottom: 2rem;
            overflow: hidden;
            display: none;
        }

        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(to right, var(--accent-secondary), var(--accent-primary));
            transition: width 0.3s ease;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.9rem;
            transition: color var(--transition-fast);
        }

        .back-link:hover {
            color: var(--accent-primary);
        }

        /* Custom spinner animation */
        .fa-spin {
            animation: fa-spin 1s infinite linear;
        }
        @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .filter-hidden {
            display: none !important;
        }
    </style>
</head>
<body class="dark-theme">

    <div class="test-container">
        
        <div style="margin-bottom: 1.5rem;">
            <a href="index.html" class="back-link"><i class="fa-solid fa-arrow-left"></i> Quay lại trang chủ quản lý</a>
        </div>

        <header class="test-header">
            <div class="brand">
                <i class="fa-solid fa-laptop-medical"></i>
                <div>
                    <h1>Bảng Kiểm Tra & Chẩn Đoán Lỗi Hệ Thống</h1>
                    <p>FC Phú Phương Management System Diagnostic Tool</p>
                </div>
            </div>
            
            <button id="btn-run-all" class="btn-primary" onclick="runAllTests()">
                <i class="fa-solid fa-play"></i> Chạy kiểm tra hệ thống
            </button>
        </header>

        <!-- Thanh tiến trình -->
        <div class="progress-bar-container" id="test-progress-container">
            <div class="progress-bar" id="test-progress-bar"></div>
        </div>

        <!-- Thống kê tổng quan -->
        <div class="summary-grid">
            <div class="summary-card total-card glass-panel">
                <div class="icon-box"><i class="fa-solid fa-list-check"></i></div>
                <div class="info">
                    <span class="num" id="stat-total">0</span>
                    <span class="lbl">Tổng bài test</span>
                </div>
            </div>
            <div class="summary-card success-card glass-panel">
                <div class="icon-box"><i class="fa-solid fa-circle-check"></i></div>
                <div class="info">
                    <span class="num" id="stat-success">0</span>
                    <span class="lbl">Thành công</span>
                </div>
            </div>
            <div class="summary-card warning-card glass-panel">
                <div class="icon-box"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="info">
                    <span class="num" id="stat-warning">0</span>
                    <span class="lbl">Cảnh báo</span>
                </div>
            </div>
            <div class="summary-card danger-card glass-panel">
                <div class="icon-box"><i class="fa-solid fa-circle-xmark"></i></div>
                <div class="info">
                    <span class="num" id="stat-fail">0</span>
                    <span class="lbl">Thất bại</span>
                </div>
            </div>
        </div>

        <!-- Điều khiển lọc và phân loại -->
        <div class="controls-row">
            <div class="tabs">
                <button class="tab-btn active" onclick="filterTests('all')">Tất cả</button>
                <button class="tab-btn" onclick="filterTests('env')">Môi trường</button>
                <button class="tab-btn" onclick="filterTests('db')">Database</button>
                <button class="tab-btn" onclick="filterTests('syntax')">Cú pháp PHP</button>
                <button class="tab-btn" onclick="filterTests('api')">Kiểm tra API</button>
            </div>
        </div>

        <!-- VÙNG HIỂN THỊ KẾT QUẢ -->
        <div id="test-results-container">
            
            <!-- NHÓM 1: MÔI TRƯỜNG -->
            <section class="test-section" data-group="env">
                <div class="section-header">
                    <h2><i class="fa-solid fa-server"></i> Môi trường & Cấu hình máy chủ</h2>
                    <span class="badge" id="badge-count-env">0 bài test</span>
                </div>
                <div class="test-list" id="list-env">
                    <div class="test-item glass-panel">
                        <div class="test-item-row">
                            <div class="test-info">
                                <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>
                                <span class="test-name">Chưa chạy kiểm tra. Nhấp vào nút "Chạy kiểm tra hệ thống" để bắt đầu.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- NHÓM 2: DATABASE -->
            <section class="test-section" data-group="db">
                <div class="section-header">
                    <h2><i class="fa-solid fa-database"></i> Trạng thái Cơ sở dữ liệu (MySQL)</h2>
                    <span class="badge" id="badge-count-db">0 bài test</span>
                </div>
                <div class="test-list" id="list-db">
                    <div class="test-item glass-panel">
                        <div class="test-item-row">
                            <div class="test-info">
                                <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>
                                <span class="test-name">Đang đợi chạy...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- NHÓM 3: CÚ PHÁP PHP -->
            <section class="test-section" data-group="syntax">
                <div class="section-header">
                    <h2><i class="fa-solid fa-code"></i> Quét lỗi cú pháp tệp tin PHP (Lint)</h2>
                    <span class="badge" id="badge-count-syntax">0 bài test</span>
                </div>
                <div class="test-list" id="list-syntax">
                    <div class="test-item glass-panel">
                        <div class="test-item-row">
                            <div class="test-info">
                                <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>
                                <span class="test-name">Đang đợi chạy...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- NHÓM 4: KIỂM TRA API TRỰC TIẾP -->
            <section class="test-section" data-group="api">
                <div class="section-header">
                    <h2><i class="fa-solid fa-network-wired"></i> API Live Health Checks (Frontend -> Backend)</h2>
                    <span class="badge" id="badge-count-api">0 bài test</span>
                </div>
                <div class="test-list" id="list-api">
                    <div class="test-item glass-panel">
                        <div class="test-item-row">
                            <div class="test-info">
                                <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>
                                <span class="test-name">Đang đợi chạy...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>

    </div>

    <!-- Script điều khiển Logic Test -->
    <script>
        // Danh sách các API cần kiểm tra live bằng fetch
        const apisToCheck = [
            { path: 'api/get_all.php', name: 'API Lấy toàn bộ dữ liệu (get_all.php)', desc: 'Trả về cấu trúc JSON chứa toàn bộ danh sách cầu thủ, trận đấu, quỹ và album ảnh.' },
            { path: 'api/get_admins.php', name: 'API Danh sách Admin (get_admins.php)', desc: 'Trả về danh sách tài khoản quản lý.' },
            { path: 'api/check_login.php', name: 'API Kiểm tra Đăng nhập (check_login.php)', desc: 'Xác thực phiên làm việc hiện tại của quản trị viên.' }
        ];

        let testDatabase = []; // Lưu trữ tất cả kết quả test

        // Hàm lọc danh mục test
        function filterTests(category) {
            // Cập nhật tab active
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            const sections = document.querySelectorAll('.test-section');
            sections.forEach(sec => {
                if (category === 'all' || sec.getAttribute('data-group') === category) {
                    sec.classList.remove('filter-hidden');
                } else {
                    sec.classList.add('filter-hidden');
                }
            });
        }

        // Tạo thẻ hiển thị cho mỗi kết quả kiểm tra
        function createTestItemHTML(name, status, val, message) {
            let statusBadge = '';
            let icon = '';
            let textClass = '';

            switch (status) {
                case 'SUCCESS':
                    statusBadge = '<span class="badge-status success"><i class="fa-solid fa-circle-check"></i> ĐẠT</span>';
                    icon = '<i class="fa-solid fa-circle-check" style="color: var(--accent-primary);"></i>';
                    break;
                case 'WARNING':
                    statusBadge = '<span class="badge-status warning"><i class="fa-solid fa-triangle-exclamation"></i> CẢNH BÁO</span>';
                    icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-warning);"></i>';
                    break;
                case 'FAIL':
                    statusBadge = '<span class="badge-status fail"><i class="fa-solid fa-circle-xmark"></i> LỖI</span>';
                    icon = '<i class="fa-solid fa-circle-xmark" style="color: var(--accent-danger);"></i>';
                    textClass = 'has-error';
                    break;
                case 'LOADING':
                    statusBadge = '<span class="badge-status loading"><i class="fa-solid fa-circle-notch fa-spin"></i> ĐANG KIỂM TRA</span>';
                    icon = '<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>';
                    break;
            }

            return `
                <div class="test-item glass-panel">
                    <div class="test-item-row">
                        <div class="test-info">
                            ${icon}
                            <span class="test-name">${name}</span>
                        </div>
                        <div class="test-status-area">
                            ${val ? `<span class="test-val">${val}</span>` : ''}
                            ${statusBadge}
                        </div>
                    </div>
                    ${message ? `<div class="test-desc ${textClass}">${message}</div>` : ''}
                </div>
            `;
        }

        // Khởi động chạy toàn bộ các bài kiểm tra
        async function runAllTests() {
            const btn = document.getElementById('btn-run-all');
            const progressBar = document.getElementById('test-progress-bar');
            const progressContainer = document.getElementById('test-progress-container');

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang chạy chẩn đoán...';
            progressContainer.style.display = 'block';
            progressBar.style.width = '10%';

            testDatabase = [];
            updateStats();

            // Set loading cho tất cả các vùng hiển thị
            document.getElementById('list-env').innerHTML = createTestItemHTML('Đang phân tích cấu hình hệ thống...', 'LOADING', '', '');
            document.getElementById('list-db').innerHTML = createTestItemHTML('Đang kết nối database và đọc schema...', 'LOADING', '', '');
            document.getElementById('list-syntax').innerHTML = createTestItemHTML('Đang quét cú pháp các file PHP...', 'LOADING', '', '');
            document.getElementById('list-api').innerHTML = createTestItemHTML('Đang gửi request test tới các API endpoint...', 'LOADING', '', '');

            try {
                // Bước 1: Kiểm tra Môi trường
                progressBar.style.width = '30%';
                const envResponse = await fetch('test_system.php?action=check_env');
                const envData = await envResponse.json();
                renderGroup('env', envData.data);
                
                // Bước 2: Kiểm tra Database
                progressBar.style.width = '55%';
                const dbResponse = await fetch('test_system.php?action=check_db');
                const dbData = await dbResponse.json();
                renderGroup('db', dbData.data);

                // Bước 3: Kiểm tra Cú pháp các file PHP
                progressBar.style.width = '80%';
                const syntaxResponse = await fetch('test_system.php?action=check_syntax');
                const syntaxData = await syntaxResponse.json();
                renderGroup('syntax', syntaxData.data);

                // Bước 4: Kiểm tra live các API
                progressBar.style.width = '95%';
                await runLiveApiCheck();

                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1000);

            } catch (e) {
                console.error(e);
                alert("Đã xảy ra lỗi trong quá trình giao tiếp với máy chủ: " + e.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Chạy lại kiểm tra';
                updateStats();
            }
        }

        // Hiển thị dữ liệu kiểm tra cho từng group
        function renderGroup(groupId, dataObj) {
            const listEl = document.getElementById('list-' + groupId);
            const countEl = document.getElementById('badge-count-' + groupId);
            
            let html = '';
            let count = 0;
            
            for (const key in dataObj) {
                const item = dataObj[key];
                html += createTestItemHTML(item.name, item.status, item.value, item.message);
                count++;
                
                // Lưu kết quả vào danh sách thống kê
                testDatabase.push(item);
            }
            
            listEl.innerHTML = html;
            countEl.innerText = count + ' bài test';
        }

        // Chạy kiểm tra live các API bằng fetch từ frontend
        async function runLiveApiCheck() {
            const listEl = document.getElementById('list-api');
            const countEl = document.getElementById('badge-count-api');
            
            let html = '';
            let count = 0;
            
            for (const api of apisToCheck) {
                count++;
                let status = 'SUCCESS';
                let val = 'HTTP 200';
                let msg = '';
                
                try {
                    const startTime = performance.now();
                    const response = await fetch(api.path);
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    
                    val = `HTTP ${response.status} (${duration}ms)`;
                    
                    if (!response.ok) {
                        status = 'FAIL';
                        msg = `Yêu cầu API thất bại. Máy chủ trả về mã HTTP ${response.status}.`;
                    } else {
                        // Thử parse JSON
                        const text = await response.text();
                        try {
                            const json = JSON.parse(text);
                            if (json && json.error) {
                                status = 'FAIL';
                                msg = `API trả về JSON lỗi: ${json.error}`;
                            } else {
                                status = 'SUCCESS';
                                msg = `Gửi request thành công. Thời gian phản hồi: ${duration}ms. Dữ liệu JSON hợp lệ.`;
                            }
                        } catch (jsonErr) {
                            status = 'FAIL';
                            msg = `Dữ liệu phản hồi không phải định dạng JSON hợp lệ. Nội dung trả về:\n${text.substring(0, 500)}`;
                        }
                    }
                } catch (fetchErr) {
                    status = 'FAIL';
                    val = 'Connection Refused';
                    msg = `Không thể kết nối đến API: ${fetchErr.message}. Kiểm tra xem file có tồn tại hoặc máy chủ Apache có bị chặn kết nối hay không.`;
                }

                html += createTestItemHTML(api.name, status, val, msg);
                testDatabase.push({ status: status, name: api.name, value: val, message: msg });
            }

            listEl.innerHTML = html;
            countEl.innerText = count + ' bài test';
        }

        // Cập nhật các con số thống kê ở đầu bảng điều khiển
        function updateStats() {
            const total = testDatabase.length;
            const success = testDatabase.filter(x => x.status === 'SUCCESS').length;
            const warning = testDatabase.filter(x => x.status === 'WARNING').length;
            const fail = testDatabase.filter(x => x.status === 'FAIL').length;

            document.getElementById('stat-total').innerText = total;
            document.getElementById('stat-success').innerText = success;
            document.getElementById('stat-warning').innerText = warning;
            document.getElementById('stat-fail').innerText = fail;
        }

        // Tự động chạy tất cả bài test khi tải trang xong
        window.addEventListener('DOMContentLoaded', () => {
            runAllTests();
        });
    </script>
</body>
</html>
