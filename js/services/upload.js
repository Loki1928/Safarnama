// Photo pipeline: shrink in the browser, then upload to Cloudinary (unsigned preset).
import { cloudinaryConfig } from '../config.js';

export const uploadsConfigured = () => Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read one of the photos. Try a JPG or PNG.')); };
    img.src = url;
  });
}
export async function compressImage(file, max = 1600, quality = 0.82) {
  const img = await loadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, 0, 0, cw, ch);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), 'image/jpeg', quality));
}
export function uploadImage(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const { cloudName, uploadPreset } = cloudinaryConfig;
    const fd = new FormData();
    fd.append('file', blob, 'photo.jpg');
    fd.append('upload_preset', uploadPreset);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let r = {};
      try { r = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && r.secure_url) resolve(r.secure_url);
      else reject(new Error((r.error && r.error.message) ? `Photo upload failed: ${r.error.message}` : `Photo upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading a photo.'));
    xhr.send(fd);
  });
}
