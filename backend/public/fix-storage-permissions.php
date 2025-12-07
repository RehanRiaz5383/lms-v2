<?php
/**
 * Temporary script to fix storage file permissions
 * 
 * IMPORTANT: Delete this file after running it once!
 * 
 * Usage: Visit https://yourdomain.com/fix-storage-permissions.php
 */

// Security: Only allow in development or with a token
$allowedToken = getenv('FIX_PERMISSIONS_TOKEN');
$providedToken = $_GET['token'] ?? '';

if (app()->environment('production') && ($allowedToken && $providedToken !== $allowedToken)) {
    die('Access denied. Set FIX_PERMISSIONS_TOKEN in .env and provide it as ?token=YOUR_TOKEN');
}

$storagePath = __DIR__ . '/../storage/app/public';

if (!is_dir($storagePath)) {
    die('Storage directory not found: ' . $storagePath);
}

$fixed = 0;
$errors = [];

try {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($storagePath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        $path = $item->getPathname();
        
        if ($item->isDir()) {
            if (@chmod($path, 0755)) {
                $fixed++;
            } else {
                $errors[] = "Failed to set permissions on directory: $path";
            }
        } else {
            if (@chmod($path, 0644)) {
                $fixed++;
            } else {
                $errors[] = "Failed to set permissions on file: $path";
            }
        }
    }
    
    echo "<h2>Storage Permissions Fixed</h2>";
    echo "<p>Fixed permissions on <strong>$fixed</strong> files/directories.</p>";
    
    if (!empty($errors)) {
        echo "<h3>Errors:</h3><ul>";
        foreach ($errors as $error) {
            echo "<li>$error</li>";
        }
        echo "</ul>";
    }
    
    echo "<p><strong style='color: red;'>IMPORTANT: Delete this file (fix-storage-permissions.php) now for security!</strong></p>";
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

