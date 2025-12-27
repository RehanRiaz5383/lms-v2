<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Jose\Component\Core\JWK;
use Jose\Component\Core\AlgorithmManager;
use Jose\Component\KeyManagement\JWKFactory;

class GenerateVapidKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'web-push:vapid';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate VAPID keys for Web Push Notifications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Generating VAPID keys for Web Push Notifications...');
        
        try {
            // Generate EC key pair for VAPID
            $jwk = JWKFactory::createECKey('P-256');
            
            $publicKey = $jwk->get('x') . '.' . $jwk->get('y');
            $privateKey = $jwk->get('d');
            
            // Convert to base64url encoding
            $publicKeyBase64 = $this->base64UrlEncode(base64_decode(str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($publicKey))));
            $privateKeyBase64 = $this->base64UrlEncode(base64_decode(str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($privateKey))));
            
            $this->newLine();
            $this->info('VAPID Keys Generated Successfully!');
            $this->newLine();
            $this->line('Add these to your .env file:');
            $this->newLine();
            $this->line('VAPID_PUBLIC_KEY=' . $publicKeyBase64);
            $this->line('VAPID_PRIVATE_KEY=' . $privateKeyBase64);
            $this->newLine();
            $this->info('After adding to .env, restart your application server.');
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to generate VAPID keys: ' . $e->getMessage());
            $this->newLine();
            $this->warn('Alternative: Use an online VAPID key generator:');
            $this->line('https://web-push-codelab.glitch.me/');
            $this->line('Or use: npm install -g web-push && web-push generate-vapid-keys');
            return Command::FAILURE;
        }
    }

    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
