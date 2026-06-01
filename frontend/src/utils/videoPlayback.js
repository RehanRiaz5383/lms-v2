import { getStorageUrl, normalizeUrl } from '../config/api';

/**
 * Google Drive in-browser viewer URL for a stored file id.
 */
export function getGoogleDriveViewUrl(fileId) {
  const id = String(fileId ?? '').trim();
  if (!id) {
    return null;
  }
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
}

/**
 * URL to open for an internal video (prefers Google Drive view when file id exists).
 */
export function resolveInternalVideoOpenUrl(video) {
  if (!video || video.source_type !== 'internal') {
    return null;
  }

  if (video.google_drive_file_id) {
    return getGoogleDriveViewUrl(video.google_drive_file_id);
  }

  const path = video.path || video.internal_path;
  if (path) {
    return normalizeUrl(getStorageUrl(path));
  }

  if (video.video_url) {
    return normalizeUrl(video.video_url);
  }

  return null;
}

/** @deprecated Use resolveInternalVideoOpenUrl */
export const resolveInternalVideoPlaybackUrl = resolveInternalVideoOpenUrl;

/**
 * Open internal (or external) video in a new tab — redirects to Google Drive when file id is set.
 */
export function openInternalVideo(video) {
  if (!video) {
    return false;
  }

  if (video.source_type === 'external' && video.external_url) {
    const opened = window.open(video.external_url, '_blank');
    return opened != null;
  }

  const url = resolveInternalVideoOpenUrl(video);
  if (!url) {
    return false;
  }

  const opened = window.open(url, '_blank');
  return opened != null;
}

/**
 * Open a URL in a new tab (blob previews for not-yet-saved uploads, or any resolved open URL).
 */
export function openVideoInNewTab(url) {
  if (!url) {
    return false;
  }

  const target = url.startsWith('blob:') ? url : normalizeUrl(url) || url;
  const opened = window.open(target, '_blank');
  return opened != null;
}
