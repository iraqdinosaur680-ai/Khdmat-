import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'danger',
  isLoading = false
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 py-2 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50",
              type === 'danger' ? "bg-red-500" : "bg-primary"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
