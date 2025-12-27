# PWA Setup Guide

This application has been configured as a Progressive Web App (PWA), allowing users to install it on their mobile devices and desktop browsers.

## Features

- ✅ Installable on mobile devices (iOS & Android)
- ✅ Installable on desktop browsers (Chrome, Edge, Firefox)
- ✅ Offline support with service worker
- ✅ App-like experience (standalone mode)
- ✅ Caching for better performance

## Generating PWA Icons

The PWA requires specific icon sizes. You have two options:

### Option 1: Using the Script (Recommended)

1. Install sharp (image processing library):
   ```bash
   npm install -D sharp
   ```

2. Run the icon generation script:
   ```bash
   node generate-pwa-icons.js
   ```

This will generate the required icons (`pwa-192x192.png` and `pwa-512x512.png`) in the `public/` directory from your existing logo.

### Option 2: Using Online Tools

1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/) or [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)

2. Upload your logo (`src/assets/icons/logo.png`)

3. Generate and download the icons

4. Place the following files in the `public/` directory:
   - `pwa-192x192.png` (192x192 pixels)
   - `pwa-512x512.png` (512x512 pixels)

## Building for Production

After generating the icons, build the application:

```bash
npm run build
```

The PWA files (manifest.json, service worker) will be automatically generated during the build process.

## Testing PWA Installation

### On Mobile (Android):

1. Open Chrome browser
2. Navigate to your deployed application
3. You should see an "Add to Home Screen" prompt, or
4. Tap the menu (3 dots) → "Add to Home Screen" or "Install App"

### On Mobile (iOS):

1. Open Safari browser
2. Navigate to your deployed application
3. Tap the Share button
4. Select "Add to Home Screen"

### On Desktop:

1. Open Chrome/Edge browser
2. Navigate to your deployed application
3. Look for the install icon in the address bar, or
4. Go to menu → "Install [App Name]"

## PWA Configuration

The PWA is configured in `vite.config.js` with the following settings:

- **App Name**: LMS - Learning Management System
- **Short Name**: LMS
- **Theme Color**: #1e40af (blue)
- **Display Mode**: Standalone (app-like experience)
- **Orientation**: Portrait (can be changed to "any" if needed)

## Service Worker Features

The service worker includes:

- **Automatic Updates**: The app will automatically update when new versions are available
- **API Caching**: API responses are cached for 24 hours
- **Storage Caching**: File storage URLs are cached for 7 days
- **Offline Support**: Basic offline functionality

## Customization

You can customize the PWA settings in `vite.config.js`:

- Change app name, description, theme colors
- Modify cache strategies
- Adjust icon sizes
- Change display mode (standalone, fullscreen, minimal-ui)

## Troubleshooting

### Icons not showing:
- Ensure icons are in the `public/` directory
- Check that icon files are named correctly: `pwa-192x192.png` and `pwa-512x512.png`
- Clear browser cache and rebuild

### Install prompt not appearing:
- Ensure you're accessing via HTTPS (required for PWA)
- Check browser console for errors
- Verify manifest.json is being served correctly

### Service worker not working:
- Check browser console for service worker errors
- Ensure you're not in incognito/private mode
- Clear service worker cache: DevTools → Application → Service Workers → Unregister

## Production Deployment

For production deployment:

1. Ensure your site is served over HTTPS (required for PWA)
2. Build the application: `npm run build`
3. Deploy the `dist/` folder to your server
4. Ensure the server serves the manifest.json and service worker files with correct MIME types

## Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

