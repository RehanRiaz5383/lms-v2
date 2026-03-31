/**
 * First file from a paste event (screenshots, copied files). Returns null if only text.
 */
export function getFileFromClipboardData(clipboardData) {
  if (!clipboardData) return null;
  if (clipboardData.files?.length) {
    return clipboardData.files[0];
  }
  const { items } = clipboardData;
  if (!items?.length) return null;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

/** Clipboard screenshots often have an empty name; give a stable filename for upload. */
export function ensurePastedFileName(file) {
  if (!file) return null;
  if (file.name && file.name.trim() !== '') return file;
  const ext = (file.type && file.type.split('/')[1]) || 'png';
  return new File([file], `pasted-image-${Date.now()}.${ext}`, {
    type: file.type || 'image/png',
  });
}
