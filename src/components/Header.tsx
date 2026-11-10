import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, MapPin, Moon, Sun, Globe, ShieldCheck, LogOut } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../AuthContext';
import { WorkerProfile } from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export const Header = ({ darkMode, setDarkMode }: HeaderProps) => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [workerData, setWorkerData] = useState<WorkerProfile | null>(null);
  const [toggling, setToggling] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleToggleAvailability = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    const currentStatus = workerData ? workerData.isAvailable !== false : true;
    try {
      await setDoc(doc(db, 'workers', profile.uid), {
        isAvailable: !currentStatus
      }, { merge: true });
    } catch (error) {
      console.error("Header: Error toggling availability:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'workers');
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'worker' && profile.uid) {
      const unsubscribe = onSnapshot(doc(db, 'workers', profile.uid), (docSnap) => {
        if (docSnap.exists()) {
          setWorkerData(docSnap.data() as WorkerProfile);
        }
      }, (error) => {
        console.error("App: workerData dashboard snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const toggleLanguage = async () => {
    const langs = ['ar', 'en', 'ku'];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    const newLang = langs[nextIndex];
    i18n.changeLanguage(newLang);

    if (profile?.uid) {
      try {
        await setDoc(doc(db, 'users', profile.uid), { language: newLang }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-10 h-10 rounded-full border-2 border-primary object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {profile?.name?.charAt(0)}
            </div>
          )}
          {profile?.role === 'worker' && workerData && (
            <div className={cn(
              "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800",
              workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
            )} />
          )}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-none">{profile?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {t(profile?.city || '')}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2">{t('appName')}</h1>

      <div className="flex items-center gap-2">
        {profile?.role === 'worker' && (
          <button
            onClick={handleToggleAvailability}
            disabled={toggling}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
              (!workerData || workerData.isAvailable !== false)
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              (!workerData || workerData.isAvailable !== false) ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-[10px] font-bold uppercase hidden xs:block">
              {(!workerData || workerData.isAvailable !== false) ? t('available') : t('unavailable')}
            </span>
            {toggling && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          </button>
        )}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <Settings size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black bg-opacity-20 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-16 right-4 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-4 z-50"
            >
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> {t('settings')}</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">{darkMode ? <Moon size={18} /> : <Sun size={18} />} {t('darkMode')}</span>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      darkMode ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      darkMode ? "translate-x-7" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Globe size={18} /> {t('language')}</span>
                  <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold"
                  >
                    {i18n.language === 'ar' ? 'العربية' : i18n.language === 'en' ? 'English' : 'كوردى'}
                  </button>
                </div>

                {profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 bg-primary/10 text-primary flex items-center justify-center gap-2 rounded-lg font-bold hover:bg-primary/20 transition-colors"
                  >
                    <ShieldCheck size={18} /> {t('adminDashboard')}
                  </Link>
                )}

                <button
                  onClick={async () => {
                    if (isLoggingOut) return;
                    setIsLoggingOut(true);
                    try {
                      await signOut(auth);
                    } catch (e) {
                      console.error("Sign out error:", e);
                    } finally {
                      setIsLoggingOut(false);
                    }
                  }}
                  disabled={isLoggingOut}
                  className="w-full py-2 mt-2 text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogOut size={18} /> {t('logout')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
