// Home feed: newest trips, infinite scroll.
import { googleLogo } from '../icons.js';
import { skeletonCards, emptyState, friendlyError, esc } from '../ui.js';
import { state } from '../state.js';
import { feedPage as fetchFeed } from '../services/db.js';
import { postCard, bindPostActions, hydrate } from '../components/postCard.js';
import { errorBlock } from './common.js';

const hero = () => `<section class="hero">
  <span class="eyebrow">Real trips · Real rupees</span>
  <h1>Plan your trip from what people <em>actually</em> spent.</h1>
  <p>No clickbait thumbnails. No "Manali in ₹3,000" that skips the bus fare. Every trip here shows the full per-person cost: stay, travel, food, everything.</p>
  <div class="hero-cta"><button type="button" class="btn btn-google" data-signin>${googleLogo} Continue with Google</button><a class="btn btn-ghost" href="#/explore">Explore trips</a></div>
</section>`;

export async function feedPage(ctx) {
  const { view } = ctx;
  view.innerHTML = `${state.user ? '' : hero()}<div class="feed" id="feed">${skeletonCards(2)}</div><div class="feed-foot" id="feedFoot"></div>`;
  const list = view.querySelector('#feed');
  const foot = view.querySelector('#feedFoot');
  const posts = new Map();
  let cursor = null, done = false, loading = false, first = true;
  bindPostActions(list, (id) => posts.get(id));

  async function more() {
    if (loading || done) return;
    loading = true;
    if (!first) foot.innerHTML = '<div class="spinner"></div>';
    try {
      const page = await fetchFeed(cursor);
      if (!ctx.isCurrent()) return;
      if (first) { list.innerHTML = ''; first = false; }
      const fresh = page.items.filter((p) => !posts.has(p.id));
      fresh.forEach((p) => posts.set(p.id, p));
      list.insertAdjacentHTML('beforeend', fresh.map((p) => postCard(p)).join(''));
      hydrate(list, fresh);
      cursor = page.cursor;
      done = page.done;
      if (!posts.size) {
        list.innerHTML = emptyState('compass', 'No trips yet', 'Be the first to share a trip with real costs.',
          state.profile ? '<a class="btn btn-primary" href="#/create">Share your trip</a>' : '<button type="button" class="btn btn-primary" data-signin>Sign in to share</button>');
      }
      foot.innerHTML = done ? (posts.size ? '<p class="end-note">You\'re all caught up.</p>' : '') : '<button type="button" class="btn btn-ghost" id="moreBtn">Load more</button>';
    } catch (e) {
      console.error(e);
      if (!ctx.isCurrent()) return;
      if (first) list.innerHTML = errorBlock(e);
      else foot.innerHTML = `<p class="end-note">${esc(friendlyError(e))}</p><button type="button" class="btn btn-ghost" id="moreBtn">Retry</button>`;
    } finally { loading = false; }
  }
  foot.addEventListener('click', (e) => { if (e.target.closest('#moreBtn')) more(); });
  const io = new IntersectionObserver((entries) => { if (entries.some((x) => x.isIntersecting) && !first) more(); }, { rootMargin: '600px' });
  io.observe(foot);
  await more();
  return () => io.disconnect();
}
