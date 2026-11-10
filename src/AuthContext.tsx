import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('cached_profile');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    // Global safety net: if onAuthStateChanged never fires (Capacitor cold start issue),
    // unblock the app after 1.8 seconds for instant feel
    const globalTimer = setTimeout(() => {
      console.warn('[AuthContext] Global timeout — onAuthStateChanged never fired');
      setLoading(false);
      setIsAuthReady(true);
    }, 1800);

    const markReady = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      setLoading(false);
      setIsAuthReady(true);
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(globalTimer);
      setUser(firebaseUser);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      if (firebaseUser) {
        localStorage.setItem('has_logged_in_user', 'true');
        
        // Match cached profile if it belongs to this UID
        let hasCachedValidProfile = false;
        try {
          const cached = localStorage.getItem('cached_profile');
          if (cached) {
            const cachedData = JSON.parse(cached) as UserProfile;
            if (cachedData && cachedData.uid === firebaseUser.uid && cachedData.city && cachedData.phoneVerified) {
              setProfile(cachedData);
              hasCachedValidProfile = true;
            }
          }
        } catch (e) {
          console.error('[AuthContext] Profile cache deserialization error:', e);
        }

        if (hasCachedValidProfile) {
          // Instantly unblock the loading spinner if we have a valid cache
          setLoading(false);
          setIsAuthReady(true);
        } else {
          // Fallback: if Firestore never responds within 1.2s, unblock the app anyway for instant rendering
          fallbackTimer = setTimeout(() => {
            console.warn('[AuthContext] Firestore timeout — unblocking app');
            setLoading(false);
            setIsAuthReady(true);
          }, 1200);
        }

        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(docRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile(data);
            localStorage.setItem('cached_profile', JSON.stringify(data));
            localStorage.setItem('has_logged_in_user', 'true');
            markReady();
          } else {
            // Guard: If auth has already changed or user signed out, don't execute Firestore queries
            if (!auth.currentUser || auth.currentUser.uid !== firebaseUser.uid) {
              setProfile(null);
              localStorage.removeItem('cached_profile');
              markReady();
              return;
            }

            // FALLBACK: If document with this UID doesn't exist, check if there's an account with this phone number
            // This happens when a user resets their password via phone OTP (different UID)
            const userPhone = firebaseUser.phoneNumber;
            if (userPhone) {
              try {
                if (!auth.currentUser || auth.currentUser.uid !== firebaseUser.uid) {
                  setProfile(null);
                  markReady();
                  return;
                }
                // Try multiple formats: raw, without +, 0 prefix, and 964 prefix
                const digits = userPhone.replace(/\D/g, '');
                const variants = [
                  digits,
                  digits.startsWith('964') ? digits : '964' + (digits.startsWith('0') ? digits.slice(1) : digits), // 964...
                  digits.startsWith('964') ? '0' + digits.slice(3) : (digits.startsWith('0') ? digits : '0' + digits), // 0...
                  digits.startsWith('964') ? digits.slice(3) : (digits.startsWith('0') ? digits : '0' + digits), // 77...
                  userPhone // original (+964...)
                ];
                
                const uniqueVariants = Array.from(new Set(variants.filter(Boolean)));
                let phoneSnap = null;
                if (uniqueVariants.length > 0 && auth.currentUser) {
                  const q = query(collection(db, 'users'), where('phone', 'in', uniqueVariants), limit(1));
                  const s = await getDocs(q);
                  if (!s.empty) {
                    phoneSnap = s;
                  }
                }
                
                if (phoneSnap && !phoneSnap.empty && auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
                  const existingDoc = phoneSnap.docs[0];
                  const data = existingDoc.data() as UserProfile;
                  console.log('[AuthContext] Found account via phone fallback, migrating to new UID');
                  
                  const newProfileData: UserProfile = {
                    ...data,
                    uid: firebaseUser.uid,
                    name: data.name || firebaseUser.displayName || 'User',
                    city: data.city || 'Erbil',
                    role: (data.role as any) || 'user',
                    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
                    updatedAt: Date.now()
                  };

                  await setDoc(doc(db, 'users', firebaseUser.uid), newProfileData);
                  
                  setProfile(newProfileData);
                  localStorage.setItem('cached_profile', JSON.stringify(newProfileData));
                  localStorage.setItem('has_logged_in_user', 'true');
                  markReady();
                  return;
                }
              } catch (err) {
                console.warn('[AuthContext] Phone fallback notice (non-fatal):', err);
              }
            } else if (firebaseUser.email) {
              // Fallback for email accounts (deterministic ones)
              try {
                if (!auth.currentUser || auth.currentUser.uid !== firebaseUser.uid) {
                  setProfile(null);
                  markReady();
                  return;
                }
                const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email), limit(1));
                const emailSnap = await getDocs(emailQuery);
                if (!emailSnap.empty && auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
                  const existingDoc = emailSnap.docs[0];
                  const data = existingDoc.data() as UserProfile;
                  console.log('[AuthContext] Found account via email fallback, migrating to new UID');
                  
                  const newProfileData: UserProfile = {
                    ...data,
                    uid: firebaseUser.uid,
                    name: data.name || firebaseUser.displayName || 'User',
                    city: data.city || 'Erbil',
                    role: (data.role as any) || 'user',
                    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
                    updatedAt: Date.now()
                  };

                  await setDoc(doc(db, 'users', firebaseUser.uid), newProfileData);
                  
                  setProfile(newProfileData);
                  localStorage.setItem('cached_profile', JSON.stringify(newProfileData));
                  localStorage.setItem('has_logged_in_user', 'true');
                  markReady();
                  return;
                }
              } catch (err) {
                console.warn('[AuthContext] Email fallback notice (non-fatal):', err);
              }
            }
            
            setProfile(null);
            localStorage.removeItem('cached_profile');
            markReady();
          }
        }, (error) => {
          console.warn('[AuthContext] Profile snapshot notice (non-fatal):', error);
          markReady();
        });
      } else {
        setProfile(null);
        localStorage.removeItem('cached_profile');
        localStorage.removeItem('has_logged_in_user');
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      clearTimeout(globalTimer);
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
