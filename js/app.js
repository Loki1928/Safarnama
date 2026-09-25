// Safarnama boot: routes, auth state, global click handlers.
import { isConfigured } from './firebase.js';
import { state, setState } from './state.js';
import { route, setGuard, startRouter, rerender, navigate } from './router.js';
import { renderShell } from './shell.js';
import { APP } from './config.js';
import { doSignIn } from './authGate.js';
import { watchAuth } from './services/auth.js';
import { getProfile } from './services/db.js';
import { clearSocialCache } from './components/postCard.js';
import { setupPage } from './pages/setup.js';
import { feedPage } from './pages/feed.js';
import { explorePage } from './pages/explore.js';
import { postPage } from './pages/post.js';
import { createPage } from './pages/create.js';
import { profilePage, mePage, savedPage } from './pages/profile.js';
import { settingsPage, aboutPage } from './pages/settings.js';
import { onboardingPage } from './pages/onboarding.js';
import { profileErrorPage } from './pages/common.js';

window.__safarnama = { state };
document.title = `${APP.name} — ${APP.tagline}`;

// Global handlers. Sign-in must run synchronously inside the click (popup blockers).
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-signin]')) { e.preventDefault(); doSignIn(); return; }
  if (e.target.closest('[data-back]')) { e.preventDefault(); if (history.length > 1) history.back(); else navigate('/'); }
});

if (!isConfigured) {
  setupPage();
} else {
  route('/', feedPage);
  route('/explore', explorePage);
  route('/post/:id', postPage);
  route('/create', createPage);
  route('/edit/:id', createPage);
  route('/u/:username', profilePage);
  route('/me', mePage);
  route('/saved', savedPage);
  route('/settings', settingsPage);
  route('/about', aboutPage);
  setGuard((ctx) => {
    if (!state.user || ctx.path === '/about') return null;
    if (state.profileError) return profileErrorPage;
    if (!state.profile) return onboardingPage;
    return null;
  });
  renderShell();

  let started = false, lastUid, authSeq = 0;
  watchAuth(async (user) => {
    const my = ++authSeq;
    let profile = null, profileError = null;
    if (user) {
      try { profile = await getProfile(user.uid); }
      catch (e) { console.error(e); profileError = e; }
    }
    if (my !== authSeq) return;
    const uid = user ? user.uid : null;
    if (uid !== lastUid) clearSocialCache();
    lastUid = uid;
    setState({ user, profile, profileError, authReady: true });
    if (!started) { started = true; startRouter(); } else rerender();
  });
}
