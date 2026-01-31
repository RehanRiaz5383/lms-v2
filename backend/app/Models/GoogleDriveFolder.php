<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleDriveFolder extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'directory_path',
        'folder_id',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get folder by name (case-insensitive with multiple matching strategies)
     */
    public static function getByName(string $name): ?self
    {
        // Try exact match first
        $folder = self::where('name', $name)->where('is_active', true)->first();
        if ($folder) {
            return $folder;
        }
        
        // Try case-insensitive match on name
        $folder = self::whereRaw('LOWER(name) = ?', [strtolower($name)])
            ->where('is_active', true)
            ->first();
        if ($folder) {
            return $folder;
        }
        
        // Try matching by display_name (case-insensitive)
        $folder = self::whereRaw('LOWER(display_name) = ?', [strtolower($name)])
            ->where('is_active', true)
            ->first();
        if ($folder) {
            return $folder;
        }
        
        // Try partial match on name (for variations like "User_Profile" vs "user_profile")
        // Remove underscores and compare
        $normalizedName = strtolower(str_replace(['_', '-'], '', $name));
        $folder = self::where('is_active', true)->get()->first(function($f) use ($normalizedName) {
            $folderName = strtolower(str_replace(['_', '-'], '', $f->name));
            return $folderName === $normalizedName;
        });
        
        return $folder;
    }

    /**
     * Get folder ID by name
     */
    public static function getFolderId(string $name): ?string
    {
        $folder = self::getByName($name);
        return $folder?->folder_id;
    }

    /**
     * Get all folders with their mappings for reference
     */
    public static function getFolderMappings(): array
    {
        $folders = self::where('is_active', true)->get();
        $mappings = [];
        
        foreach ($folders as $folder) {
            $mappings[] = [
                'id' => $folder->id,
                'name' => $folder->name,
                'display_name' => $folder->display_name,
                'directory_path' => $folder->directory_path,
                'folder_id' => $folder->folder_id,
                'code_usage' => self::getCodeUsageForFolder($folder->name),
            ];
        }
        
        return $mappings;
    }

    /**
     * Get suggested code usage for a folder name
     */
    private static function getCodeUsageForFolder(string $folderName): string
    {
        $nameLower = strtolower($folderName);
        
        if (strpos($nameLower, 'user') !== false && strpos($nameLower, 'profile') !== false) {
            return "uploadToGoogleDrive(\$file, '{$folderName}') // For profile pictures";
        }
        if (strpos($nameLower, 'task') !== false && strpos($nameLower, 'file') !== false) {
            return "uploadToGoogleDrive(\$file, '{$folderName}') // For task files";
        }
        if (strpos($nameLower, 'submitted') !== false || strpos($nameLower, 'submission') !== false) {
            return "uploadToGoogleDrive(\$file, '{$folderName}') // For submitted tasks";
        }
        if (strpos($nameLower, 'voucher') !== false) {
            return "uploadToGoogleDrive(\$file, '{$folderName}') // For voucher submissions";
        }
        if (strpos($nameLower, 'video') !== false) {
            return "uploadToGoogleDrive(\$file, '{$folderName}') // For videos";
        }
        
        return "uploadToGoogleDrive(\$file, '{$folderName}')";
    }
}
