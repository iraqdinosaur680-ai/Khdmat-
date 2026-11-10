import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings } from '../types';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    supportEmail: 'support@khdmat.iq',
    supportPhone: '+964 783 271 5181',
    whatsappNumber: '9647832715181',
    becomeWorkerWhatsappNumber: '9647832715181',
    useInternalApplications: false,
    becomeWorkerWhatsappMessage: 'hi, how can i work for KHDMAT / مرحبا، كيف يمكنني العمل مع خدمات'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'app_settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    }, (error) => {
      console.error("App: app_settings snapshot error", error);
    });
    return () => unsubscribe();
  }, []);

  return settings;
};
