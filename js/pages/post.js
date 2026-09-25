// Trip detail: photos, full cost breakdown, facts, story, places, comments.
import { icon } from '../icons.js';
import { esc, rupees, perDay, monthLabel, timeAgo, avatar, safeUrl, toast, emptyState, friendlyError, confirmDialog } from '../ui.js';
import { state } from '../state.js';
import { APP } from '../config.js';
import { BREAKDOWN, TRIP_TYPES, TRAVEL_MODES, PLACE_TYPES, PLACE_EMOJI, LIMITS } from '../constants.js';
import { getPost, listComments, addComment, deleteComment } from '../services/db.js';
import { carousel, trustBadge, authorLink, actionsRow, bindPostActions, hydrate } from '../components/postCard.js';
import { pageHeader, spinnerHtml, errorBlock } from './common.js';

const fact = (ic, value, label) => `<div class="fact">${icon(ic, 20)}<div><b>${esc(value)}</b><small>${esc(label)}</small></div></div>`;

export async function postPage(ctx) {
  const { view } = ctx;
  const id = ctx.params.id;
  view.innerHTML = pageHeader('Trip') + spinnerHtml();
  let p;
  try { p = await getPost(id); }
  catch (e) { if (ctx.isCurrent()) view.innerHTML = pageHeader('Trip') + errorBlock(e); return; }
  if (!ctx.isCurrent()) return;
  if (!p) {
    view.innerHTML = pageHeader('Trip') + `<div class="page-pad">${emptyState('map', 'Trip not found', 'It may have been deleted by its author.', '<a class="btn btn-primary" href="#/">Back to feed</a>')}</div>`;
    return;
  }
  document.title = `${p.title} · ${APP.name}`;
  const parts = BREAKDOWN.map((b) => ({ ...b, v: Number(p.breakdown && p.breakdown[b.key]) || 0 })).filter((x) => x.v > 0);
  const sum = parts.reduce((a, x) => a + x.v, 0);
  const places = Array.isArray(p.places) ? p.places : [];
  const days = Number(p.days) || 1, people = Number(p.people) || 1;

  view.innerHTML = `<article class="detail" data-id="${esc(p.id)}">
    ${pageHeader(p.destination, { right: `<button type="button" class="icon-btn" data-act="menu" aria-label="More options">${icon('more')}</button>` })}
    <div class="detail-media">${carousel(p.photos, 1200, p.title)}</div>
    <div class="page-pad">
      ${authorLink(p, 40)}
      <h1 class="detail-title">${esc(p.title)}</h1>
      <p class="detail-dest">${icon('pin', 16)} ${esc(p.destination)} <span class="dim">· from ${esc(p.startCity)} · ${monthLabel(p.month)}</span></p>
      ${actionsRow(p)}
      <section class="cost-card">
        <div class="cost-top">
          <div><span class="eyebrow">Per person, whole trip</span><b class="cost-xl">${rupees(p.costPerHead)}</b></div>
          <div class="right"><span class="eyebrow">Per day</span><b class="cost-l">${rupees(perDay(p))}</b></div>
        </div>
        ${sum ? `<div class="bar">${parts.map((x) => `<span style="width:${(x.v / sum * 100).toFixed(2)}%;background:${x.color}" title="${x.label}"></span>`).join('')}</div>
        <ul class="legend">${parts.map((x) => `<li><i class="dot" style="background:${x.color}"></i><span>${x.label}</span><b>${rupees(x.v)}</b><small>${Math.round(x.v / sum * 100)}%</small></li>`).join('')}</ul>`
        : '<p class="muted small">The traveller gave the total only, without a category breakdown.</p>'}
        <div class="trust-row">${trustBadge()}</div>
      </section>
      <div class="facts">
        ${fact('calendar', `${days} day${days > 1 ? 's' : ''}`, 'Duration')}
        ${fact('users', `${people} ${people > 1 ? 'people' : 'person'}`, 'Travellers')}
        ${fact('user', TRIP_TYPES[p.tripType] || '-', 'Trip type')}
        ${fact('map', TRAVEL_MODES[p.travelMode] || '-', 'Getting there')}
      </div>
      ${p.highlights ? `<section class="block"><h2>The trip</h2><p class="prose">${esc(p.highlights)}</p></section>` : ''}
      ${p.tips ? `<section class="block tips"><h2>Tips & what I'd do differently</h2><p class="prose">${esc(p.tips)}</p></section>` : ''}
      ${places.length ? `<section class="block"><h2>Places</h2><ul class="places">${places.map((pl) => `<li><span class="pl-emoji">${PLACE_EMOJI[pl.type] || '📍'}</span><div><b>${esc(pl.name)}</b><small>${esc(PLACE_TYPES[pl.type] || '')}${pl.note ? ' · ' + esc(pl.note) : ''}</small></div>${Number.isFinite(pl.cost) ? `<span class="pl-cost">${rupees(pl.cost)}</span>` : ''}</li>`).join('')}</ul></section>` : ''}
      <p class="posted">Posted ${timeAgo(p.createdAt)}${p.updatedAt ? ' · edited' : ''}</p>
      <section class="block" id="comments"><h2>Comments</h2><div id="cList">${spinnerHtml()}</div><div id="cForm"></div></section>
    </div>
  </article>`;
  bindPostActions(view.querySelector('.detail'), () => p);
  hydrate(view, [p]);

  const cList = view.querySelector('#cList'), cForm = view.querySelector('#cForm');
  let comments = [];
  const canDelete = (c) => state.profile && (state.profile.uid === c.uid || state.profile.uid === p.uid);
  function renderComments() {
    cList.innerHTML = comments.length ? comments.map((c) => `<div class="comment">${avatar(c.photo, c.name, 32)}<div class="c-body">
      <div class="c-head"><a href="#/u/${esc(c.username)}"><b>${esc(c.name)}</b></a><small>${timeAgo(c.createdAt)}</small>${canDelete(c) ? `<button type="button" class="link-btn danger" data-cdel="${esc(c.id)}">Delete</button>` : ''}</div>
      <p class="prose">${esc(c.text)}</p></div></div>`).join('')
      : '<p class="muted small">No comments yet. Ask the traveller something, like where they stayed or how they got around.</p>';
  }
  async function loadComments() {
    try { comments = await listComments(p.id); if (ctx.isCurrent()) renderComments(); }
    catch (e) { if (ctx.isCurrent()) cList.innerHTML = `<p class="muted small">${esc(friendlyError(e))}</p>`; }
  }
  cList.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cdel]');
    if (!b) return;
    if (!(await confirmDialog('Delete comment?', 'This cannot be undone.', 'Delete', true))) return;
    try { await deleteComment(p.id, b.dataset.cdel); comments = comments.filter((c) => c.id !== b.dataset.cdel); renderComments(); }
    catch (err) { toast(friendlyError(err), 'err'); }
  });
  if (state.profile) {
    cForm.innerHTML = `<form class="c-form" id="cf">${avatar(state.profile.photoURL, state.profile.name, 32)}<textarea class="input" name="text" rows="1" maxlength="${LIMITS.comment}" placeholder="Add a comment…" aria-label="Comment"></textarea><button class="btn btn-primary btn-sm">Post</button></form>`;
    const form = cForm.querySelector('#cf'), ta = form.querySelector('textarea'), btn = form.querySelector('button');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      btn.disabled = true;
      try { await addComment(p.id, state.profile, text.slice(0, LIMITS.comment)); ta.value = ''; ta.style.height = ''; await loadComments(); }
      catch (err) { toast(friendlyError(err), 'err'); }
      finally { btn.disabled = false; }
    });
  } else {
    cForm.innerHTML = '<button type="button" class="btn btn-ghost btn-block" data-signin>Sign in to comment</button>';
  }
  await loadComments();
  if (ctx.query.c && ctx.isCurrent()) { const el = view.querySelector('#comments'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  return () => { document.title = `${APP.name} — ${APP.tagline}`; };
}
