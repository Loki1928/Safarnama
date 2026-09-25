// Hash router: #/path?query. Each page handler may return a cleanup function.
const table = [];
let guard = null;
let cleanup = null;
let navToken = 0;

export function route(pattern, handler) {
  const keys = [];
  const src = pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  table.push({ re: new RegExp('^' + src + '/?$'), keys, handler });
}
export function setGuard(fn) { guard = fn; }
export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const i = raw.indexOf('?');
  const path = (i === -1 ? raw : raw.slice(0, i)) || '/';
  const qs = i === -1 ? '' : raw.slice(i + 1);
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}
function notFound({ view }) {
  view.innerHTML = '<div class="page-pad"><div class="empty"><h3>Page not found</h3><p>This link doesn\'t lead anywhere.</p><a class="btn btn-primary" href="#/">Go home</a></div></div>';
}
export async function rerender() {
  const token = ++navToken;
  const { path, query } = parseHash();
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null;
  let handler = notFound;
  const params = {};
  for (const r of table) {
    const m = path.match(r.re);
    if (m) {
      handler = r.handler;
      r.keys.forEach((k, idx) => { try { params[k] = decodeURIComponent(m[idx + 1]); } catch { params[k] = m[idx + 1]; } });
      break;
    }
  }
  const view = document.getElementById('view');
  const ctx = { path, params, query, view, isCurrent: () => token === navToken };
  if (guard) { const g = guard(ctx); if (g) handler = g; }
  view.innerHTML = '';
  window.scrollTo(0, 0);
  document.dispatchEvent(new CustomEvent('routechange', { detail: { path } }));
  try {
    const c = await handler(ctx);
    if (ctx.isCurrent()) cleanup = typeof c === 'function' ? c : null;
    else if (typeof c === 'function') c();
  } catch (e) {
    console.error(e);
    if (ctx.isCurrent()) {
      const msg = String((e && e.message) || e).replace(/[<>&"]/g, '');
      view.innerHTML = `<div class="page-pad"><div class="empty"><h3>Something went wrong</h3><p>${msg}</p><button class="btn btn-ghost" onclick="location.reload()">Reload</button></div></div>`;
    }
  }
}
export function startRouter() { window.addEventListener('hashchange', rerender); rerender(); }
export function navigate(path) { if (location.hash.slice(1) === path) rerender(); else location.hash = path; }
