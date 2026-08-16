<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ImageOptimizerService
{
    /**
     * Optimize an uploaded/stored image by resizing it and compressing it.
     * Optionally generates a thumbnail.
     *
     * @param string $storagePath The relative storage path (e.g. 'events/banners/abc.webp')
     * @param int $maxWidth Maximum width for the main image
     * @param int $quality Quality factor (0-100)
     * @param bool $generateThumbnail Whether to generate a thumbnail
     * @param int $thumbWidth Maximum width for the thumbnail
     * @return array Array with optimized path and optional thumbnail path
     */
    public static function optimizeAndThumbnail(
        string $storagePath,
        int $maxWidth = 1000,
        int $quality = 75,
        bool $generateThumbnail = true,
        int $thumbWidth = 240
    ): array {
        $disk = Storage::disk('public');
        if (!$disk->exists($storagePath)) {
            return ['path' => $storagePath, 'thumbnail_path' => null];
        }

        $fullPath = $disk->path($storagePath);
        
        $extension = pathinfo($fullPath, PATHINFO_EXTENSION);
        $filename = pathinfo($fullPath, PATHINFO_FILENAME);
        $directory = pathinfo($storagePath, PATHINFO_DIRNAME);
        
        // 1. Optimize the main banner file in-place to save storage
        self::runPythonOptimize($fullPath, $fullPath, $maxWidth, $quality);

        $thumbnailPath = null;
        if ($generateThumbnail) {
            // 2. Generate a thumbnail
            $thumbFilename = $filename . '_thumb.' . $extension;
            $thumbStoragePath = ($directory === '.' ? '' : $directory . '/') . $thumbFilename;
            $thumbFullPath = $disk->path($thumbStoragePath);

            self::runPythonOptimize($fullPath, $thumbFullPath, $thumbWidth, max(50, $quality - 5));
            
            if ($disk->exists($thumbStoragePath)) {
                $thumbnailPath = $thumbStoragePath;
            }
        }

        return [
            'path' => $storagePath,
            'thumbnail_path' => $thumbnailPath
        ];
    }

    /**
     * Run the Python optimization script.
     */
    private static function runPythonOptimize(string $input, string $output, int $width, int $quality): bool
    {
        $scriptPath = base_path('app/Services/optimize_image.py');
        
        // Command building with properly escaped arguments
        $cmd = sprintf(
            'python %s %s %s %d %d 2>&1',
            escapeshellarg($scriptPath),
            escapeshellarg($input),
            escapeshellarg($output),
            $width,
            $quality
        );

        $outputLog = [];
        $exitCode = -1;
        exec($cmd, $outputLog, $exitCode);

        if ($exitCode !== 0) {
            Log::error('Image optimization failed', [
                'command' => $cmd,
                'exit_code' => $exitCode,
                'output' => implode("\n", $outputLog)
            ]);
            return false;
        }

        return true;
    }
}
