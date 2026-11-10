import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentSingleTabManager,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwningTab: true }),
  }),
}, firebaseConfig.firestoreDatabaseId);

export async function getDocWithCacheFallback(docRef: any) {
  try {
    return await getDoc(docRef);
  } catch (err: any) {
    console.warn("getDoc server request failed, attempting local cache fallback:", err);
    try {
      return await getDocFromCache(docRef);
    } catch (cacheErr) {
      console.error("Local cache lookup failed:", cacheErr);
      throw err;
    }
  }
}

export async function getDocsWithCacheFallback(q: any) {
  try {
    return await getDocs(q);
  } catch (err: any) {
    console.warn("getDocs server request failed, attempting local cache fallback:", err);
    try {
      return await getDocsFromCache(q);
    } catch (cacheErr) {
      console.error("Local cache query lookup failed:", cacheErr);
      throw err;
    }
  }
}

export { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocFromServer, deleteDoc, limit, updateDoc, writeBatch, getDocs, orderBy, or } from 'firebase/firestore';
export { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, RecaptchaVerifier, linkWithPhoneNumber, linkWithCredential, PhoneAuthProvider, GoogleAuthProvider, signInWithCredential, signInWithPhoneNumber, updatePassword, updateProfile } from 'firebase/auth';
