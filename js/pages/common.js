// Small shared page pieces.
import { icon, googleLogo } from '../icons.js';
import { esc, cld, safeUrl, kRupees, perDay, emptyState, friendlyError } from '../ui.js';

export const spinnerHtml = () => '<div class="center-pad"><div class="spinner"></div></div>';
export function pageHeader(title, { back = true, right = '' } = {}) {
  return `<div class="page-head">${back ? `<button type="button" class="icon-btn" data-back aria-label="Back">${icon('back')}</button>` : ''}<h1 class="page-head-title">${esc(title)}</h1><div class="page-head-right">${right}</div></div>`;
}
export function signInWall(view, title, text) {
  view.innerHTML = `<div class="wall">${icon('user', 40)}<h2>${esc(title)}</h2><p>${esc(text)}</p><button type="button" class="btn btn-google btn-lg" data-signin>${googleLogo} Continue with Google</button></div>`;
}
export const errorBlock = (e) =>
  `<div class="page-pad">${emptyState('alert', "Couldn't load this", friendlyError(e), '<button type="button" class="btn btn-ghost" onclick="location.reload()">Try again</button>')}</div>`;
export function tileGrid(posts) {
  return `<div class="tiles">${posts.map((p) => {
    const cover = safeUrl((p.photos || [])[0]);
    const place = String(p.destination || '').split(',')[0];
    return `<a class="tile" href="#/post/${esc(p.id)}">${cover ? `<img src="${esc(cld(cover, 400))}" alt="${esc(p.title)}" loading="lazy">` : `<span class="tile-empty">${icon('image', 22)}</span>`}
      <span class="tile-info"><b>${esc(place)}</b><small>${kRupees(perDay(p))}/day</small></span>
      ${(p.photos || []).length > 1 ? `<span class="tile-multi">${icon('image', 14)}</span>` : ''}</a>`;
  }).join('')}</div>`;
}
export function profileErrorPage({ view }) {
  const { state } = window.__safarnama || {};
  view.innerHTML = `<div class="page-pad">${emptyState('alert', "Couldn't load your profile", friendlyError(state && state.profileError), '<button type="button" class="btn btn-primary" onclick="location.reload()">Try again</button>')}</div>`;
}
