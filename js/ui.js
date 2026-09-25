// UI helpers: escaping, formatting, toast, modal, empty states.
import { icon } from './icons.js';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : '');

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const rupees = (n) => '₹' + INR.format(Math.round(Number(n) || 0));
const trim1 = (x) => (x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace(/\.0$/, ''));
export function kRupees(n) {
  n = Math.round(Number(n) || 0);
  if (n >= 100000) return '₹' + trim1(n / 100000) + 'L';
  if (n >= 1000) return '₹' + trim1(n / 1000) + 'k';
  return '₹' + n;
}
export const perDay = (p) => Math.round((Number(p.costPerHead) || 0) / Math.max(1, Number(p.days) || 1));
export function median(arr) {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  const n = a.length;
  if (!n) return 0;
  return n % 2 ? a[(n - 1) / 2] : Math.round((a[n / 2 - 1] + a[n / 2]) / 2);
}
export function mostCommon(arr) {
  const m = new Map();
  let best = null, bestN = 0;
  for (const x of arr) { if (!x) continue; const n = (m.get(x) || 0) + 1; m.set(x, n); if (n > bestN) { best = x; bestN = n; } }
  return best;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(ym) {
  const [y, m] = String(ym || '').split('-').map(Number);
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : '';
}
export function timeAgo(ms) {
  if (!ms) return '';
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  const d = new Date(ms);
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-IN', opts);
}
export function cld(url, w) {
  const u = safeUrl(url);
  if (!u) return '';
  return u.includes('/image/upload/') ? u.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${w}/`) : u;
}
export function avatar(url, name = '', size = 36) {
  const s = `width:${size}px;height:${size}px`;
  const u = safeUrl(url);
  if (u) return `<img class="av" src="${esc(u)}" alt="" style="${s}" referrerpolicy="no-referrer" loading="lazy">`;
  const init = (String(name).trim()[0] || '?').toUpperCase();
  const hue = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `<span class="av av-fallback" style="${s};background:hsl(${hue} 45% 88%);color:hsl(${hue} 45% 30%);font-size:${Math.round(size * 0.42)}px">${esc(init)}</span>`;
}
export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export const postUrl = (id) => `${location.origin}${location.pathname}#/post/${id}`;

export function toast(msg, kind = '') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, kind === 'err' ? 4800 : 3000);
}

let openCount = 0;
export function openModal({ title = '', body = '', actions = [], sheet = false, onMount = null } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap' + (sheet ? ' is-sheet' : '');
    wrap.innerHTML = `<div class="modal${sheet ? ' sheet' : ''}" role="dialog" aria-modal="true"${title ? ` aria-label="${esc(title)}"` : ''}>
      ${title ? `<h3 class="modal-title">${esc(title)}</h3>` : ''}
      ${body ? `<div class="modal-body">${body}</div>` : ''}
      ${actions.length ? `<div class="modal-actions${sheet ? ' stack' : ''}">${actions.map((a, i) => `<button type="button" class="btn ${a.kind || 'btn-ghost'}" data-mi="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
    </div>`;
    let done = false;
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    function close(v) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      openCount = Math.max(0, openCount - 1);
      if (!openCount) document.body.classList.remove('no-scroll');
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 180);
      resolve(v);
    }
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) { close(null); return; }
      const b = e.target.closest('[data-mi]');
      if (!b) return;
      const a = actions[Number(b.dataset.mi)];
      const v = typeof a.value === 'function' ? a.value(wrap) : a.value;
      if (v !== undefined) close(v);
    });
    document.addEventListener('keydown', onKey);
    openCount++;
    document.body.classList.add('no-scroll');
    root.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    if (onMount) onMount(wrap, close);
  });
}
export function confirmDialog(title, text, okLabel = 'Confirm', danger = false) {
  return openModal({
    title, body: `<p>${esc(text)}</p>`,
    actions: [{ label: 'Cancel', value: null }, { label: okLabel, value: true, kind: danger ? 'btn-danger' : 'btn-primary' }]
  });
}
export async function shareLink(title, url) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch { window.prompt('Copy this link', url); }
}
export function friendlyError(e) {
  const code = (e && e.code) || '';
  if (code === 'permission-denied') return 'Permission denied. If you just set up Firebase, check that firestore.rules is published (SETUP.md step 5).';
  if (code === 'unavailable') return 'You seem to be offline. Check your connection and try again.';
  if (code === 'failed-precondition') return 'The database needs a setting for this view. Open the browser console: Firebase prints a one-click link to fix it.';
  if (code === 'not-found') return 'Not found. If this is a fresh setup, create the Firestore database (SETUP.md step 5).';
  return (e && e.message) || 'Something went wrong.';
}
export const emptyState = (ic, title, text = '', cta = '') =>
  `<div class="empty">${icon(ic, 34)}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${cta}</div>`;
export const skeletonCards = (n) => Array.from({ length: n }, () =>
  '<div class="card post skel"><div class="sk-row"><span class="sk sk-av"></span><span class="sk sk-line w40"></span></div><div class="sk sk-media"></div><span class="sk sk-line w70"></span><span class="sk sk-line w40"></span></div>').join('');
