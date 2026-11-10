import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface CancelBookingDialogProps {
  isOpen: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const CancelBookingDialog = ({
  isOpen,
  onConfirm,
  onCancel
}: CancelBookingDialogProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('reason_changed_mind');

  if (!isOpen) return null;

  const reasons = [
    'reason_changed_mind',
    'reason_found_another',
    'reason_not_needed',
    'reason_emergency'
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{t('cancelBooking')}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('confirmCancel')}</p>

        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-gray-500 uppercase">{t('cancellationReason')}</label>
          <div className="space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  "w-full p-3 rounded-xl text-sm font-medium text-left transition-all border",
                  reason === r
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-gray-50 dark:bg-gray-900 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {t(r)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20"
          >
            {t('cancelBooking')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
