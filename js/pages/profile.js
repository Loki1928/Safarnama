// Profiles (/u/:username, /me) and the Saved list.
import { icon } from '../icons.js';
import { esc, avatar, emptyState } from '../ui.js';
import { state } from '../state.js';
import { getProfileByUsername, postsByUser, savedPosts } from '../services/db.js';
import { pageHeader, spinnerHtml, errorBlock, signInWall, tileGrid } from './common.js';

export async function profilePage(ctx) {
  const { view } = ctx;
  const uname = String(ctx.params.username || '').toLowerCase();
  view.innerHTML = pageHeader('@' + uname) + spinnerHtml();
  let prof;
  try { prof = state.profile && state.profile.username === uname ? state.profile : await getProfileByUsername(uname); }
  catch (e) { if (ctx.isCurrent()) view.innerHTML = pageHeader('@' + uname) + errorBlock(e); return; }
  if (!ctx.isCurrent()) return;
  if (!prof) { view.innerHTML = pageHeader('@' + uname) + `<div class="page-pad">${emptyState('user', 'Traveller not found', 'This profile may have been deleted.')}</div>`; return; }
  await renderProfile(ctx, prof, true);
}
export async function mePage(ctx) {
  if (!state.profile) { signInWall(ctx.view, 'Your travel profile', 'Sign in to share trips, save plans and follow what others really spent.'); return; }
  await renderProfile(ctx, state.profile, false);
}
async function renderProfile(ctx, prof, showBack) {
  const { view } = ctx;
  const mine = Boolean(state.profile && state.profile.uid === prof.uid);
  view.innerHTML = `${pageHeader(mine ? 'Your profile' : '@' + prof.username, { back: showBack, right: mine ? `<a class="icon-btn" href="#/settings" aria-label="Settings">${icon('sliders')}</a>` : '' })}
  <section class="page-pad">
    <div class="profile-top">${avatar(prof.photoURL, prof.name, 84)}<div class="profile-stats" id="pstats"><div><b>–</b><small>trips</small></div><div><b>–</b><small>places</small></div><div><b>–</b><small>likes</small></div></div></div>
    <h1 class="profile-name">${esc(prof.name)}</h1>
    <p class="profile-handle">@${esc(prof.username)}${prof.homeCity ? ` · ${icon('pin', 13)} ${esc(prof.homeCity)}` : ''}</p>
    ${prof.bio ? `<p class="profile-bio">${esc(prof.bio)}</p>` : ''}
    ${mine ? `<div class="profile-btns"><a class="btn btn-ghost btn-sm" href="#/settings">Edit profile</a><a class="btn btn-primary btn-sm" href="#/create">${icon('plus', 16)} Share a trip</a></div>` : ''}
  </section>
  <div class="page-pad" id="pgrid">${spinnerHtml()}</div>`;
  const gridEl = view.querySelector('#pgrid');
  try {
    const posts = await postsByUser(prof.uid);
    if (!ctx.isCurrent()) return;
    const dests = new Set(posts.map((p) => p.destKey)).size;
    const likes = posts.reduce((a, p) => a + (Number(p.likeCount) || 0), 0);
    view.querySelector('#pstats').innerHTML = `<div><b>${posts.length}</b><small>trip${posts.length === 1 ? '' : 's'}</small></div><div><b>${dests}</b><small>place${dests === 1 ? '' : 's'}</small></div><div><b>${likes}</b><small>like${likes === 1 ? '' : 's'}</small></div>`;
    gridEl.innerHTML = posts.length ? tileGrid(posts)
      : emptyState('map', mine ? 'Share your first trip' : 'No trips yet', mine ? 'Your trips with real costs will appear here.' : '', mine ? '<a class="btn btn-primary" href="#/create">Share a trip</a>' : '');
  } catch (e) { if (ctx.isCurrent()) gridEl.innerHTML = errorBlock(e); }
}
export async function savedPage(ctx) {
  const { view } = ctx;
  if (!state.profile) { signInWall(view, 'Save trips for later', 'Sign in to bookmark trips while you plan your own.'); return; }
  view.innerHTML = pageHeader('Saved', { back: false }) + `<div class="page-pad" id="sv">${spinnerHtml()}</div>`;
  const box = view.querySelector('#sv');
  try {
    const posts = await savedPosts(state.profile.uid);
    if (!ctx.isCurrent()) return;
    box.innerHTML = posts.length ? tileGrid(posts) : emptyState('bookmark', 'Nothing saved yet', 'Tap the bookmark on any trip to keep it for planning.', '<a class="btn btn-primary" href="#/explore">Explore trips</a>');
  } catch (e) { if (ctx.isCurrent()) box.innerHTML = errorBlock(e); }
}
