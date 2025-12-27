<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;

class VapidKeyGenerator
{
    /**
     * Generate VAPID keys using available methods
     * 
     * @return array|null Returns ['publicKey' => ..., 'privateKey' => ...] or null on failure
     */
    public static function generate(): ?array
    {
        // Method 1: Try using Minishlink\WebPush\VAPID (if available)
        if (class_exists(\Minishlink\WebPush\VAPID::class)) {
            try {
                $keys = \Minishlink\WebPush\VAPID::createVapidKeys();
                if (isset($keys['publicKey']) && isset($keys['privateKey'])) {
                    return [
                        'publicKey' => $keys['publicKey'],
                        'privateKey' => $keys['privateKey'],
                        'method' => 'Minishlink\WebPush\VAPID'
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('VAPID key generation failed with Minishlink\WebPush\VAPID: ' . $e->getMessage());
            }
        }

        // Method 2: Try using OpenSSL (most reliable, works on most shared hosting)
        if (function_exists('openssl_pkey_new') && function_exists('openssl_pkey_export')) {
            try {
                $config = [
                    'curve_name' => 'prime256v1',
                    'private_key_type' => OPENSSL_KEYTYPE_EC,
                ];
                
                $privateKeyResource = @openssl_pkey_new($config);
                if ($privateKeyResource) {
                    // Export private key
                    $privateKeyPem = '';
                    if (@openssl_pkey_export($privateKeyResource, $privateKeyPem)) {
                        // Get public key details
                        $publicKeyDetails = @openssl_pkey_get_details($privateKeyResource);
                        
                        if ($publicKeyDetails && isset($publicKeyDetails['ec'])) {
                            $x = $publicKeyDetails['ec']['x'] ?? null;
                            $y = $publicKeyDetails['ec']['y'] ?? null;
                            $d = $publicKeyDetails['ec']['d'] ?? null;
                            
                            if ($x && $y && $d) {
                                // Create uncompressed public key (0x04 + x + y)
                                // Ensure x and y are exactly 32 bytes each
                                $xBytes = str_pad($x, 32, "\0", STR_PAD_LEFT);
                                $yBytes = str_pad($y, 32, "\0", STR_PAD_LEFT);
                                $publicKeyBytes = "\x04" . $xBytes . $yBytes;
                                
                                // Encode to base64url
                                $publicKey = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($publicKeyBytes));
                                $privateKey = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($d));
                                
                                return [
                                    'publicKey' => $publicKey,
                                    'privateKey' => $privateKey,
                                    'method' => 'OpenSSL'
                                ];
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('VAPID key generation failed with OpenSSL: ' . $e->getMessage());
            }
        }

        // Method 3: Try using JWKFactory (fallback)
        if (class_exists(\Jose\Component\KeyManagement\JWKFactory::class)) {
            try {
                $jwk = \Jose\Component\KeyManagement\JWKFactory::createECKey('P-256');
                
                $x = $jwk->get('x');
                $y = $jwk->get('y');
                $d = $jwk->get('d');
                
                // JWK values are base64url encoded, decode them
                $xBin = self::base64UrlDecode($x);
                $yBin = self::base64UrlDecode($y);
                $dBin = self::base64UrlDecode($d);
                
                // Ensure proper length (32 bytes for P-256 curve)
                // Pad from left if needed
                $xBin = str_pad($xBin, 32, "\0", STR_PAD_LEFT);
                $yBin = str_pad($yBin, 32, "\0", STR_PAD_LEFT);
                $dBin = str_pad($dBin, 32, "\0", STR_PAD_LEFT);
                
                // Trim if longer (shouldn't happen but be safe)
                $xBin = substr($xBin, -32);
                $yBin = substr($yBin, -32);
                $dBin = substr($dBin, -32);
                
                // Create uncompressed public key (0x04 prefix + x + y = 65 bytes total)
                $publicKeyBytes = "\x04" . $xBin . $yBin;
                
                // Encode to base64url
                $publicKey = self::base64UrlEncode($publicKeyBytes);
                $privateKey = self::base64UrlEncode($dBin);
                
                return [
                    'publicKey' => $publicKey,
                    'privateKey' => $privateKey,
                    'method' => 'JWKFactory'
                ];
            } catch (\Exception $e) {
                Log::warning('VAPID key generation failed with JWKFactory: ' . $e->getMessage());
            }
        }

        return null;
    }

    /**
     * Base64URL encode
     */
    private static function base64UrlEncode($data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64URL decode
     */
    private static function base64UrlDecode($data): string
    {
        $padding = strlen($data) % 4;
        if ($padding) {
            $data .= str_repeat('=', 4 - $padding);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Check if VAPID key generation is possible
     */
    public static function isAvailable(): bool
    {
        return class_exists(\Minishlink\WebPush\VAPID::class) ||
               (function_exists('openssl_pkey_new') && function_exists('openssl_pkey_export')) ||
               class_exists(\Jose\Component\KeyManagement\JWKFactory::class);
    }

    /**
     * Get available methods
     */
    public static function getAvailableMethods(): array
    {
        $methods = [];
        
        if (class_exists(\Minishlink\WebPush\VAPID::class)) {
            $methods[] = 'Minishlink\WebPush\VAPID';
        }
        
        if (function_exists('openssl_pkey_new') && function_exists('openssl_pkey_export')) {
            $methods[] = 'OpenSSL';
        }
        
        if (class_exists(\Jose\Component\KeyManagement\JWKFactory::class)) {
            $methods[] = 'JWKFactory';
        }
        
        return $methods;
    }
}

