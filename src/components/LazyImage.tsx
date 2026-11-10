import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  fallbackText?: string;
}

export default function LazyImage({
  src,
  alt = '',
  className = '',
  placeholderClassName = '',
  referrerPolicy = 'no-referrer',
  onClick,
  fallbackText = '👤'
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className} flex items-center justify-center`}>
      {/* Visual placeholder skeleton */}
      <AnimatePresence>
        {!loaded && !error && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 bg-gray-200 dark:bg-zinc-800 animate-pulse flex items-center justify-center ${placeholderClassName}`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin-slow opacity-40" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error fallback */}
      {error ? (
        <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-gray-400">
          {fallbackText}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy={referrerPolicy}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onClick={onClick}
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ contentVisibility: 'auto' }}
        />
      )}
    </div>
  );
}
