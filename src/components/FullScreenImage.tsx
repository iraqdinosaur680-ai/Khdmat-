import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface FullScreenImageProps {
  src: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FullScreenImage = ({
  src,
  isOpen,
  onClose
}: FullScreenImageProps) => {
  if (!isOpen || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="Full screen"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 md:top-4 md:right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
};
