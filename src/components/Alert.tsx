import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface AlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'info' | 'success' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export const Alert = ({
  isOpen,
  title,
  message,
  onClose,
  type = 'info',
  actionLabel,
  onAction
}: AlertProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
          type === 'success' ? "bg-green-100 text-green-600" :
          type === 'error' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
        )}>
          {type === 'success' ? <CheckCircle size={32} /> :
           type === 'error' ? <AlertCircle size={32} /> : <Info size={32} />}
        </div>
        <h3 className="text-2xl font-black mb-3">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg leading-relaxed">{message}</p>

        <div className="space-y-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg transition-all",
              actionLabel ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" : "bg-primary text-white shadow-lg shadow-primary/20"
            )}
          >
            {actionLabel ? t('cancel') : t('ok')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Alert;
