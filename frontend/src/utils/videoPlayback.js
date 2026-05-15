import { APP_BASE_URL, getStorageUrl, normalizeUrl } from '../config/api';

/**
 * URL suitable for in-browser playback (video element), not forced download redirects.
 */
export function resolveInternalVideoPlaybackUrl(video) {
  if (!video || video.source_type !== 'internal') {
    return null;
  }

  const path = video.path || video.internal_path;
  if (path) {
    return normalizeUrl(getStorageUrl(path));
  }

  if (video.id) {
    return `${APP_BASE_URL}/api/videos/${video.id}/direct-download`;
  }

  if (video.video_url) {
    return normalizeUrl(video.video_url);
  }

  return null;
}

/**
 * Open a video in a new tab using an inline HTML5 player (works for streamed internal videos).
 */
export function openVideoInNewTab(url) {
  if (!url) {
    return false;
  }

  const playbackUrl = normalizeUrl(url) || url;

  if (playbackUrl.startsWith('blob:')) {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      return false;
    }
    newWindow.document.write(buildVideoPlayerHtml(playbackUrl));
    newWindow.document.close();
    return true;
  }

  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    return false;
  }
  newWindow.document.write(buildVideoPlayerHtml(playbackUrl));
  newWindow.document.close();
  return true;
}

function buildVideoPlayerHtml(src) {
  const safeSrc = String(src)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Video</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #000;
      }
      video {
        max-width: 100%;
        max-height: 90vh;
      }
    </style>
  </head>
  <body>
    <video src="${safeSrc}" controls autoplay playsinline></video>
  </body>
</html>`;
}
