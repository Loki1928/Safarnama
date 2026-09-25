// Share / edit a trip.
import { icon } from '../icons.js';
import { esc, toast, cld, safeUrl, friendlyError, emptyState, MONTHS_LONG } from '../ui.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { TRIP_TYPES, TRAVEL_MODES, BREAKDOWN, PLACE_TYPES, LIMITS } from '../constants.js';
import { getPost, newPostId, createPost, updatePost, destKeyOf } from '../services/db.js';
import { uploadsConfigured, compressImage, uploadImage } from '../services/upload.js';
import { signInWall, pageHeader, spinnerHtml, errorBlock } from './common.js';

const num = (v) => { const s = String(v ?? '').replace(/[,\s₹]/g, ''); if (s === '') return null; const n = Number(s); return Number.isFinite(n) ? n : NaN; };

export async function createPage(ctx) {
  const { view } = ctx;
  if (!state.profile) { signInWall(view, 'Share your trip', 'Sign in to post a trip with real costs and help the next traveller plan honestly.'); return; }
  const editId = ctx.params.id || null;
  let existing = null;
  if (editId) {
    view.innerHTML = pageHeader('Edit trip') + spinnerHtml();
    try { existing = await getPost(editId); }
    catch (e) { if (ctx.isCurrent()) view.innerHTML = pageHeader('Edit trip') + errorBlock(e); return; }
    if (!ctx.isCurrent()) return;
    if (!existing || existing.uid !== state.profile.uid) {
      view.innerHTML = pageHeader('Edit trip') + `<div class="page-pad">${emptyState('alert', "Can't edit this trip", "It doesn't exist or isn't yours.")}</div>`;
      return;
    }
  }
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [ey, em] = (existing ? existing.month : curMonth).split('-');
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 10; y--) years.push(y);
  if (!years.includes(Number(ey))) years.push(Number(ey));
  const photos = existing ? (existing.photos || []).map(safeUrl).filter(Boolean).map((url) => ({ kind: 'url', url })) : [];
  let places = existing ? (existing.places || []).map((pl) => ({ name: pl.name || '', type: PLACE_TYPES[pl.type] ? pl.type : 'stay', cost: Number.isFinite(pl.cost) ? pl.cost : '', note: pl.note || '' })) : [];
  const sel = { tripType: existing ? existing.tripType : '', travelMode: existing ? existing.travelMode : '' };
  const bd = (existing && existing.breakdown) || {};
  const v = (k) => esc(existing ? (existing[k] ?? '') : '');
  const chips = (name, map) => `<div class="chips" data-chips="${name}" role="group">${Object.entries(map).map(([k, l]) => `<button type="button" class="chip${sel[name] === k ? ' on' : ''}" data-v="${k}" aria-pressed="${sel[name] === k}">${esc(l)}</button>`).join('')}</div>`;

  view.innerHTML = `${pageHeader(editId ? 'Edit trip' : 'Share a trip')}
  <form class="page-pad" id="tripForm" novalidate autocomplete="off">
    <section class="form-card"><h2>Photos <small>1–${LIMITS.photos} · the first is the cover</small></h2>
      <div class="photo-grid" id="photoGrid"></div>
      <input type="file" id="photoInput" accept="image/*" multiple hidden>
    </section>
    <section class="form-card"><h2>The trip</h2>
      <label class="field"><span>Title</span><input class="input" name="title" maxlength="${LIMITS.title}" placeholder="4 days in Manali on a student budget" value="${v('title')}"></label>
      <div class="row2">
        <label class="field"><span>Destination</span><input class="input" name="destination" maxlength="${LIMITS.dest}" placeholder="Manali" value="${v('destination')}"></label>
        <label class="field"><span>Travelled from</span><input class="input" name="startCity" maxlength="${LIMITS.city}" placeholder="Delhi" value="${v('startCity')}"></label>
      </div>
      <div class="row2">
        <label class="field"><span>Month</span><select class="input" name="mm">${MONTHS_LONG.map((m, i) => { const mv = String(i + 1).padStart(2, '0'); return `<option value="${mv}"${mv === em ? ' selected' : ''}>${m}</option>`; }).join('')}</select></label>
        <label class="field"><span>Year</span><select class="input" name="yyyy">${years.map((y) => `<option value="${y}"${String(y) === ey ? ' selected' : ''}>${y}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label class="field"><span>Days</span><input class="input" type="number" name="days" min="1" max="90" inputmode="numeric" placeholder="4" value="${v('days')}"></label>
        <label class="field"><span>People</span><input class="input" type="number" name="people" min="1" max="50" inputmode="numeric" placeholder="3" value="${v('people')}"></label>
      </div>
      <div class="field"><span>Trip type</span>${chips('tripType', TRIP_TYPES)}</div>
      <div class="field"><span>Getting there</span>${chips('travelMode', TRAVEL_MODES)}</div>
    </section>
    <section class="form-card"><h2>Money <small>per person, in ₹</small></h2>
      <p class="hint">Count everything from leaving home to getting back, including tickets both ways. The full number is what makes Safarnama honest.</p>
      <div class="bd-grid">${BREAKDOWN.map((b) => `<label class="field"><span><i class="dot" style="background:${b.color}"></i>${b.label} <em>${b.hint}</em></span><input class="input" name="bd_${b.key}" inputmode="numeric" placeholder="0" value="${bd[b.key] ? bd[b.key] : ''}"></label>`).join('')}</div>
      <div class="total-box"><span>Total per person</span><input class="input" name="total" inputmode="numeric" placeholder="₹" value="${v('costPerHead')}"><small class="hint" id="totalHint"></small></div>
    </section>
    <section class="form-card"><h2>The story</h2>
      <label class="field"><span>How was it? <em>(optional)</em></span><textarea class="input" name="highlights" rows="5" maxlength="${LIMITS.highlights}" placeholder="Best moments, the vibe, the route you took…">${v('highlights')}</textarea></label>
      <label class="field"><span>Tips & what you'd do differently <em>(optional)</em></span><textarea class="input" name="tips" rows="3" maxlength="${LIMITS.tips}" placeholder="Book the Volvo early, skip the tourist-trap cafés…">${v('tips')}</textarea></label>
    </section>
    <section class="form-card"><h2>Places <small>optional · up to ${LIMITS.places} · costs as you paid them</small></h2>
      <div id="placeList"></div>
      <button type="button" class="btn btn-ghost btn-sm" id="addPlace">${icon('plus', 16)} Add a place</button>
    </section>
    <section class="form-card">
      <label class="check"><input type="checkbox" name="consent"${existing ? ' checked' : ''}><span>These are real details from my own trip, and everyone recognisable in these photos is okay with them being public.</span></label>
      <button class="btn btn-primary btn-lg btn-block" id="publishBtn">${editId ? 'Save changes' : 'Publish trip'}</button>
      <p class="hint center progress" id="progress"></p>
    </section>
  </form>`;

  const form = view.querySelector('#tripForm');
  const F = (n) => form.elements.namedItem(n);
  const grid = form.querySelector('#photoGrid'), fileInput = form.querySelector('#photoInput');
  const placeList = form.querySelector('#placeList'), addBtn = form.querySelector('#addPlace');
  const totalEl = F('total'), totalHint = form.querySelector('#totalHint');
  const objectUrls = new Set();

  function renderPhotos() {
    grid.innerHTML = photos.map((ph, i) => `<div class="ph" data-pi="${i}"><img src="${esc(ph.kind === 'url' ? cld(ph.url, 300) : ph.preview)}" alt="">
      ${i === 0 ? '<span class="ph-cover">Cover</span>' : `<button type="button" class="ph-btn ph-star" data-pa="cover" aria-label="Make cover">${icon('star', 14)}</button>`}
      <button type="button" class="ph-btn ph-x" data-pa="remove" aria-label="Remove photo">${icon('x', 14)}</button></div>`).join('')
      + (photos.length < LIMITS.photos ? `<button type="button" class="ph ph-add" data-pa="add">${icon('camera', 24)}<span>${photos.length ? 'Add more' : 'Add photos'}</span></button>` : '');
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pa]');
    if (!b) return;
    if (b.dataset.pa === 'add') { fileInput.click(); return; }
    const i = Number(b.closest('[data-pi]').dataset.pi);
    if (b.dataset.pa === 'remove') {
      const [rm] = photos.splice(i, 1);
      if (rm && rm.kind === 'file') { URL.revokeObjectURL(rm.preview); objectUrls.delete(rm.preview); }
    } else if (b.dataset.pa === 'cover') {
      const [m] = photos.splice(i, 1);
      photos.unshift(m);
    }
    renderPhotos();
  });
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    let skipped = 0;
    for (const f of files) {
      if (photos.length >= LIMITS.photos || (f.type && !f.type.startsWith('image/'))) { skipped++; continue; }
      const preview = URL.createObjectURL(f);
      objectUrls.add(preview);
      photos.push({ kind: 'file', file: f, preview });
    }
    if (skipped) toast(`${skipped} file${skipped > 1 ? 's' : ''} skipped (images only, max ${LIMITS.photos}).`);
    renderPhotos();
  });

  form.querySelectorAll('[data-chips]').forEach((box) => box.addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    sel[box.dataset.chips] = c.dataset.v;
    box.querySelectorAll('[data-v]').forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
  }));

  const bdSum = () => BREAKDOWN.reduce((a, b) => { const n = num(F('bd_' + b.key).value); return a + (Number.isFinite(n) && n > 0 ? Math.round(n) : 0); }, 0);
  function syncTotal() {
    const s = bdSum();
    if (s > 0) { totalEl.value = s; totalEl.readOnly = true; totalHint.textContent = 'Adds up automatically from your breakdown.'; }
    else { totalEl.readOnly = false; totalHint.textContent = 'Fill the breakdown above, or just type the total.'; }
  }
  form.addEventListener('input', (e) => { if (e.target.name && e.target.name.startsWith('bd_')) syncTotal(); });

  function readPlaces() {
    places = Array.from(placeList.querySelectorAll('.place-row')).map((r) => ({
      name: r.querySelector('[data-f="name"]').value, type: r.querySelector('[data-f="type"]').value,
      cost: r.querySelector('[data-f="cost"]').value, note: r.querySelector('[data-f="note"]').value
    }));
  }
  function renderPlaces() {
    placeList.innerHTML = places.map((pl, i) => `<div class="place-row">
      <div class="row2"><input class="input" data-f="name" maxlength="80" placeholder="Name, e.g. Zostel Old Manali" value="${esc(pl.name)}">
      <select class="input" data-f="type">${Object.entries(PLACE_TYPES).map(([k, l]) => `<option value="${k}"${pl.type === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="row2"><input class="input" data-f="cost" inputmode="numeric" placeholder="Cost ₹ (optional)" value="${esc(pl.cost)}">
      <input class="input" data-f="note" maxlength="140" placeholder="Note, e.g. per night" value="${esc(pl.note)}"></div>
      <button type="button" class="link-btn danger" data-rm="${i}">${icon('trash', 14)} Remove</button></div>`).join('');
    addBtn.hidden = places.length >= LIMITS.places;
  }
  addBtn.addEventListener('click', () => {
    readPlaces();
    places.push({ name: '', type: 'food', cost: '', note: '' });
    renderPlaces();
    const rows = placeList.querySelectorAll('.place-row');
    rows[rows.length - 1].querySelector('[data-f="name"]').focus();
  });
  placeList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    readPlaces();
    places.splice(Number(b.dataset.rm), 1);
    renderPlaces();
  });

  renderPhotos();
  renderPlaces();
  syncTotal();

  let submitting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    readPlaces();
    const fail = (msg, el) => { toast(msg, 'err'); if (el && el.focus) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
    const title = F('title').value.trim(), destination = F('destination').value.trim(), startCity = F('startCity').value.trim();
    const destKey = destKeyOf(destination);
    const days = num(F('days').value), people = num(F('people').value);
    const month = `${F('yyyy').value}-${F('mm').value}`;
    const breakdown = {};
    let bdBad = null;
    for (const b of BREAKDOWN) {
      const n = num(F('bd_' + b.key).value);
      if (n === null) { breakdown[b.key] = 0; continue; }
      if (!Number.isFinite(n) || n < 0 || n > 10000000) { bdBad = F('bd_' + b.key); break; }
      breakdown[b.key] = Math.round(n);
    }
    const total = num(totalEl.value);
    const highlights = F('highlights').value.trim().slice(0, LIMITS.highlights), tips = F('tips').value.trim().slice(0, LIMITS.tips);

    if (!uploadsConfigured()) return fail("Photo uploads aren't set up yet. Add your Cloudinary details in js/config.js (SETUP.md step 6).");
    if (!photos.length) return fail('Add at least one photo from the trip.', grid.querySelector('.ph-add'));
    if (title.length < 3) return fail('Give your trip a title (at least 3 characters).', F('title'));
    if (destination.length < 2) return fail('Where did you go?', F('destination'));
    if (!destKey) return fail('Please write the destination in English letters, e.g. "Manali".', F('destination'));
    if (startCity.length < 2) return fail('Where did you start from? It changes the cost a lot.', F('startCity'));
    if (month > curMonth) return fail("Share trips you've already taken. The month can't be in the future.", F('mm'));
    if (!Number.isInteger(days) || days < 1 || days > 90) return fail('Days should be a whole number from 1 to 90.', F('days'));
    if (!Number.isInteger(people) || people < 1 || people > 50) return fail('People should be a whole number from 1 to 50.', F('people'));
    if (!sel.tripType) return fail('Pick a trip type.', form.querySelector('[data-chips="tripType"] .chip'));
    if (!sel.travelMode) return fail('How did you get there?', form.querySelector('[data-chips="travelMode"] .chip'));
    if (bdBad) return fail('Breakdown amounts must be numbers in ₹.', bdBad);
    const bdTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const costPerHead = bdTotal > 0 ? bdTotal : (Number.isFinite(total) ? Math.round(total) : 0);
    if (!(costPerHead >= 1 && costPerHead <= 10000000)) return fail('Enter the total cost per person in ₹.', totalEl);
    const cleanPlaces = [];
    const rows = placeList.querySelectorAll('.place-row');
    for (let i = 0; i < places.length; i++) {
      const pl = places[i], name = pl.name.trim();
      if (!name) {
        if (pl.note.trim() || String(pl.cost).trim()) return fail('Each place needs a name (or remove the row).', rows[i].querySelector('[data-f="name"]'));
        continue;
      }
      const c = num(pl.cost);
      if (c !== null && (!Number.isFinite(c) || c < 0 || c > 10000000)) return fail(`Cost for "${name}" should be a number.`, rows[i].querySelector('[data-f="cost"]'));
      cleanPlaces.push({ name: name.slice(0, 80), type: PLACE_TYPES[pl.type] ? pl.type : 'stay', cost: c === null ? null : Math.round(c), note: pl.note.trim().slice(0, 140) });
    }
    if (!F('consent').checked) return fail('Please confirm the details are real and you have consent for the photos.', F('consent'));

    submitting = true;
    const btn = form.querySelector('#publishBtn'), prog = form.querySelector('#progress');
    btn.disabled = true;
    btn.textContent = editId ? 'Saving…' : 'Publishing…';
    try {
      const toUpload = photos.filter((ph) => ph.kind === 'file');
      let k = 0;
      for (const ph of toUpload) {
        k++;
        prog.textContent = `Preparing photo ${k} of ${toUpload.length}…`;
        const blob = await compressImage(ph.file);
        const url = await uploadImage(blob, (r) => { prog.textContent = `Uploading photo ${k} of ${toUpload.length} · ${Math.round(r * 100)}%`; });
        URL.revokeObjectURL(ph.preview);
        objectUrls.delete(ph.preview);
        ph.kind = 'url'; ph.url = url; delete ph.file; delete ph.preview;
      }
      renderPhotos();
      prog.textContent = 'Saving your trip…';
      const me = state.profile;
      const data = {
        authorName: me.name, authorUsername: me.username, authorPhoto: (me.photoURL || '').slice(0, 500) === me.photoURL ? (me.photoURL || '') : '',
        title: title.slice(0, LIMITS.title), destination: destination.slice(0, LIMITS.dest), destKey, startCity: startCity.slice(0, LIMITS.city), month,
        days, people, tripType: sel.tripType, travelMode: sel.travelMode, costPerHead, breakdown,
        highlights, tips, places: cleanPlaces, photos: photos.map((ph) => ph.url), source: 'manual'
      };
      let id = editId;
      if (editId) await updatePost(editId, data);
      else { id = newPostId(); await createPost(id, { uid: me.uid, ...data }); }
      toast(editId ? 'Trip updated' : 'Your trip is live 🎉', 'ok');
      navigate('/post/' + id);
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), 'err');
      prog.textContent = '';
      btn.disabled = false;
      btn.textContent = editId ? 'Save changes' : 'Publish trip';
      submitting = false;
    }
  });
  return () => { objectUrls.forEach((u) => URL.revokeObjectURL(u)); objectUrls.clear(); };
}
