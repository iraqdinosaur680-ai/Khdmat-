import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingScreenProps {
  inline?: boolean;
}

export const LoadingScreen = ({ inline }: LoadingScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-6",
      inline ? "p-12 w-full" : "fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-[9999]"
    )}>
      <div className="relative flex items-center justify-center">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full"
        />

        {/* Inner pulsing logo/icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="absolute flex items-center justify-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center">
            <Briefcase size={32} className="text-white" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-2"
      >
        <h2 className="text-3xl font-black text-primary tracking-tight">
          {t('appName')}
        </h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-1.5 h-1.5 bg-primary rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
