// Sign-in helpers. The Google popup must open inside the user's click, so every
// sign-in button carries data-signin and app.js handles it synchronously.
import { openModal, esc, toast } from './ui.js';
import { googleLogo } from './icons.js';
import { signInWithGoogle, authErrorMessage } from './services/auth.js';

let busy = false;
export async function doSignIn() {
  if (busy) return;
  busy = true;
  try { await signInWithGoogle(); }
  catch (e) { toast(authErrorMessage(e), 'err'); }
  finally { busy = false; }
}
export function requireAuth(reason = 'continue') {
  return openModal({
    title: 'Join Safarnama',
    body: `<p>Sign in to ${esc(reason)}. One tap with Google. We never post anything on your behalf.</p>
      <button type="button" class="btn btn-google btn-block btn-lg" data-signin data-close>${googleLogo} Continue with Google</button>`,
    actions: [{ label: 'Not now', value: null }]
  });
}
