// Post card + shared post actions (like, save, share, menu, report).
import { icon } from '../icons.js';
import { esc, rupees, perDay, monthLabel, timeAgo, avatar, cld, safeUrl, toast, shareLink, openModal, confirmDialog, postUrl, friendlyError } from '../ui.js';
import { state } from '../state.js';
import { REPORT_REASONS } from '../constants.js';
import { hasLiked, setLike, isSaved, setSaved, deletePost, reportPost } from '../services/db.js';
import { requireAuth } from '../authGate.js';
import { navigate } from '../router.js';

const likedCache = new Map();
const savedCache = new Map();
const pending = new Set();
export function clearSocialCache() { likedCache.clear(); savedCache.clear(); }

export function carousel(photos, width, alt) {
  const list = (photos || []).map(safeUrl).filter(Boolean);
  if (!list.length) return `<div class="carousel carousel-empty">${icon('image', 40)}</div>`;
  const imgs = list.map((u, i) => `<img src="${esc(cld(u, width))}" alt="${esc(alt)}${list.length > 1 ? ' - photo ' + (i + 1) : ''}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`).join('');
  return `<div class="carousel">${imgs}</div>${list.length > 1 ? `<span class="count-badge">1/${list.length}</span>` : ''}`;
}
export const trustBadge = () => `<span class="trust trust-self" title="Costs typed in by the traveller">${icon('info', 13)}Self-reported costs</span>`;
export const authorLink = (p, size = 36) =>
  `<a class="author" href="#/u/${esc(p.authorUsername)}">${avatar(p.authorPhoto, p.authorName, size)}<span class="author-txt"><b>${esc(p.authorName)}</b><small>@${esc(p.authorUsername)} · ${timeAgo(p.createdAt)}</small></span></a>`;
export function actionsRow(p) {
  return `<div class="post-actions">
    <button type="button" class="act" data-act="like" aria-label="Like">${icon('heart')}<span class="n">${Number(p.likeCount) || 0}</span></button>
    <a class="act" href="#/post/${esc(p.id)}?c=1" aria-label="Comments">${icon('comment')}</a>
    <button type="button" class="act" data-act="share" aria-label="Share">${icon('share')}</button>
    <span class="grow"></span>
    <button type="button" class="act" data-act="save" aria-label="Save">${icon('bookmark')}</button>
  </div>`;
}
export function postCard(p) {
  const id = esc(p.id);
  const days = Number(p.days) || 1, people = Number(p.people) || 1;
  return `<article class="card post" data-id="${id}">
  <header class="post-head">${authorLink(p)}<button type="button" class="icon-btn" data-act="menu" aria-label="More options">${icon('more')}</button></header>
  <a class="post-media" href="#/post/${id}">${carousel(p.photos, 900, p.title)}<span class="dest-chip">${icon('pin', 14)}${esc(p.destination)}</span></a>
  ${actionsRow(p)}
  <a class="post-body" href="#/post/${id}">
    <h3 class="post-title">${esc(p.title)}</h3>
    <div class="cost-line"><span class="cost-big">${rupees(perDay(p))}</span><span class="cost-unit">per person / day</span></div>
    <div class="meta">${rupees(p.costPerHead)} total · ${days} day${days > 1 ? 's' : ''} · ${people} ${people > 1 ? 'people' : 'person'} · ${monthLabel(p.month)}</div>
  </a>
  <footer class="post-foot">${trustBadge()}<span>from ${esc(p.startCity)}</span></footer>
</article>`;
}
export function bindPostActions(root, lookup) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || !root.contains(btn)) return;
    const holder = btn.closest('[data-id]');
    const p = holder ? lookup(holder.dataset.id) : null;
    if (!p) return;
    e.preventDefault();
    const act = btn.dataset.act;
    if (act === 'like') toggleLike(btn, p);
    else if (act === 'save') toggleSave(btn, p);
    else if (act === 'share') shareLink(`${p.title} · ${p.destination}`, postUrl(p.id));
    else if (act === 'menu') postMenu(p);
  });
  root.addEventListener('scroll', (e) => {
    const c = e.target;
    if (!c.classList || !c.classList.contains('carousel') || !c.clientWidth) return;
    const i = Math.round(c.scrollLeft / c.clientWidth);
    const badge = c.parentElement && c.parentElement.querySelector('.count-badge');
    if (badge) badge.textContent = `${i + 1}/${c.children.length}`;
  }, true);
}
export async function hydrate(root, posts) {
  const me = state.profile;
  if (!me) return;
  await Promise.all(posts.map(async (p) => {
    try {
      if (!likedCache.has(p.id)) likedCache.set(p.id, await hasLiked(p.id, me.uid));
      if (!savedCache.has(p.id)) savedCache.set(p.id, await isSaved(me.uid, p.id));
    } catch { return; }
    root.querySelectorAll(`[data-id="${p.id}"]`).forEach((el) => {
      const l = el.querySelector('[data-act="like"]'), s = el.querySelector('[data-act="save"]');
      if (l) l.classList.toggle('on', likedCache.get(p.id) === true);
      if (s) s.classList.toggle('on', savedCache.get(p.id) === true);
    });
  }));
}
async function toggleLike(btn, p) {
  if (!state.profile) { requireAuth('like trips'); return; }
  const key = 'l' + p.id;
  if (pending.has(key)) return;
  pending.add(key);
  const on = !btn.classList.contains('on');
  const n = btn.querySelector('.n');
  btn.classList.toggle('on', on);
  if (on) btn.classList.add('pop');
  p.likeCount = Math.max(0, (Number(p.likeCount) || 0) + (on ? 1 : -1));
  if (n) n.textContent = p.likeCount;
  likedCache.set(p.id, on);
  try { await setLike(p.id, state.profile.uid, on); }
  catch (e) {
    console.error(e);
    try {
      const real = await hasLiked(p.id, state.profile.uid);
      likedCache.set(p.id, real);
      btn.classList.toggle('on', real);
      if (real !== on) { p.likeCount = Math.max(0, p.likeCount + (on ? -1 : 1)); if (n) n.textContent = p.likeCount; }
    } catch { /* offline */ }
    toast("Couldn't update the like. Try again.", 'err');
  } finally {
    pending.delete(key);
    setTimeout(() => btn.classList.remove('pop'), 400);
  }
}
async function toggleSave(btn, p) {
  if (!state.profile) { requireAuth('save trips for later'); return; }
  const key = 's' + p.id;
  if (pending.has(key)) return;
  pending.add(key);
  const on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  savedCache.set(p.id, on);
  try { await setSaved(state.profile.uid, p.id, on); toast(on ? 'Saved to your list' : 'Removed from saved'); }
  catch (e) { btn.classList.toggle('on', !on); savedCache.set(p.id, !on); toast(friendlyError(e), 'err'); }
  finally { pending.delete(key); }
}
async function postMenu(p) {
  const mine = Boolean(state.profile && state.profile.uid === p.uid);
  const items = mine
    ? [{ label: 'Edit trip', value: 'edit' }, { label: 'Delete trip', value: 'delete', kind: 'danger' }]
    : [{ label: 'Report', value: 'report', kind: 'danger' }];
  items.push({ label: 'Copy link', value: 'copy' }, { label: 'Cancel', value: null });
  const v = await openModal({ sheet: true, actions: items.map((i) => ({ ...i, kind: 'btn-sheet ' + (i.kind || '') })) });
  if (v === 'edit') navigate('/edit/' + p.id);
  else if (v === 'copy') {
    try { await navigator.clipboard.writeText(postUrl(p.id)); toast('Link copied'); } catch { window.prompt('Copy this link', postUrl(p.id)); }
  } else if (v === 'report') openReport(p);
  else if (v === 'delete') {
    const ok = await confirmDialog('Delete this trip?', 'It will be removed from Safarnama for everyone. This cannot be undone.', 'Delete', true);
    if (!ok) return;
    try {
      await deletePost(p.id);
      toast('Trip deleted');
      document.querySelectorAll(`[data-id="${p.id}"]`).forEach((el) => el.remove());
      if (location.hash.startsWith('#/post/')) navigate('/');
    } catch (e) { toast(friendlyError(e), 'err'); }
  }
}
export async function openReport(p) {
  if (!state.profile) { requireAuth('report a post'); return; }
  const v = await openModal({
    title: 'Report this trip',
    body: `<div class="radio-list">${REPORT_REASONS.map((r, i) => `<label class="radio"><input type="radio" name="rr" value="${r.key}"${i === 0 ? ' checked' : ''}><span>${esc(r.label)}</span></label>`).join('')}</div>
      <textarea class="input" id="rnote" rows="3" maxlength="300" placeholder="Anything else we should know? (optional)"></textarea>`,
    actions: [{ label: 'Cancel', value: null }, {
      label: 'Send report', kind: 'btn-danger',
      value: (w) => ({ reason: (w.querySelector('input[name="rr"]:checked') || {}).value, note: w.querySelector('#rnote').value.trim().slice(0, 300) })
    }]
  });
  if (!v || !v.reason) return;
  try { await reportPost(p.id, state.profile.uid, v.reason, v.note); toast("Thanks. We'll review it.", 'ok'); }
  catch (e) { toast(friendlyError(e), 'err'); }
}
