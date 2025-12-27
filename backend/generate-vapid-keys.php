<?php

/**
 * Simple VAPID Key Generator
 * Run: php generate-vapid-keys.php
 */

require __DIR__ . '/vendor/autoload.php';

use Minishlink\WebPush\VAPID;

echo "Generating VAPID keys for Web Push Notifications...\n\n";

try {
    // Create VAPID keys
    $keys = VAPID::createVapidKeys();
    
    echo "VAPID Keys Generated Successfully!\n\n";
    echo "Add these to your .env file:\n\n";
    echo "VAPID_PUBLIC_KEY=" . $keys['publicKey'] . "\n";
    echo "VAPID_PRIVATE_KEY=" . $keys['privateKey'] . "\n\n";
    echo "After adding to .env, restart your application server.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n\n";
    echo "Alternative methods:\n";
    echo "1. Use online generator: https://web-push-codelab.glitch.me/\n";
    echo "2. Use Node.js: npm install -g web-push && web-push generate-vapid-keys\n";
}

