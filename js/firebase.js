// One place that loads Firebase (pinned version) and re-exports what the app uses.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  reauthenticateWithPopup, deleteUser
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query,
  where, orderBy, limit, startAfter, writeBatch, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup, signOut, onAuthStateChanged, reauthenticateWithPopup, deleteUser,
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy,
  limit, startAfter, writeBatch, serverTimestamp, increment
};
