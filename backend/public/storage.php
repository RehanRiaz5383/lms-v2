<?php
/**
 * Direct Storage File Server
 * 
 * This file serves storage files directly, bypassing Laravel routing.
 * Use this if the /storage/* route is not working due to server configuration.
 * 
 * Place this file in your public directory (domain root).
 * Access files via: https://yourdomain.com/storage.php?file=User_Profile/image.jpg
 */

// Security: Only allow files from storage/app/public
$allowedBasePath = dirname(__DIR__) . '/storage/app/public';

// Get file path from query parameter
$filePath = $_GET['file'] ?? '';

if (empty($filePath)) {
    http_response_code(400);
    die('File parameter is required. Usage: /storage.php?file=User_Profile/image.jpg');
}

// Security: Prevent directory traversal
$filePath = str_replace('..', '', $filePath);
$filePath = ltrim($filePath, '/');

// Build full path
$fullPath = $allowedBasePath . '/' . $filePath;

// Security: Ensure file is within allowed directory
$realBasePath = realpath($allowedBasePath);
$realFilePath = realpath($fullPath);

if (!$realFilePath || strpos($realFilePath, $realBasePath) !== 0) {
    http_response_code(403);
    die('Access denied: File outside allowed directory');
}

// Check if file exists
if (!file_exists($fullPath)) {
    http_response_code(404);
    die('File not found');
}

// Check if file is readable
if (!is_readable($fullPath)) {
    http_response_code(403);
    die('File is not readable. Please check file permissions.');
}

// Get MIME type
$mimeType = mime_content_type($fullPath);
if (!$mimeType) {
    $extension = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'pdf' => 'application/pdf',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
    ];
    $mimeType = $mimeTypes[strtolower($extension)] ?? 'application/octet-stream';
}

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($fullPath));
header('Cache-Control: public, max-age=31536000');
header('Content-Disposition: inline; filename="' . basename($filePath) . '"');

// Output file
readfile($fullPath);
exit;

