// App chrome: desktop side nav, mobile top bar + bottom tab bar.
import { icon, googleLogo } from './icons.js';
import { state, subscribe } from './state.js';
import { esc, avatar } from './ui.js';
import { parseHash } from './router.js';
import { APP } from './config.js';

const TABS = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/explore', icon: 'compass', label: 'Explore' },
  { path: '/create', icon: 'plus', label: 'Share trip', primary: true },
  { path: '/saved', icon: 'bookmark', label: 'Saved' },
  { path: '/me', icon: 'user', label: 'Profile' }
];
const logoSvg = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="currentColor"/><path d="M18 44l9-25 8 15 4-7 7 17z" fill="#fff"/></svg>';
export const brand = () => `<a class="brand" href="#/" aria-label="${esc(APP.name)} home"><span class="logo">${logoSvg}</span><span class="wordmark">${esc(APP.name)}</span></a>`;

function isActive(tab, path) {
  if (tab.path === '/') return path === '/';
  if (tab.path === '/me') return path === '/me' || path === '/settings' || Boolean(state.profile && path === '/u/' + state.profile.username);
  if (tab.path === '/create') return path === '/create' || path.startsWith('/edit/');
  return path === tab.path || path.startsWith(tab.path + '/');
}
function tabLink(t, i, withLabel) {
  let ic;
  if (t.path === '/me' && state.profile) ic = avatar(state.profile.photoURL, state.profile.name, withLabel ? 24 : 26);
  else if (t.primary && !withLabel) ic = `<span class="tab-plus">${icon('plus', 22)}</span>`;
  else ic = icon(t.icon, 24);
  return `<a href="#${t.path}" class="tab${t.primary ? ' tab-primary' : ''}" data-tab="${i}" aria-label="${esc(t.label)}">${ic}${withLabel ? `<span>${esc(t.label)}</span>` : ''}</a>`;
}
function paint() {
  const side = document.getElementById('sidenav');
  const top = document.getElementById('topbar');
  const tabs = document.getElementById('tabbar');
  const signInSide = state.authReady && !state.user ? `<button class="btn btn-google btn-block" data-signin>${googleLogo} Sign in with Google</button>` : '';
  const signInTop = state.authReady && !state.user ? '<button class="btn btn-primary btn-sm" data-signin>Sign in</button>' : '';
  side.innerHTML = `${brand()}<nav class="side-links">${TABS.map((t, i) => tabLink(t, i, true)).join('')}</nav><div class="side-foot">${signInSide}<a class="side-about" href="#/about">About & privacy</a></div>`;
  top.innerHTML = `${brand()}<div class="top-right">${signInTop}<a class="icon-btn" href="#/about" aria-label="About">${icon('info')}</a></div>`;
  tabs.innerHTML = TABS.map((t, i) => tabLink(t, i, false)).join('');
  markActive();
}
function markActive() {
  const { path } = parseHash();
  document.querySelectorAll('[data-tab]').forEach((a) => {
    const on = isActive(TABS[Number(a.dataset.tab)], path);
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
export function renderShell() {
  paint();
  subscribe(paint);
  document.addEventListener('routechange', markActive);
}
