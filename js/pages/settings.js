// Settings (profile edit, sign out, delete account) and About & privacy.
import { icon } from '../icons.js';
import { esc, avatar, toast, openModal, friendlyError } from '../ui.js';
import { state, setState } from '../state.js';
import { navigate } from '../router.js';
import { APP } from '../config.js';
import { LIMITS } from '../constants.js';
import { updateProfile, deleteAccountData } from '../services/db.js';
import { logout, deleteAuthUser } from '../services/auth.js';
import { pageHeader, signInWall } from './common.js';

export async function settingsPage(ctx) {
  const { view } = ctx;
  if (!state.profile) { signInWall(view, 'Settings', 'Sign in to manage your profile.'); return; }
  const p = state.profile;
  view.innerHTML = `${pageHeader('Settings')}
  <div class="page-pad">
    <section class="form-card"><h2>Profile</h2>
      <form id="pf" novalidate>
        <div class="row-center">${avatar(p.photoURL, p.name, 56)}<p class="muted small">Your photo comes from your Google account.</p></div>
        <label class="field"><span>Name</span><input class="input" name="name" maxlength="${LIMITS.name}" value="${esc(p.name)}"></label>
        <label class="field"><span>Username</span><input class="input" value="@${esc(p.username)}" disabled><small class="hint">Usernames can't be changed yet.</small></label>
        <label class="field"><span>Home city</span><input class="input" name="homeCity" maxlength="${LIMITS.city}" value="${esc(p.homeCity)}"></label>
        <label class="field"><span>Bio</span><textarea class="input" name="bio" rows="3" maxlength="${LIMITS.bio}">${esc(p.bio)}</textarea></label>
        <button class="btn btn-primary" id="saveBtn">Save profile</button>
        <p class="hint" style="margin-top:10px">Name changes show on new trips and comments. Older trips update when you edit them.</p>
      </form>
    </section>
    <section class="form-card"><h2>Account</h2>
      <p class="muted small">Signed in as ${esc((state.user && state.user.email) || '')}</p>
      <div class="stack-btns"><a class="btn btn-ghost" href="#/about">${icon('info', 18)} About & privacy</a><button type="button" class="btn btn-ghost" id="outBtn">${icon('logout', 18)} Sign out</button></div>
    </section>
    <section class="form-card danger-zone"><h2>Delete account</h2>
      <p class="muted small">Removes your profile, all your trips and your saved list. Comments you left on other trips stay until you delete them one by one. Photo files may stay on the image host until they're cleaned up.</p>
      <button type="button" class="btn btn-danger" id="delBtn">Delete my account</button>
    </section>
  </div>`;
  const form = view.querySelector('#pf');
  const F = (n) => form.elements.namedItem(n);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = F('name').value.trim().replace(/\s+/g, ' ').slice(0, LIMITS.name);
    const homeCity = F('homeCity').value.trim().slice(0, LIMITS.city);
    const bio = F('bio').value.trim().slice(0, LIMITS.bio);
    if (!name) { toast('Name can\'t be empty', 'err'); F('name').focus(); return; }
    const btn = view.querySelector('#saveBtn');
    btn.disabled = true;
    try { await updateProfile(p.uid, { name, homeCity, bio }); setState({ profile: { ...state.profile, name, homeCity, bio } }); toast('Profile saved', 'ok'); }
    catch (err) { toast(friendlyError(err), 'err'); }
    finally { btn.disabled = false; }
  });
  view.querySelector('#outBtn').addEventListener('click', async () => { await logout(); navigate('/'); });
  const delBtn = view.querySelector('#delBtn');
  delBtn.addEventListener('click', async () => {
    const ok = await openModal({
      title: 'Delete your account?',
      body: `<p>This permanently removes your profile and all your trips. Type <b>${esc(p.username)}</b> to confirm.</p><input class="input" id="delc" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your username">`,
      actions: [{ label: 'Cancel', value: null }, {
        label: 'Delete forever', kind: 'btn-danger',
        value: (w) => { if (w.querySelector('#delc').value.trim().toLowerCase() === p.username) return true; toast('Type your username exactly to confirm', 'err'); return undefined; }
      }]
    });
    if (!ok) return;
    delBtn.disabled = true;
    delBtn.textContent = 'Deleting…';
    try { await deleteAccountData(state.profile); }
    catch (err) { toast(friendlyError(err), 'err'); delBtn.disabled = false; delBtn.textContent = 'Delete my account'; return; }
    try { await deleteAuthUser(); } catch (err) { console.warn(err); await logout().catch(() => {}); }
    toast('Your account has been deleted.', 'ok');
    navigate('/');
  });
}

export function aboutPage(ctx) {
  ctx.view.innerHTML = `${pageHeader('About & privacy')}<div class="doc">
    <h1>${esc(APP.name)}</h1>
    <p>${esc(APP.name)} is where travellers share what a trip really cost: per person and all-in, covering stay, getting there and back, food and activities.</p>
    <h2>Why</h2>
    <p>Trip videos sell "Manali in ₹3,000" and leave out the bus fare. Here, every trip shows the full number, broken down, from someone who actually went.</p>
    <h2>How the numbers work</h2>
    <p>Right now, costs are entered by the traveller and marked <b>Self-reported</b>. Soon, trips logged with the built-in group expense tracker will show <b>Backed by N logged expenses</b>, so you can see the itemised ledger behind the total.</p>
    <h2>Privacy, in plain words</h2>
    <ul>
      <li><b>Public:</b> your name, username, profile photo, bio, home city, and everything in the trips and comments you post.</li>
      <li><b>Private:</b> your email address (used only for Google sign-in) and your saved list.</li>
      <li>You can delete any trip or comment you posted, or your whole account, from Settings.</li>
      <li>Photos are hosted on Cloudinary. Deleting a trip removes it from ${esc(APP.name)}, but the image files may stay on the host until cleaned up. This is a known limitation of the test version.</li>
      <li>Only post photos of people who are okay with being public.</li>
    </ul>
    <h2>Test version</h2>
    <p>This is an early build. Things may break. Use the Report option on any post that looks wrong.${APP.contactEmail ? ` Contact: <a href="mailto:${esc(APP.contactEmail)}">${esc(APP.contactEmail)}</a>.` : ''}</p>
  </div>`;
}
