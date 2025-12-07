<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

/**
 * Storage Route - Serves files from storage/app/public
 * This route works on shared hosting without symlinks
 */
Route::get('/storage/{path}', function ($path) {
    // Security: Prevent directory traversal
    $path = str_replace('..', '', $path);
    $path = ltrim($path, '/');
    
    // Check if file exists in storage
    if (!Storage::disk('public')->exists($path)) {
        abort(404, 'File not found');
    }
    
    $filePath = Storage::disk('public')->path($path);
    
    // Get MIME type
    $mimeType = Storage::disk('public')->mimeType($path);
    
    // Return file with proper headers
    return response()->file($filePath, [
        'Content-Type' => $mimeType,
    ]);
})->where('path', '.*');
