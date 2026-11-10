import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const touchActive = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();

  const isRtl = i18n.language?.startsWith('ar') || i18n.language?.startsWith('ku');

  // Cache latest states in refs to keep event listener declarations stable
  const stateRef = useRef({ isRefreshing, pullDistance, onRefresh });
  useEffect(() => {
    stateRef.current = { isRefreshing, pullDistance, onRefresh };
  }, [isRefreshing, pullDistance, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Safely query the nearest scrollable main container of the app
    const getMainScrollTop = (): number => {
      const mainEl = document.querySelector('main');
      return mainEl ? mainEl.scrollTop : 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (stateRef.current.isRefreshing) return;
      
      // Only permit start of pull gesture when the scrollable container is at the top
      const scrollTop = getMainScrollTop();
      if (scrollTop > 5) {
        touchActive.current = false;
        return;
      }
      
      startY.current = e.touches[0].clientY;
      touchActive.current = true;

      // Register non-passive touchmove and passive touchend/touchcancel dynamically
      el.addEventListener('touchmove', handleTouchMove, { passive: false });
      el.addEventListener('touchend', handleTouchEnd, { passive: true });
      el.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchActive.current || stateRef.current.isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Only handle pull-down gesture if swipe is downward and we are at the top
      if (diff > 0 && getMainScrollTop() <= 5) {
        // Prevent default browser bounce / pull behavior to avoid conflict
        if (e.cancelable) {
          e.preventDefault();
        }

        // Apply a smooth non-linear logarithmic styling resistance
        const resistance = 0.45;
        const dist = Math.min(diff * resistance, 90);
        setPullDistance(dist);
      } else {
        // If the finger is swiping upward (to scroll down), let nature take its course.
        // We clean up listeners to avoid scroll-blocking overhead immediately!
        cleanupDynamicListeners();
        touchActive.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      cleanupDynamicListeners();
      if (!touchActive.current || stateRef.current.isRefreshing) return;
      touchActive.current = false;

      // Access latest pullDistance from stateRef
      const currentPull = stateRef.current.pullDistance;

      // Trigger action if the pulldown crosses our optimal threshold (55px)
      if (currentPull > 55) {
        setIsRefreshing(true);
        setPullDistance(45); // Keep the loader visible at convenient height
        try {
          await stateRef.current.onRefresh();
        } catch (err) {
          console.error("[PullToRefresh] error during update:", err);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Snap back to normal
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => {
      cleanupDynamicListeners();
      touchActive.current = false;
      setPullDistance(0);
    };

    const cleanupDynamicListeners = () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      cleanupDynamicListeners();
    };
  }, []); // Only runs once on mount!

  // Translate progress metrics to rotation and size transforms
  const percent = Math.min(pullDistance / 55, 1);
  const rotation = percent * 360;
  const opacity = percent;
  const scale = 0.82 + percent * 0.18;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
    >
      {/* Pull down visual indicator circle overlay */}
      <div
        style={{
          transform: `translate3d(${isRtl ? '50%' : '-50%'}, ${pullDistance}px, 0) scale(${isRefreshing ? 1 : scale}) rotate(${isRefreshing ? 0 : rotation}deg)`,
          opacity: isRefreshing ? 1 : opacity,
          left: '50%',
          top: '-24px',
          transition: isRefreshing ? 'none' : 'transform 0.12s ease-out, opacity 0.12s ease-out'
        }}
        className="absolute z-[9999] p-2 bg-white dark:bg-zinc-900 rounded-full shadow-xl border border-gray-100/70 dark:border-zinc-800/70 flex items-center justify-center text-green-500"
      >
        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
      </div>

      {/* Main page content container translating down smoothly */}
      <div
        style={{
          transform: `translate3d(0, ${pullDistance}px, 0)`,
          transition: isRefreshing ? 'none' : 'transform 0.12s ease-out'
        }}
        className="w-full h-full origin-top"
      >
        {children}
      </div>
    </div>
  );
};
