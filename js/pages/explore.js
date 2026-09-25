// Explore: destination search with real price stats, trending places, latest tiles.
import { icon } from '../icons.js';
import { esc, rupees, kRupees, perDay, median, mostCommon, emptyState } from '../ui.js';
import { TRAVEL_MODES } from '../constants.js';
import { navigate } from '../router.js';
import { recentPosts, postsByDest, destKeyOf } from '../services/db.js';
import { postCard, bindPostActions, hydrate } from '../components/postCard.js';
import { spinnerHtml, errorBlock, tileGrid } from './common.js';

export async function explorePage(ctx) {
  const { view } = ctx;
  const q = String(ctx.query.d || '').trim().slice(0, 60);
  const key = destKeyOf(q);
  view.innerHTML = `<div class="page-pad">
    <h1 class="page-title">Explore</h1>
    <p class="page-sub">See what trips really cost before you book anything.</p>
    <form class="search" id="sf" role="search">${icon('search', 20)}<input name="d" type="search" placeholder="Where are you headed? e.g. Manali" value="${esc(q)}" autocomplete="off" enterkeyhint="search" maxlength="60" aria-label="Destination"><button class="btn btn-primary btn-sm">Search</button></form>
    <div id="xb">${spinnerHtml()}</div></div>`;
  view.querySelector('#sf').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = e.target.elements.namedItem('d').value.trim();
    navigate(v ? '/explore?d=' + encodeURIComponent(v) : '/explore');
  });
  const body = view.querySelector('#xb');
  if (q && !key) { body.innerHTML = emptyState('search', 'Try English letters', 'Search destinations in English letters, e.g. "Manali" or "Goa".'); return; }
  try {
    if (!key) {
      const recent = await recentPosts(60);
      if (!ctx.isCurrent()) return;
      renderDiscover(body, recent);
    } else {
      const posts = await postsByDest(key);
      if (!ctx.isCurrent()) return;
      renderDestination(body, q, posts);
    }
  } catch (e) { console.error(e); if (ctx.isCurrent()) body.innerHTML = errorBlock(e); }
}

function renderDiscover(body, posts) {
  if (!posts.length) {
    body.innerHTML = emptyState('compass', 'Nothing to explore yet', 'Trips will show up here as travellers share them.', '<a class="btn btn-primary" href="#/create">Share the first trip</a>');
    return;
  }
  const counts = new Map();
  for (const p of posts) {
    const c = counts.get(p.destKey) || { n: 0, label: String(p.destination).split(',')[0].trim() };
    c.n++;
    counts.set(p.destKey, c);
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  body.innerHTML = `<h2 class="section-title">Popular right now</h2>
    <div class="dest-chips">${top.map((c) => `<a class="dest-pill" href="#/explore?d=${encodeURIComponent(c.label)}">${icon('pin', 14)}${esc(c.label)}<span>${c.n}</span></a>`).join('')}</div>
    <h2 class="section-title">Latest trips</h2>${tileGrid(posts)}`;
}

function renderDestination(body, q, posts) {
  if (!posts.length) {
    body.innerHTML = emptyState('map', `No trips to ${q} yet`, 'Be the first to share real numbers for this place. Future travellers will thank you.', '<a class="btn btn-primary" href="#/create">Share your trip</a>');
    return;
  }
  const label = mostCommon(posts.map((p) => String(p.destination).split(',')[0].trim())) || q;
  const pd = posts.map(perDay), tot = posts.map((p) => Number(p.costPerHead) || 0), days = posts.map((p) => Number(p.days) || 1);
  const n = posts.length, medDays = median(days);
  const mode = TRAVEL_MODES[mostCommon(posts.map((p) => p.travelMode))];
  body.innerHTML = `<section class="stats-card">
      <span class="eyebrow">Real numbers</span>
      <h2>${esc(label)}</h2>
      <p>From ${n} trip${n > 1 ? 's' : ''} shared by travellers · per person, all-in</p>
      <div class="stats-grid">
        <div><b>${rupees(median(pd))}</b><small>typical cost per day</small></div>
        <div><b>${rupees(median(tot))}</b><small>typical whole trip</small></div>
        <div><b>${medDays} day${medDays === 1 ? '' : 's'}</b><small>typical length</small></div>
        <div><b>${n > 1 ? `${kRupees(Math.min(...pd))}–${kRupees(Math.max(...pd))}` : kRupees(pd[0])}</b><small>range per day</small></div>
      </div>
      <p class="note">${n < 3 ? `Only ${n} trip${n > 1 ? 's' : ''} so far, so treat this as a rough guide. ` : ''}${mode ? `Most travelled by ${esc(mode.toLowerCase())}. ` : ''}Costs are self-reported by travellers.</p>
    </section>
    <div class="seg" id="seg"><button type="button" class="on" data-s="new">Newest</button><button type="button" data-s="cheap">Lowest per day</button><button type="button" data-s="liked">Most liked</button></div>
    <div class="feed" id="dl"></div>`;
  const lookup = new Map(posts.map((p) => [p.id, p]));
  const list = body.querySelector('#dl');
  bindPostActions(list, (id) => lookup.get(id));
  const sorts = {
    new: (a, b) => b.createdAt - a.createdAt,
    cheap: (a, b) => perDay(a) - perDay(b),
    liked: (a, b) => (Number(b.likeCount) || 0) - (Number(a.likeCount) || 0)
  };
  const draw = (s) => { const arr = [...posts].sort(sorts[s]); list.innerHTML = arr.map((p) => postCard(p)).join(''); hydrate(list, arr); };
  body.querySelector('#seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (!b) return;
    body.querySelectorAll('#seg button').forEach((x) => x.classList.toggle('on', x === b));
    draw(b.dataset.s);
  });
  draw('new');
}
