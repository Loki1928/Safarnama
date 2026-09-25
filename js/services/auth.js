// Google sign-in via Firebase Auth (popup only; redirect breaks on GitHub Pages
// in browsers that block third-party storage).
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, reauthenticateWithPopup, deleteUser } from '../firebase.js';

const QUIET = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

export async function signInWithGoogle() {
  try { await signInWithPopup(auth, googleProvider); return true; }
  catch (e) { if (QUIET.has(e.code)) return false; throw e; }
}
export const logout = () => signOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export async function deleteAuthUser() {
  const u = auth.currentUser;
  if (!u) return;
  try { await deleteUser(u); }
  catch (e) {
    if (e.code === 'auth/requires-recent-login') { await reauthenticateWithPopup(u, googleProvider); await deleteUser(u); }
    else throw e;
  }
}
export function authErrorMessage(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/unauthorized-domain') return "This website isn't in Firebase's Authorized domains yet (SETUP.md step 4).";
  if (c === 'auth/operation-not-allowed' || c === 'auth/configuration-not-found') return "Google sign-in isn't enabled in Firebase yet (SETUP.md step 3).";
  if (c === 'auth/popup-blocked') return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
  if (c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported') return 'Sign-in doesn\'t work inside this in-app browser. Open the link in Chrome or Safari.';
  if (c === 'auth/network-request-failed') return 'Network problem. Check your connection and try again.';
  if (c === 'auth/too-many-requests') return 'Too many attempts. Wait a minute and try again.';
  return (e && e.message) || 'Sign-in failed.';
}
