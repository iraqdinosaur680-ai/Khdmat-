import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { SUGGESTED_TAGS } from '../mockData';
import { cn } from '../lib/utils';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string, tags: string[]) => void;
  workerName: string;
}

const RatingModal = ({ isOpen, onClose, onSubmit, workerName }: RatingModalProps) => {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{t('rateWorker')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{workerName}</p>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                size={32}
                fill={star <= rating ? "#EAB308" : "none"}
                className={star <= rating ? "text-yellow-500" : "text-gray-300"}
              />
            </button>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
            {i18n.language === 'ar' ? 'ما الذي أعجبك؟' : i18n.language === 'ku' ? 'چی سەرنجی ڕاکێشایت؟' : 'What went well?'}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {SUGGESTED_TAGS.map(tag => {
              const label = i18n.language === 'ar' ? tag.ar : i18n.language === 'ku' ? tag.ku : tag.en;
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTags(prev => prev.filter(t => t !== tag.id));
                    } else {
                      setSelectedTags(prev => [...prev, tag.id]);
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 border-primary text-primary font-semibold"
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={t('writeReview')}
          className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-24 resize-none mb-6 text-sm"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onSubmit(rating, review, selectedTags)}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
          >
            {t('submitRating')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RatingModal;
