// Shown when js/config.js has no Firebase config yet.
import { esc } from '../ui.js';
import { APP } from '../config.js';

export function setupPage() {
  document.querySelector('.shell').classList.add('bare');
  document.getElementById('view').innerHTML = `<div class="doc"><div class="card setup-card doc">
    <h1>${esc(APP.name)} isn't connected yet</h1>
    <p>The app is installed correctly, but <code>js/config.js</code> has no Firebase settings.</p>
    <ol>
      <li>Create a <b>new</b> Firebase project and add a Web app (SETUP.md steps 1–2).</li>
      <li>Paste its <code>firebaseConfig</code> values into <code>js/config.js</code>.</li>
      <li>Add your Cloudinary cloud name + unsigned preset (step 6).</li>
      <li>Commit the change. GitHub Pages redeploys in about a minute.</li>
    </ol>
  </div></div>`;
}
