import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSelectionPopupProps {
  onComplete: (lang: string) => void;
}

export const LanguageSelectionPopup = ({ onComplete }: LanguageSelectionPopupProps) => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (lang: string) => {
    setLoading(true);
    i18n.changeLanguage(lang);
    await onComplete(lang);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">اختر اللغة / Select Language / زمان هەڵبژێرە</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Please select your preferred language</p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelect('ar')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            العربية
          </button>
          <button
            onClick={() => handleSelect('en')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            English
          </button>
          <button
            onClick={() => handleSelect('ku')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            كوردى
          </button>
        </div>
      </motion.div>
    </div>
  );
};
