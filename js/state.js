// Tiny global store. setState() notifies subscribers (the shell re-paints).
export const state = { user: null, profile: null, profileError: null, authReady: false };
const subs = new Set();
export function setState(patch) {
  Object.assign(state, patch);
  subs.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
}
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
