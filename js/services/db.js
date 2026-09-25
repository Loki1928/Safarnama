// All Firestore reads/writes. Shapes here must match firestore.rules.
import {
  db, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where,
  orderBy, limit, startAfter, writeBatch, serverTimestamp, increment
} from '../firebase.js';

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
export function destKeyOf(s = '') {
  return String(s).split(',')[0].toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
}
const ts = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : Date.now());
const toPost = (snap) => {
  const d = snap.data();
  return { id: snap.id, ...d, createdAt: ts(d.createdAt), updatedAt: d.updatedAt ? ts(d.updatedAt) : null };
};
const byNewest = (a, b) => b.createdAt - a.createdAt;

/* ---------- users ---------- */
export async function getProfile(uid) {
  const s = await getDoc(doc(db, 'users', uid));
  return s.exists() ? { ...s.data(), createdAt: ts(s.data().createdAt) } : null;
}
export async function getProfileByUsername(username) {
  const u = String(username || '').toLowerCase();
  if (!USERNAME_RE.test(u)) return null;
  const s = await getDoc(doc(db, 'usernames', u));
  return s.exists() ? getProfile(s.data().uid) : null;
}
export async function isUsernameFree(u) { return !(await getDoc(doc(db, 'usernames', u))).exists(); }
export async function createProfile({ uid, username, name, homeCity, photoURL }) {
  const b = writeBatch(db);
  b.set(doc(db, 'usernames', username), { uid });
  b.set(doc(db, 'users', uid), { uid, username, name, photoURL: photoURL || '', bio: '', homeCity: homeCity || '', createdAt: serverTimestamp() });
  await b.commit();
}
export const updateProfile = (uid, patch) => updateDoc(doc(db, 'users', uid), patch);

/* ---------- posts ---------- */
const PAGE = 10;
export async function feedPage(cursor = null) {
  const parts = [orderBy('createdAt', 'desc')];
  if (cursor) parts.push(startAfter(cursor));
  parts.push(limit(PAGE));
  const snap = await getDocs(query(collection(db, 'posts'), ...parts));
  return { items: snap.docs.map(toPost), cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor, done: snap.docs.length < PAGE };
}
export async function recentPosts(n = 60) {
  const s = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(n)));
  return s.docs.map(toPost);
}
export async function postsByDest(key) {
  const s = await getDocs(query(collection(db, 'posts'), where('destKey', '==', key), limit(100)));
  return s.docs.map(toPost).sort(byNewest);
}
export async function postsByUser(uid, n = 100) {
  const s = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid), limit(n)));
  return s.docs.map(toPost).sort(byNewest);
}
export async function getPost(id) {
  const s = await getDoc(doc(db, 'posts', id));
  return s.exists() ? toPost(s) : null;
}
export const newPostId = () => doc(collection(db, 'posts')).id;
export const createPost = (id, data) => setDoc(doc(db, 'posts', id), { ...data, likeCount: 0, createdAt: serverTimestamp() });
export const updatePost = (id, data) => updateDoc(doc(db, 'posts', id), { ...data, updatedAt: serverTimestamp() });
export const deletePost = (id) => deleteDoc(doc(db, 'posts', id));

/* ---------- likes (post counter + like doc change together) ---------- */
export async function hasLiked(postId, uid) { return (await getDoc(doc(db, 'posts', postId, 'likes', uid))).exists(); }
export async function setLike(postId, uid, on) {
  const b = writeBatch(db);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  const postRef = doc(db, 'posts', postId);
  if (on) { b.set(likeRef, { createdAt: serverTimestamp() }); b.update(postRef, { likeCount: increment(1) }); }
  else { b.delete(likeRef); b.update(postRef, { likeCount: increment(-1) }); }
  await b.commit();
}

/* ---------- saved (private) ---------- */
export async function isSaved(uid, postId) { return (await getDoc(doc(db, 'users', uid, 'saved', postId))).exists(); }
export async function setSaved(uid, postId, on) {
  const ref = doc(db, 'users', uid, 'saved', postId);
  if (on) await setDoc(ref, { savedAt: serverTimestamp() }); else await deleteDoc(ref);
}
export async function savedPosts(uid) {
  const s = await getDocs(query(collection(db, 'users', uid, 'saved'), orderBy('savedAt', 'desc'), limit(60)));
  const posts = await Promise.all(s.docs.map((d) => getPost(d.id).catch(() => null)));
  return posts.filter(Boolean);
}

/* ---------- comments ---------- */
export async function listComments(postId) {
  const s = await getDocs(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200)));
  return s.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: ts(d.data().createdAt) }));
}
export async function addComment(postId, profile, text) {
  const ref = doc(collection(db, 'posts', postId, 'comments'));
  await setDoc(ref, { uid: profile.uid, name: profile.name, username: profile.username, photo: profile.photoURL || '', text, createdAt: serverTimestamp() });
}
export const deleteComment = (postId, cid) => deleteDoc(doc(db, 'posts', postId, 'comments', cid));

/* ---------- reports ---------- */
export const reportPost = (postId, uid, reason, note) =>
  setDoc(doc(collection(db, 'reports')), { postId, uid, reason, note, createdAt: serverTimestamp() });

/* ---------- account deletion ---------- */
export async function deleteAccountData(profile) {
  for (;;) {
    const mine = await postsByUser(profile.uid, 50);
    if (!mine.length) break;
    for (const p of mine) await deleteDoc(doc(db, 'posts', p.id));
  }
  const saved = await getDocs(collection(db, 'users', profile.uid, 'saved'));
  for (const s of saved.docs) await deleteDoc(s.ref);
  const b = writeBatch(db);
  b.delete(doc(db, 'usernames', profile.username));
  b.delete(doc(db, 'users', profile.uid));
  await b.commit();
}
