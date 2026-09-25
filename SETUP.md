# Safarnama — setup (about 20 minutes, one time)

Safarnama uses its **own Firebase project**. Do **not** reuse `wayfare-cddcd`: Wayfare keeps running untouched.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** → name it `safarnama`.
2. Google Analytics: optional (you can turn it off).
3. You stay on the free **Spark** plan. No card is needed and there are no surprise bills.

## 2. Add a Web app and copy its config
1. Project Overview → click the **`</>`** (Web) icon → nickname `safarnama-web` → Register. Hosting is not needed.
2. Copy the `firebaseConfig = { ... }` block it shows.
3. Paste it into the package page (or later into `js/config.js`).

## 3. Turn on Google sign-in
Build → **Authentication** → Get started → **Sign-in method** → **Google** → Enable → choose a support email → Save.

## 4. Allow your website to sign in
Authentication → **Settings** → **Authorized domains** → Add domain → `loki1928.github.io`
(`localhost` is already there for local testing.)

## 5. Create the database and publish the rules
1. Build → **Firestore Database** → Create database.
2. Location: **asia-south1 (Mumbai)**. This can't be changed later.
3. Start in **production mode**.
4. Open the **Rules** tab, delete everything, paste the full contents of `firestore.rules`, and click **Publish**.

No indexes need to be created by hand. If the browser console ever prints a Firebase link saying an index is required, click it once.

## 6. Cloudinary (photos)
You already have a Cloudinary account from Wayfare (`ddtrgzata`). Reuse it with a **new preset**:
1. Cloudinary console → Settings (gear) → **Upload** → **Upload presets** → **Add upload preset**.
2. Preset name: `safarnama_unsigned` · Signing mode: **Unsigned** · Folder: `safarnama`.
3. Recommended, if you see these options: allowed formats `jpg,png,webp`; max file size about 10 MB.
4. Save. Put the cloud name + preset name in `js/config.js`.

Note: an unsigned preset is visible in page source, so anyone could upload to it. That's acceptable for a test. Restrict formats and size (step 3) before sharing widely.

## 7. Deploy on GitHub Pages
1. Create a new public repo named `Safarnama`.
2. **Add file → Upload files**. Unzip `safarnama.zip` and drag the **contents** of the `safarnama` folder (index.html, css, js, SETUP.md, firestore.rules, the progress file) into the upload box. Commit.
3. Settings → **Pages** → Deploy from branch → `main` / `(root)` → Save.
4. After about a minute it's live at **https://loki1928.github.io/Safarnama/**

Local test (optional): in the folder run `npx serve` or `python -m http.server 8000`, then open http://localhost:8000. Opening index.html by double-click will **not** work (ES modules need a server).

## 8. Test checklist (you + your roommate)
- [ ] Open on phone in Chrome/Safari (not inside the Instagram app browser) → Sign in with Google → create username.
- [ ] Share a trip with 3 photos, a breakdown and 2 places → it opens on its own page → it shows on Home.
- [ ] Roommate signs in: likes, comments, saves your trip. The like count moves by exactly 1.
- [ ] Explore → search your destination → the "Real numbers" card appears.
- [ ] Edit your trip (swap the cover photo) → the "edited" marker appears.
- [ ] Report a post → Firebase console → Firestore → `reports` shows it.
- [ ] Delete a comment, delete a trip.
- [ ] With a spare Google account: Settings → Delete account.
- [ ] Anything broken → open the browser console (desktop: F12), copy the red error, and bring it to the next session.
