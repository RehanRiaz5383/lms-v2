/**
 * Script to generate PWA icons from existing logo
 * Run this with: node generate-pwa-icons.js
 * 
 * Note: This script requires sharp package. Install it with: npm install -D sharp
 * Or use an online tool like https://realfavicongenerator.net/ to generate icons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.log('Sharp not found. Please install it with: npm install -D sharp');
  console.log('Or use an online tool like https://realfavicongenerator.net/');
  console.log('\nRequired icon sizes:');
  console.log('- pwa-192x192.png (192x192)');
  console.log('- pwa-512x512.png (512x512)');
  process.exit(1);
}

const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(__dirname, 'src', 'assets', 'icons', 'logo.png');

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error(`Logo not found at: ${logoPath}`);
  console.log('Please ensure logo.png exists in src/assets/icons/');
  process.exit(1);
}

// Generate icons
async function generateIcons() {
  try {
    console.log('Generating PWA icons...');
    
    // Generate 192x192 icon
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('✓ Generated pwa-192x192.png');
    
    // Generate 512x512 icon
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('✓ Generated pwa-512x512.png');
    
    console.log('\n✅ PWA icons generated successfully!');
    console.log('Icons are located in the public/ directory');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

