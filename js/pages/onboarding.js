// First sign-in: pick name + unique username.
import { esc, toast, avatar, debounce, friendlyError } from '../ui.js';
import { state, setState } from '../state.js';
import { rerender } from '../router.js';
import { APP } from '../config.js';
import { LIMITS } from '../constants.js';
import { USERNAME_RE, isUsernameFree, createProfile, getProfile } from '../services/db.js';
import { logout } from '../services/auth.js';

function suggestUsername(displayName, email) {
  const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
  let u = clean(displayName);
  if (u.length < 3) u = clean(String(email || '').split('@')[0]);
  if (u.length < 3) u = 'traveller' + Math.floor(100 + Math.random() * 900);
  return u;
}

export async function onboardingPage(ctx) {
  const { view } = ctx;
  const u = state.user;
  if (!u) return;
  view.innerHTML = `<div class="onboard page-pad"><div class="card onboard-card">
    ${avatar(u.photoURL, u.displayName || '', 64)}
    <h1>Welcome to ${esc(APP.name)}</h1>
    <p class="muted">Set up your traveller profile. This is what people see on your trips.</p>
    <form id="of" novalidate>
      <label class="field"><span>Your name</span><input class="input" name="name" maxlength="${LIMITS.name}" value="${esc(String(u.displayName || '').slice(0, LIMITS.name))}"></label>
      <label class="field"><span>Username</span><div class="prefix-input"><span>@</span><input class="input" name="username" maxlength="20" value="${esc(suggestUsername(u.displayName, u.email))}" autocapitalize="off" autocomplete="off" spellcheck="false"></div><small class="hint" id="uh">3–20 characters: a–z, 0–9, _ and .</small></label>
      <label class="field"><span>Home city <em>(optional)</em></span><input class="input" name="homeCity" maxlength="${LIMITS.city}" placeholder="Delhi"></label>
      <button class="btn btn-primary btn-block btn-lg" id="ob">Create profile</button>
    </form>
    <button type="button" class="link-btn" id="obOut">Not you? Sign out</button>
  </div></div>`;
  const form = view.querySelector('#of');
  const F = (n) => form.elements.namedItem(n);
  const uIn = F('username'), hint = view.querySelector('#uh');
  const setHint = (t, cls) => { hint.textContent = t; hint.className = 'hint' + (cls ? ' ' + cls : ''); };
  let seq = 0;
  const check = debounce(async () => {
    const val = uIn.value, my = ++seq;
    if (!USERNAME_RE.test(val)) { setHint('3–20 characters: a–z, 0–9, _ and .', val ? 'bad' : ''); return; }
    setHint('Checking…', '');
    try { const free = await isUsernameFree(val); if (my === seq) setHint(free ? `@${val} is available` : `@${val} is taken`, free ? 'ok' : 'bad'); }
    catch { if (my === seq) setHint('', ''); }
  }, 350);
  uIn.addEventListener('input', () => { const c = uIn.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''); if (c !== uIn.value) uIn.value = c; check(); });
  check();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = F('name').value.trim().replace(/\s+/g, ' ').slice(0, LIMITS.name);
    const username = uIn.value;
    const homeCity = F('homeCity').value.trim().slice(0, LIMITS.city);
    if (!name) { toast('Please enter your name', 'err'); F('name').focus(); return; }
    if (!USERNAME_RE.test(username)) { toast('Username: 3–20 characters, a–z, 0–9, _ and .', 'err'); uIn.focus(); return; }
    const btn = view.querySelector('#ob');
    btn.disabled = true;
    btn.textContent = 'Creating…';
    try {
      if (!(await isUsernameFree(username))) { toast(`@${username} is taken. Try another.`, 'err'); uIn.focus(); return; }
      const photo = String(u.photoURL || '');
      await createProfile({ uid: u.uid, username, name, homeCity, photoURL: photo.length <= 500 ? photo : '' });
      const profile = await getProfile(u.uid);
      setState({ profile, profileError: null });
      toast(`Welcome, ${name.split(' ')[0]}!`, 'ok');
      rerender();
    } catch (err) {
      console.error(err);
      toast(err && err.code === 'permission-denied' ? 'That username was just taken, or the database rules aren\'t published yet (SETUP.md step 5).' : friendlyError(err), 'err');
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Create profile'; }
    }
  });
  view.querySelector('#obOut').addEventListener('click', () => { logout(); });
}
