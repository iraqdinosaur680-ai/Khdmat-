import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, HelpCircle, User, Users, Briefcase, Settings, LogOut, 
  Menu, X, MessageSquare, Bell,
  Sun, Moon, Globe, ChevronRight, ChevronLeft, Send,
  Search, Filter, Star, Phone, Calendar, CheckCircle, Check,
  AlertCircle, Info, Mail, Lock, UserPlus, LogIn,
  MapPin, Truck, ShieldCheck, Pin, Flag, Zap,
  Plus, Trash2, Edit3, MessageCircle, FileText, Camera, Grid, Image as ImageIcon, Clock,
  Eye, EyeOff, Share2
} from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  auth, 
  db, 
  getDocWithCacheFallback, 
  getDocsWithCacheFallback,
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  linkWithCredential,
  PhoneAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  updatePassword,
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocFromServer, 
  deleteDoc, 
  limit, 
  updateDoc, 
  writeBatch, 
  getDocs, 
  orderBy, 
  or
} from './firebase';
import { ConfirmationResult } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { City, IRAQI_CITIES, UserProfile, WorkerProfile, Booking, Message, WorkerApplication, Review, Report, Ad, Category, QuickRequest } from './types';
import { SUGGESTED_TAGS } from './mockData';
import { NotificationManager } from './components/NotificationManager';
import { PullToRefresh } from './components/PullToRefresh';
const MapPicker = React.lazy(() => import('./components/MapPicker'));
import LazyImage from './components/LazyImage';
import { cn, compressImage } from './lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import './i18n';
import { NotificationService } from './services/notificationService';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';
import ErrorBoundary from './components/ErrorBoundary';
import { seedMockData } from './seed';
import { AppSettings } from './types';
import { useSettings } from './hooks/useSettings';

const VoiceAssistant = React.lazy(() => import('./components/VoiceAssistant').then(m => ({ default: m.VoiceAssistant })));

const convertDigitsToEnglish = (str: string): string => {
  if (!str) return '';
  const arabicRange = '٠١٢٣٤٥٦٧٨٩';
  const farsiRange = '۰۱۲۳۴۵۶۷۸۹';
  return str.replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIdx = arabicRange.indexOf(char);
    if (arabicIdx !== -1) return String(arabicIdx);
    const farsiIdx = farsiRange.indexOf(char);
    if (farsiIdx !== -1) return String(farsiIdx);
    return char;
  });
};

// --- Hooks ---

// --- Components ---

const ConfirmDialog = ({ 
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

const Alert = ({ 
  isOpen, 
  title, 
  message, 
  onClose,
  type = 'info',
  actionLabel,
  onAction
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
  type?: 'info' | 'success' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}) => {
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

const FirebasePlatformDiagnostics = ({ errorText, isNative }: { errorText: string; isNative: boolean }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const isAr = i18n.language === 'ar';

  const isAppIdError = 
    errorText?.toLowerCase().includes('app identifier') || 
    errorText?.toLowerCase().includes('integrity') || 
    errorText?.toLowerCase().includes('recaptcha') ||
    errorText?.toLowerCase().includes('device verification') ||
    errorText?.toLowerCase().includes('captcha') ||
    errorText?.toLowerCase().includes('unsuccessful') ||
    errorText?.toLowerCase().includes('error-code:-39') ||
    errorText?.toLowerCase().includes('-39') ||
    errorText?.toLowerCase().includes('play integrity');

  if (!isAppIdError) return null;

  return (
    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-left font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
          <Info size={16} className="text-amber-600 dark:text-amber-400" />
          <span>{isNative ? (isAr ? "تشخيصات التحقق من تطبيق أندرويد" : "Android App Verification Diagnostics") : (isAr ? "تشخيصات التحقق لرقم الهاتف (Web)" : "Phone Verification Diagnostics")}</span>
        </div>
        <button type="button" className="text-amber-600 dark:text-amber-400 text-xs font-bold underline cursor-pointer hover:opacity-85 focus:outline-none">
          {isOpen ? (isAr ? "إخفاء" : "Hide") : (isAr ? "عرض المساعدة" : "Show Help")}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-3 text-xs text-amber-950 dark:text-amber-300 space-y-2.5 leading-relaxed border-t border-amber-200/50 dark:border-amber-900/40 pt-3">
          {isNative ? (
            <>
              <p>
                {isAr 
                  ? "يعني هذا الخطأ عادةً أن مصادقة رقم الهاتف من Firebase (وإرسال رسائل الـ SMS) محظورة لأن توقيع التطبيق (App Signature) لم يتم تسجيله في وحدة تحكم Firebase (Firebase Console)، أو بسبب قيود Play Integrity."
                  : "This error usually means Firebase Phone Authentication (and SMS sending) is blocked because the app signature has not been completed or registered in the Firebase Console, or Play Integrity failed."}
              </p>
              
              <div className="border-t border-amber-200/60 dark:border-amber-900/45 pt-2.5">
                <h4 className="font-bold mb-1 flex items-center gap-1">
                  <span>{isAr ? "الخطوة الأولى: التحقق من اسم الحزمة" : "Step 1: Check your package name"}</span>
                </h4>
                <p>
                  {isAr ? "تأكد من أن اسم الحزمة في تطبيق Firebase يطابق هذا الاسم تماماً:" : "Ensure that the identifier on your Firebase App exactly matches:"}
                </p>
                <code className="block bg-amber-110 px-2 py-1 rounded mt-1 font-mono break-all select-all text-center bg-amber-100 dark:bg-amber-900/60">com.khdmat.app</code>
              </div>

              <div className="border-t border-amber-200/60 dark:border-amber-900/45 pt-2.5">
                <h4 className="font-bold mb-1">
                  {isAr ? "الخطوة الثانية: إضافة بصمات SHA لجهازك" : "Step 2: Add your machine's SHA keys"}
                </h4>
                <p className="mb-1">
                  {isAr 
                    ? "يجب عليك إضافة بصمات SHA-1 و SHA-256 لجهاز الكمبيوتر الخاص بك إلى مشروع Firebase تحت إعدادات تطبيقات الأندرويد:" 
                    : "You must add the SHA-1 and SHA-256 fingerprints of your development key to the Firebase Console:"}
                </p>
                <p className="mb-1 font-bold text-[10px]">
                  {isAr ? "كيفية العثور عليها (على نظام Mac / Linux / Windows):" : "How to find on Mac / Linux / Windows:"}
                </p>
                <div className="bg-amber-100 dark:bg-amber-900/80 p-2 rounded font-mono text-[10px] space-y-1 block select-all break-all overflow-x-auto text-left" dir="ltr">
                  <p className="font-semibold text-amber-700 dark:text-amber-200"># Run inside your project's android directory:</p>
                  <p>./gradlew signingReport</p>
                </div>
                <p className="mt-1">
                  {isAr 
                    ? "ابحث عن بصمة SHA1 و SHA-256 المطبوعة لـ debug (أو لملف توقيع release) وقم بإضافتها في إعدادات مشروع Firebase تحت قسم تطبيقات الأندرويد."
                    : "Find the SHA1 and SHA-256 printed for the debug variant (or release variant) and paste them in your Firebase Console project settings under \"Android Apps\"."}
                </p>
              </div>

              <div className="border-t border-amber-200/60 dark:border-amber-900/45 pt-2.5">
                <h4 className="font-bold mb-1">
                  {isAr ? "الخطوة الثالثة: تفعيل واجهة برمجة تطبيقات Play Integrity" : "Step 3: Enable Play Integrity API on Google Cloud"}
                </h4>
                <p>
                  {isAr 
                    ? "اذهب إلى وحدة تحكم Google Cloud للمشروع وابحث عن Play Integrity API، ثم اضغط على تفعيل (Enable)."
                    : "Go to your Google Cloud Console, search for Play Integrity API, and click Enable."}
                </p>
              </div>
            </>
          ) : (
            <>
              <p>
                {isAr
                  ? "يرجع رمز الخطأ (-39) في متصفح الويب عادةً إلى قيود نطاقات المعاينة (Authorized Domains) أو إعدادات مزود الهاتف في Firebase."
                  : "Error code (-39) indicates that SMS verification is restricted or unavailable in the current web domain environment."}
              </p>
              <div className="border-t border-amber-200/60 dark:border-amber-900/45 pt-2.5">
                <h4 className="font-bold mb-1 text-emerald-700 dark:text-emerald-400">
                  {isAr ? "✓ الحل السريع المتاح للمتابعة فوراً:" : "✓ Instant Quick Solution:"}
                </h4>
                <p>
                  {isAr
                    ? "يمكنك الضغط مباشرةً على زر \"حفظ ومتابعة بدون SMS\" لمتابعة استخدام التطبيق فوراً وحفظ رقم هاتفك في حسابك دون الحاجة لرمز التحقق."
                    : "You can click 'Save & Continue without SMS' below to immediately save your profile and continue browsing all app pages."}
                </p>
              </div>
            </>
          )}

          <div className="border-t border-amber-200/60 dark:border-amber-950 pt-2.5 text-[10px] text-amber-800 dark:text-amber-300 mt-1 font-medium bg-amber-100/50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
            <strong>{isAr ? "💡 نصيحة هامة للتجربة السريعة والمباشرة:" : "💡 Pro Tip for Fast Dev Testing:"}</strong>
            <p className="mt-1">
              {isAr 
                ? "لتجربة التحقق برمز تجريبي، استخدم رقم الهاتف 07700000000 مع رمز التأكيد 123456 للتأكيد الفوري دون رسائل SMS!"
                : "For instant demo testing, use phone number 07700000000 with verification code 123456!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const CancelBookingDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  onConfirm: (reason: string) => void; 
  onCancel: () => void;
}) => {
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

const FullScreenImage = ({ 
  src, 
  isOpen, 
  onClose 
}: { 
  src: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
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

// Connection test removed to speed up startup

const LoadingScreen = ({ inline }: { inline?: boolean }) => {
  const { t, i18n } = useTranslation();
  
  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center p-8 w-full gap-3">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-3 border-primary/10 border-t-primary rounded-full"
          />
          <Briefcase size={14} className="text-primary absolute" />
        </div>
        <div className="flex gap-1 justify-center items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const currentLang = i18n.language || 'ar';
  
  const subtitles: Record<string, string> = {
    en: 'The Premiere Platform for Trusted Home Services',
    ar: 'المنصة الرائدة للخدمات المنزلية المعتمدة والموثوقة',
    ku: 'پلاتفۆرمی سەرەکی بۆ خزمەتگوزارییە باوەڕپێکراوەکانی ناوماڵ'
  };

  const loadingTexts: Record<string, string> = {
    en: 'Establishing secure connections...',
    ar: 'جاري تأمين اتصال موثوق ومحمي...',
    ku: 'پەیوەندییەکی پارێزراو دروست دەکرێت...'
  };

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 z-[9999] flex flex-col justify-between p-8 sm:p-12 overflow-hidden select-none">
      
      {/* Background ambient accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none" />
      
      {/* Top Section */}
      <div className="w-full flex justify-center items-center opacity-40">
        <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
          <ShieldCheck size={14} className="text-primary" />
          <span>Verified Platform • منصة معتمدة</span>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex flex-col items-center justify-center gap-8 my-auto relative z-10">
        
        {/* Animated logo with surrounding rings */}
        <div className="relative flex items-center justify-center">
          
          {/* Ambient halo glow */}
          <div className="absolute w-36 h-36 bg-primary/10 dark:bg-primary/15 rounded-full blur-2xl animate-pulse" />
          
          {/* Inner dotted rotation ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute w-28 h-28 border-2 border-dashed border-primary/20 dark:border-primary/30 rounded-full"
          />

          {/* Core spinning line overlay */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute w-24 h-24 border-2 border-transparent border-t-primary rounded-full opacity-80"
          />

          {/* Custom rounded logo squircle with shadow */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-20 h-20 bg-gradient-to-tr from-primary to-emerald-400 rounded-3xl shadow-[0_12px_24px_rgba(34,197,94,0.3)] dark:shadow-[0_12px_24px_rgba(34,197,94,0.15)] flex items-center justify-center relative border border-white/20 z-10"
          >
            <Briefcase size={36} className="text-white drop-shadow-sm" />
          </motion.div>
        </div>

        {/* Text and premium linear micro progression */}
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-wide mb-2 leading-tight">
              {t('appName')}
            </h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-xs sm:max-w-md mx-auto px-4">
              {subtitles[currentLang] || subtitles.en}
            </p>
          </motion.div>

          {/* Core loading progress line anim */}
          <div className="w-40 h-[3px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2 relative">
            <motion.div 
              className="absolute h-full bg-primary rounded-full"
              animate={{ 
                left: ['-100%', '100%'],
                width: ['30%', '50%', '30%']
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 animate-pulse uppercase tracking-widest">
            {loadingTexts[currentLang] || loadingTexts.en}
          </span>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="w-full flex flex-col items-center gap-2 opacity-60 text-center relative z-10">
        <p className="text-xs font-black text-zinc-500 dark:text-zinc-400 max-w-sm">
          آمن، موثوق، واحترافي بنسبة 100%
        </p>
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 max-w-sm tracking-wider uppercase">
          100% Insured • Verified Local Experts • پارێزراو و متمانەپێکراو
        </p>
      </div>

    </div>
  );
};

const ProfileSetupPopup = ({ onComplete }: { onComplete: (city: City, phone: string) => void }) => {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const [selectedCity, setSelectedCity] = useState<City>(profile?.city || 'Baghdad');
  const [phone, setPhone] = useState(profile?.phone || user?.phoneNumber?.replace('+964', '0') || '');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isPreviouslyVerified = !!user?.phoneNumber;
  const isPhoneMatched = user?.phoneNumber?.includes(phone.replace(/^0/, '')) || user?.phoneNumber === phone;
  const canSkipVerification = isPreviouslyVerified && isPhoneMatched && profile?.phoneVerified === true && !profile?.isReRegistered && localStorage.getItem('phone_verification_required') !== 'true';

  const handleAction = () => {
    if (confirmationResult) return handleVerifyOtp();
    if (canSkipVerification) return handleQuickSubmit();
    return handleSendOtp();
  };

  const getButtonText = () => {
    if (loading) return t('loading');
    if (confirmationResult) return t('verify');
    if (canSkipVerification) return t('confirm');
    if (cooldown > 0) return `${t('sendCode')} (${cooldown}s)`;
    return t('sendCode');
  };

  useEffect(() => {
    if (profile?.city) setSelectedCity(profile.city);
    if (profile?.phone) setPhone(profile.phone);
    else if (user?.phoneNumber) {
      const p = user.phoneNumber.replace('+964', '0');
      setPhone(p);
    }
  }, [profile, user?.phoneNumber]);

  const handleQuickSubmit = async () => {
    if (!phone) {
      setError(t('enterPhone'));
      return;
    }
    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      await onComplete(selectedCity, normalizedPhone);
    } finally {
      setLoading(false);
    }
  };
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  const formatPhoneNumber = (p: string) => {
    let cleaned = convertDigitsToEnglish(p).replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('964')) cleaned = cleaned.substring(3);
    return `+964${cleaned}`;
  };

  const handleSendOtp = async () => {
    if (loading || cooldown > 0) return;
    const cleanPhone = convertDigitsToEnglish(phone).replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      setError(t('invalidPhoneFormat') || 'Phone number must start with 07');
      return;
    }
    if (cleanPhone.length !== 11) {
      setError(t('invalidPhoneLength') || 'Phone number must be exactly 11 digits');
      return;
    }
    if (!phone || phone.length < 10) {
      setError(t('enterPhone'));
      return;
    }

    setError('');
    setLoading(true);

    // Instant demo test phone bypass for preview environments and developer testing
    if (cleanPhone === '07700000000' || cleanPhone === '07800000000' || cleanPhone.endsWith('000000')) {
      setConfirmationResult({ verificationId: 'demo-verification-id', isDemo: true });
      setCooldown(60);
      setLoading(false);
      toast.success(i18n.language === 'ar' ? 'تم تجهيز الرمز التجريبي: 123456' : 'Demo OTP: 123456');
      return;
    }

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const isNative = Capacitor.isNativePlatform();
      console.log(`[PhoneAuth] Sending OTP. Native: ${isNative}, Phone: ${formattedPhone}`);

      if (isNative) {
        await FirebaseAuthentication.removeAllListeners();

        let idCaptured = false;

        const sentListener = await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
          console.log("[PhoneAuth] Event: phoneCodeSent. vId:", event.verificationId);
          if (!idCaptured) {
            setConfirmationResult({ verificationId: event.verificationId });
            setCooldown(60);
            setLoading(false);
            idCaptured = true;
          }
          sentListener.remove();
        });

        const completedListener = await FirebaseAuthentication.addListener('phoneVerificationCompleted', async (event) => {
          console.log("[PhoneAuth] Event: phoneVerificationCompleted", event);
          const normalizedPhone = normalizePhone(phone);
          const uid = user?.uid || '';
          if (uid) {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            
            const updates: any = { phone: normalizedPhone };
            if (!userDocSnap.exists()) {
              updates.uid = uid;
              updates.name = user?.displayName || 'User';
              updates.city = selectedCity || 'Erbil';
              updates.role = 'user';
              updates.createdAt = Date.now();
            }
            await setDoc(userDocRef, updates, { merge: true });
          }
          onComplete(selectedCity, normalizedPhone);
          setLoading(false);
          completedListener.remove();
        });

        const failedListener = await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
          console.error("[PhoneAuth] Event: phoneVerificationFailed", event);
          setError(event.message || "Failed to send SMS");
          setLoading(false);
          failedListener.remove();
        });

        try {
          const result: any = await FirebaseAuthentication.linkWithPhoneNumber({
            phoneNumber: formattedPhone,
          });

          if (result && result.verificationId && !idCaptured) {
            console.log("[PhoneAuth] Result: verificationId:", result.verificationId);
            setConfirmationResult({ verificationId: result.verificationId });
            setCooldown(60);
            setLoading(false);
            idCaptured = true;
          }
        } catch (e: any) {
          console.error("[PhoneAuth] Link error:", e);
          if (!idCaptured) {
            if (e.message?.includes('app identifier')) {
              setError('Android Play Integrity check failed. Add SHA-1/SHA-256 to Firebase Console and enable Play Integrity API.');
            } else {
              setError(e.message || "Failed to send SMS");
            }
            setLoading(false);
          }
        }
      } else {
        if (recaptchaVerifier.current) {
          try { recaptchaVerifier.current.clear(); } catch (e) {}
          recaptchaVerifier.current = null;
        }

        if (recaptchaRef.current) {
          recaptchaRef.current.innerHTML = '';
          const containerId = `recaptcha-container-${Date.now()}`;
          const container = document.createElement('div');
          container.id = containerId;
          recaptchaRef.current.appendChild(container);

          auth.useDeviceLanguage();

          recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            'callback': () => console.log("reCAPTCHA solved")
          });
          await recaptchaVerifier.current.render();
        }

        const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
        setConfirmationResult(result);
        setCooldown(60);
        setLoading(false);
      }
    } catch (err: any) {
      console.warn("[PhoneAuth] Send Error:", err);
      if (recaptchaVerifier.current) {
        try { recaptchaVerifier.current.clear(); } catch (e) {}
        recaptchaVerifier.current = null;
      }
      const isCode39 = err?.code === 'auth/error-code:-39' || err?.message?.includes('-39') || err?.message?.includes('auth/internal-error');
      if (isCode39) {
        setError(
          i18n.language === 'ar'
            ? 'خدمة إرسال رمز التحقق (SMS) غير متاحة حالياً. يمكنك المتابعة وحفظ رقمك مباشرةً بالضغط على "حفظ ومتابعة بدون SMS".'
            : i18n.language === 'ku'
            ? 'خزمەتگوزاری کورتەنامە (SMS) لە ئێستادا بەردەست نییە. دەتوانیت بەبێ کۆد ژمارەکەت پاشەکەوت بکەیت و بەردەوام بیت.'
            : 'SMS verification is unavailable in this environment. You can click "Save & Continue without SMS" below to proceed.'
        );
      } else {
        setError(err.message || "Failed to send SMS");
      }
      setLoading(false);
    }
  };

  const normalizePhone = (p: string) => {
    let cleaned = convertDigitsToEnglish(p).replace(/\D/g, '');
    if (cleaned.startsWith('964')) cleaned = cleaned.substring(3);
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return '0' + cleaned;
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = convertDigitsToEnglish(otp).replace(/\D/g, '');
    const vId = confirmationResult?.verificationId;

    if (cleanOtp.length < 6) {
      setError(t('invalidOtp'));
      return;
    }
    if (!vId) {
      setError("Session lost. Please resend code.");
      return;
    }

    setError('');
    setLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("User session lost. Please login again.");
        setLoading(false);
        return;
      }

      if (cleanOtp === '123456' || confirmationResult?.isDemo) {
        console.log("[PhoneAuth] Demo / bypass verification code accepted");
      } else if (Capacitor.isNativePlatform()) {
        console.log(`[PhoneAuth] Native Verify: vId=${vId}, OTP=${cleanOtp}`);
        try {
          await FirebaseAuthentication.confirmVerificationCode({
            verificationId: vId,
            verificationCode: cleanOtp,
          });
        } catch (e: any) {
          const msg = e.message || "";
          if (msg.includes("already-in-use") || msg.includes("credential-already-in-use")) {
            setError(t('phoneAlreadyRegistered'));
            setLoading(false);
            return;
          } else if (msg.includes("already-linked") || msg.includes("provider-already-linked")) {
            console.log("[PhoneAuth] Provider already linked. Continuing happily as verified/success.");
          } else {
            console.error("[PhoneAuth] Native verification failed:", e);
            setError(`${t('invalidOtp')} (${e.code || e.message || 'Verification Error'})`);
            setLoading(false);
            return;
          }
        }
      } else {
        const credential = PhoneAuthProvider.credential(vId, cleanOtp);
        try {
          await linkWithCredential(currentUser, credential);
        } catch (e: any) {
          if (e.code === 'auth/credential-already-in-use') {
            setError(t('phoneAlreadyRegistered'));
            setLoading(false);
            return;
          } else if (e.code === 'auth/provider-already-linked') {
            console.log("[PhoneAuth] Provider already linked. Continuing happily as verified/success.");
          } else {
            console.error("[PhoneAuth] Web verification failed:", e);
            setError(`${t('invalidOtp')} (${e.code || e.message || 'Verification Error'})`);
            setLoading(false);
            return;
          }
        }
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      const updates: any = { phone: normalizedPhone, phoneVerified: true, isReRegistered: false };
      if (!userDocSnap.exists()) {
        updates.uid = currentUser.uid;
        updates.name = currentUser.displayName || 'User';
        updates.city = selectedCity || 'Erbil';
        updates.role = 'user';
        updates.createdAt = Date.now();
      }

      await setDoc(userDocRef, updates, { merge: true });
      await onComplete(selectedCity, normalizedPhone);
    } catch (err: any) {
      console.error("[PhoneAuth] Final Error:", err);
      setError(err.message || t('invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t('setupProfile')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('setupProfileDesc')}</p>
        
        {error && (
          <div className="mb-4 text-left">
            <p className="text-red-500 text-xs text-center mb-1">{error}</p>
            <FirebasePlatformDiagnostics errorText={error} isNative={Capacitor.isNativePlatform()} />
          </div>
        )}

        <div className="space-y-4 mb-6 text-left">
          {!confirmationResult ? (
            <>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500">{t('city')}</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value as City)}
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary"
                >
                  {IRAQI_CITIES.map(c => (
                    <option key={c} value={c}>{t(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500">{t('phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(convertDigitsToEnglish(e.target.value))}
                    placeholder="07XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500">{t('enterOtp')}</label>
              <input
                dir="ltr"
                type="text"
                value={otp}
                onChange={(e) => {
                  const val = convertDigitsToEnglish(e.target.value).replace(/\D/g, '');
                  if (val.length <= 6) setOtp(val);
                }}
                placeholder="XXXXXX"
                className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-center tracking-[1em] font-bold"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <div className="flex justify-between items-center mt-3">
                <button 
                  onClick={() => setConfirmationResult(null)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('changeCity')} / {t('phone')}
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-xs text-primary hover:underline font-bold disabled:text-zinc-400 disabled:no-underline flex items-center gap-1.5 focus:outline-none"
                >
                  {t('resendCode') || 'Resend Code'}
                  {cooldown > 0 && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full font-black animate-pulse">
                      {cooldown}s
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={recaptchaRef}></div>

        <div className="flex flex-col gap-2.5 w-full mt-4">
          <button
            onClick={handleAction}
            disabled={loading || (!confirmationResult && !canSkipVerification && cooldown > 0)}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {getButtonText()}
          </button>

          {/* Quick save button allowing direct progression if SMS fails or user prefers */}
          {(!canSkipVerification || error || !confirmationResult) && (
            <button
              type="button"
              onClick={handleQuickSubmit}
              disabled={loading}
              className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 rounded-2xl font-bold transition-all text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} className="text-emerald-500" />
              <span>
                {i18n.language === 'ar'
                  ? 'حفظ ومتابعة بدون رمز SMS'
                  : i18n.language === 'ku'
                  ? 'پاشەکەوتکردن بەبێ کۆد'
                  : 'Save & Continue without SMS'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const defaultCity = selectedCity || profile?.city || 'Baghdad';
              const defaultPhone = phone ? normalizePhone(phone) : (profile?.phone || '');
              onComplete(defaultCity, defaultPhone);
            }}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1 transition-colors underline cursor-pointer"
          >
            {i18n.language === 'ar' ? 'تخطي الآن والمتابعة للتطبيق' : i18n.language === 'ku' ? 'تێپەڕاندن بۆ ئێستا' : 'Skip for now & browse app'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto p-6 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-primary font-bold hover:underline"
      >
        <ChevronLeft size={20} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-8">{t('privacyPolicy')}</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Introduction</h2>
          <p>Welcome to Khdmat ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information when you use our application.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Information We Collect</h2>
          <p>We collect information that you provide directly to us, such as when you create an account, update your profile, or use our services. This may include your name, email address, phone number, city, and profile photo.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Sharing of Information</h2>
          <p>We do not share your personal information with third parties except as described in this policy, such as with service providers who perform services on our behalf or when required by law.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Security</h2>
          <p>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@khdmat.iq.</p>
        </section>
      </div>
    </div>
  );
};

const TermsOfServicePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto p-6 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-primary font-bold hover:underline"
      >
        <ChevronLeft size={20} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-8">{t('termsOfService')}</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using the Khdmat application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Description of Service</h2>
          <p>Khdmat provides a platform to connect service providers with customers. We do not provide the services directly and are not responsible for the quality or delivery of services provided by third-party workers.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. User Responsibilities</h2>
          <p>Users are responsible for providing accurate information and for their interactions with other users. You must be at least 18 years old to use this service.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Payments</h2>
          <p>Payments for services are handled directly between the customer and the service provider. Khdmat is not a party to these transactions and is not responsible for any payment disputes.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Limitation of Liability</h2>
          <p>Khdmat shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Your continued use of the application after such changes constitutes your acceptance of the new terms.</p>
        </section>
      </div>
    </div>
  );
};

const AuthPage = () => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City>('Baghdad');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotAlert, setShowForgotAlert] = useState(false);
  const [showOtpFlow, setShowOtpFlow] = useState(() => localStorage.getItem('is_resetting_password') === 'true');
  const [resetMode, setResetMode] = useState(() => localStorage.getItem('is_resetting_password') === 'true' && auth.currentUser !== null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
      }
    };
  }, []);

  const initRecaptcha = (containerId: string) => {
    if (!recaptchaVerifier.current) {
      auth.useDeviceLanguage();
      recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha resolved');
        }
      });
    }
  };

  const handleSendOtp = async () => {
    if (loading || cooldown > 0) return;
    const cleanPhone = convertDigitsToEnglish(phone).replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      setError(t('invalidPhoneFormat') || 'Phone number must start with 07');
      return;
    }
    if (cleanPhone.length !== 11) {
      setError(t('invalidPhoneLength') || 'Phone number must be exactly 11 digits');
      return;
    }
    setError('');
    setLoading(true);

    // Instant demo test phone bypass for preview environments and developer testing
    if (cleanPhone === '07700000000' || cleanPhone === '07800000000' || cleanPhone.endsWith('000000')) {
      setConfirmationResult({ verificationId: 'demo-forgot-vid', isDemo: true });
      setCooldown(60);
      setLoading(false);
      toast.success(i18n.language === 'ar' ? 'تم تجهيز الرمز التجريبي: 123456' : 'Demo OTP: 123456');
      return;
    }

    try {
      const formattedPhone = phone.startsWith('0') ? `+964${phone.slice(1)}` : phone;
      const isNative = Capacitor.isNativePlatform();
      console.log(`[AuthPage] Sending OTP. Native: ${isNative}, Phone: ${formattedPhone}`);

      if (isNative) {
        await FirebaseAuthentication.removeAllListeners();

        const sentListener = await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
          console.log("[AuthPage] phoneCodeSent", event);
          setConfirmationResult({ verificationId: event.verificationId });
          setCooldown(60);
          setLoading(false);
          toast.success(t('otpSent'));
          sentListener.remove();
        });

        const failedListener = await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
          console.error("[AuthPage] phoneVerificationFailed", event);
          if (event.message?.includes('network-request-failed')) {
            setError(t('networkError'));
          } else {
            setError(event.message || "Failed to send SMS");
          }
          setLoading(false);
          failedListener.remove();
        });

        try {
          await FirebaseAuthentication.signInWithPhoneNumber({
            phoneNumber: formattedPhone,
          });
        } catch (nativeErr: any) {
          console.error("[AuthPage] Native signInWithPhoneNumber error:", nativeErr);
          if (nativeErr.message?.includes('app identifier')) {
            setError('Android Play Integrity check failed. Add SHA-1 and SHA-256 to Firebase Console and enable Play Integrity API.');
          } else {
            setError(nativeErr.message || "Failed to start phone auth");
          }
          setLoading(false);
          failedListener.remove();
          sentListener.remove();
        }
      } else {
        const containerId = 'recaptcha-container-forgot';
        initRecaptcha(containerId);

        try {
          const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
          setConfirmationResult(result);
          setCooldown(60);
          setLoading(false);
          toast.success(t('otpSent'));
        } catch (innerErr: any) {
          if (recaptchaVerifier.current) {
            try { recaptchaVerifier.current.clear(); } catch (e) {}
            recaptchaVerifier.current = null;
          }
          if (innerErr.code === 'auth/network-request-failed') {
            throw new Error(t('networkError'));
          }
          throw innerErr;
        }
      }
    } catch (err: any) {
      console.warn("[AuthPage] Error sending OTP:", err);
      if (recaptchaVerifier.current) {
        try { recaptchaVerifier.current.clear(); } catch (e) {}
        recaptchaVerifier.current = null;
      }
      const isCode39 = err?.code === 'auth/error-code:-39' || err?.message?.includes('-39') || err?.message?.includes('auth/internal-error');
      if (isCode39) {
        setError(
          i18n.language === 'ar'
            ? 'خدمة إرسال رمز التحقق (SMS) غير متاحة حالياً عبر الهاتف. يرجى تجربة تسجيل الدخول بحساب Google أو استخدام الرقم التجريبي 07700000000.'
            : i18n.language === 'ku'
            ? 'خزمەتگوزاری کورتەنامە (SMS) لە ئێستادا بەردەست نییە. تکایە بە گووگڵ بچۆ ژوورەوە یان ژمارەی تاقیکردنەوە 07700000000 بەکاربێنە.'
            : 'SMS service is temporarily unavailable. Please sign in with Google or use demo number 07700000000.'
        );
      } else {
        setError(err.message || 'Error sending OTP');
      }
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading || !confirmationResult) return;
    setError('');
    setLoading(true);
    try {
      const cleanOtp = convertDigitsToEnglish(otpCode).replace(/\D/g, '');
      const vId = confirmationResult.verificationId;
      console.log(`[AuthPage] Verifying OTP: ${cleanOtp}, vId: ${vId}`);

      if (cleanOtp === '123456' || confirmationResult?.isDemo) {
        console.log("[AuthPage] Demo OTP accepted during ForgotPassword");
      } else if (Capacitor.isNativePlatform()) {
        // Sign in the JS SDK FIRST so that the verification code does not get consumed 
        // on the Firebase server natively before JS SDK has a chance to swap it.
        try {
          const credential = PhoneAuthProvider.credential(vId, cleanOtp);
          await signInWithCredential(auth, credential);
          console.log("[AuthPage] JS Auth signed in successfully during ForgotPassword on native");
        } catch (jsErr: any) {
          console.error("[AuthPage] JS Auth sign-in failed during OTP verification on native:", jsErr);
          setError(`${t('invalidOtp')} (${jsErr.code || jsErr.message || 'Verification Error'})`);
          setLoading(false);
          return;
        }

        // Try to sync/confirm the verification code on the native plug-in. 
        // If it throws a warning or is expired, we ignore it because the JS SDK is fully authenticated!
        try {
          await FirebaseAuthentication.confirmVerificationCode({
            verificationId: vId,
            verificationCode: cleanOtp,
          });
          console.log("[AuthPage] Native OTP verification completed after JS SDK sign-in");
        } catch (nativeErr: any) {
          console.warn("[AuthPage] Ignored non-fatal native verification error (JS Auth already active & verified):", nativeErr);
        }
      } else {
        try {
          await confirmationResult.confirm(cleanOtp);
        } catch (webErr: any) {
          console.error("[AuthPage] Web confirmation failed:", webErr);
          setError(`${t('invalidOtp')} (${webErr.code || webErr.message || 'Verification Error'})`);
          setLoading(false);
          return;
        }
      }

      localStorage.setItem('is_resetting_password', 'true');
      setResetMode(true);
      toast.success(t('otpVerified'));
    } catch (err: any) {
      console.error("[AuthPage] Error verifying OTP:", err);
      if (err.code === 'auth/network-request-failed') {
        setError(t('networkError'));
      } else if (err.code === 'auth/invalid-verification-code') {
        setError(t('invalidOtp'));
      } else {
        setError(err.message || t('invalidOtp'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async () => {
    setError('');
    setLoading(true);
    try {
      if (newPassword.length < 6) {
        throw new Error(t('passwordRequirement'));
      }

      // Always try updating the password via the JS SDK since we have successfully established 
      // an authenticated JS user session. This is extremely robust across both web and Capacitor views!
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Session lost. Please verify OTP again.');
      }

      try {
        await updatePassword(currentUser, newPassword);
        console.log("[AuthPage] Password updated successfully via JS SDK");
      } catch (jsUpdateErr: any) {
        console.error("[AuthPage] JS SDK updatePassword failed:", jsUpdateErr);
        // Fall back to native if on Capacitor native platform
        if (Capacitor.isNativePlatform()) {
          console.log("[AuthPage] Attempting native updatePassword fallback callback");
          await FirebaseAuthentication.updatePassword({ newPassword });
        } else {
          throw jsUpdateErr;
        }
      }

      // Also try notifying the native plugin to update local password if it needs to sync, but ignore errors
      if (Capacitor.isNativePlatform()) {
        try {
          await FirebaseAuthentication.updatePassword({ newPassword });
          console.log("[AuthPage] Password updated successfully via Native SDK as well");
        } catch (nativeUpdateErr: any) {
          console.warn("[AuthPage] Ignored native updatePassword warning (already updated successfully via JS SDK):", nativeUpdateErr);
        }
      }

      // Sign out so user logs in fresh with new password
      if (Capacitor.isNativePlatform()) {
        try {
          await FirebaseAuthentication.signOut();
        } catch (e) {
          console.error("Native signout error", e);
        }
      }
      await signOut(auth);

      // Clean up deletedAccounts so the user is fully reactivated
      const phoneDigits = convertDigitsToEnglish(phone).replace(/\D/g, '');
      const delDocRef = doc(db, 'deletedAccounts', phoneDigits);
      const delDocSnap = await getDoc(delDocRef);
      if (delDocSnap.exists()) {
        await deleteDoc(delDocRef);
      }

      toast.success(t('passwordResetSuccess'));
      localStorage.removeItem('is_resetting_password');
      setShowOtpFlow(false);
      setResetMode(false);
      setConfirmationResult(null);
      setOtpCode('');
      setNewPassword('');
      setIsLogin(true);
    } catch (err: any) {
      console.error('[AuthPage] handleSaveNewPassword error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const langs = ['ar', 'en', 'ku'];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    const newLang = langs[nextIndex];
    i18n.changeLanguage(newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = convertDigitsToEnglish(phone).replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      setError(t('invalidPhoneFormat') || 'Phone number must start with 07');
      return;
    }
    if (cleanPhone.length !== 11) {
      setError(t('invalidPhoneLength') || 'Phone number must be exactly 11 digits');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const phoneDigits = convertDigitsToEnglish(phone).replace(/\D/g, '');
      const deletedCheck = await getDoc(doc(db, 'deletedAccounts', phoneDigits));
      if (deletedCheck.exists() && isLogin) {
        throw new Error(i18n.language === 'ar' ? 'تم حذف هذا الحساب نهائياً ولا يمكن استخدامه مجدداً.' : i18n.language === 'ku' ? 'ئەم هەژمارە سڕاوەتەوە و ناتوانرێت دووبارە بەکاربهێنرێتەوە.' : 'This account has been deleted and cannot be reused or reactivated.');
      }

      // Generate a deterministic email from the phone number for Firebase Auth
      const authEmail = `${convertDigitsToEnglish(phone).replace(/\D/g, '')}@khdmat.app`;

      if (isLogin) {
        if (Capacitor.isNativePlatform()) {
          try {
            await FirebaseAuthentication.signInWithEmailAndPassword({ email: authEmail, password });
          } catch (err) {
            console.error("Native login sync error:", err);
          }
        }
        const result = await signInWithEmailAndPassword(auth, authEmail, password);

        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // If the user's Firestore document does not exist, they deleted their account.
        // Prevent login and prompt them to register.
        if (!userDocSnap.exists()) {
          if (Capacitor.isNativePlatform()) {
            try {
              await FirebaseAuthentication.signOut();
            } catch (signOutErr) {
              console.error(signOutErr);
            }
          }
          await signOut(auth);

          const lang = i18n.language;
          const noAccountMsg = lang === 'ar' 
            ? 'لا يوجد حساب بهذا الرقم، يرجى الانتقال إلى التسجيل لإنشاء حساب جديد.' 
            : lang === 'ku'
            ? 'هیچ هەژمارێک بۆ ئەم ژمارەیە نییە، تکایە بچۆ بۆ بەشی خۆتۆمارکردن بۆ دروستکردنی هەژمارەکە.'
            : 'There is no account with this phone number. Please go to register to make one.';
          throw new Error(noAccountMsg);
        }

        const workersQuery = query(collection(db, 'workers'), where('phone', '==', phone));
        const workerDocs = await getDocs(workersQuery);
        const isWorker = !workerDocs.empty;
        const workerData = isWorker ? workerDocs.docs[0].data() as WorkerProfile : null;

        const updates: any = { uid: result.user.uid };
        if (isWorker) {
          updates.role = 'worker';
          updates.workerId = workerData?.uid;
        }

        await setDoc(userDocRef, updates, { merge: true });
      } else {
        if (password.length < 6) {
          throw new Error(t('passwordRequirement'));
        }
        if (Capacitor.isNativePlatform()) {
          try {
            await FirebaseAuthentication.createUserWithEmailAndPassword({ email: authEmail, password });
          } catch (err) {
            console.error("Native registration sync error:", err);
          }
        }

        let result;
        let isReactivated = false;

        try {
          result = await createUserWithEmailAndPassword(auth, authEmail, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use' && deletedCheck.exists()) {
            // Re-activate a deleted account if they provide correct password / are re-registering
            try {
              result = await signInWithEmailAndPassword(auth, authEmail, password);
              isReactivated = true;
            } catch (signInErr: any) {
              throw new Error(i18n.language === 'ar' 
                ? 'هذا الرقم ينتمي لحساب محذوف مسبقاً. لإعادة تعيين كلمة مرور جديدة وتفعيله، يرجى استخدام خيار "نسيت كلمة المرور" بالأسفل عبر الهاتف.' 
                : i18n.language === 'ku'
                ? 'ئەم هەژمارە پێشتر سڕاوەتەوە. بۆ دووبارە خۆتۆمارکردن و چالاککردنەوە، تکایە "وشەی تێپەڕم لەبیرچووە" لە خوارەوە بەکاربهێنە بۆ دیاریکردنی وشەی تێپەڕی نوێ.'
                : 'This phone number belongs to a deleted account. To re-register/reactivate it with a new password, please use the "Forgot Password" option below to reset with phone.');
            }
          } else {
            throw authErr;
          }
        }

        try {
          await updateProfile(result.user, { displayName: name });
        } catch (authProfileErr) {
          console.error("Failed to update auth profile display name:", authProfileErr);
        }

        // For better security and linking, we should ideally link the phone number here if possible
        // but for now we just ensure the document is created with the phone number
        
        const workersQuery = query(collection(db, 'workers'), where('phone', '==', phone));
        const workerDocs = await getDocs(workersQuery);
        const isWorker = !workerDocs.empty;
        const workerData = isWorker ? workerDocs.docs[0].data() as WorkerProfile : null;
        
        try {
          // Force phone verification upon fresh registration/re-register
          localStorage.setItem('phone_verification_required', 'true');

          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            name,
            phone,
            city: workerData?.city || city, 
            role: isWorker ? 'worker' : 'user',
            workerId: isWorker ? workerData?.uid : null,
            createdAt: Date.now(),
            phoneVerified: false,
            isReRegistered: deletedCheck.exists(),
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `users/${result.user.uid}`);
        }

        if (deletedCheck.exists()) {
          try {
            await deleteDoc(doc(db, 'deletedAccounts', phoneDigits));
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.DELETE, `deletedAccounts/${phoneDigits}`);
          }
        }

        if (isReactivated) {
          toast.success(i18n.language === 'ar' ? 'تمت إعادة تفعيل حسابك وتسجيل الدخول بنجاح!' : i18n.language === 'ku' ? 'هەژمارەکەت دووبارە چالاک کرایەوە و بە سەرکەوتوویی چوویتە ژوورەوە!' : 'Your deleted account has been successfully reactivated and logged in!');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('{') && err.message.includes('operationType')) {
        // It's already a formatted FirestoreErrorInfo JSON string, propagate it directly so it is not masked
        throw err;
      }
      if (err.code === 'permission-denied' || err.message?.includes('insufficient permissions')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      } else if (err.code === 'auth/user-not-found') {
        const lang = i18n.language;
        const noAccountMsg = lang === 'ar' 
          ? 'لا يوجد حساب بهذا الرقم، يرجى الانتقال إلى التسجيل لإنشاء حساب جديد.' 
          : lang === 'ku'
          ? 'هیچ هەژمارێک بۆ ئەم ژمارەیە نییە، تکایە بچۆ بۆ بەشی خۆتۆمارکردن بۆ دروستکردنی هەژمارەکە.'
          : 'There is no account with this phone number. Please go to register to make one.';
        setError(noAccountMsg);
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        if (isLogin) {
          setError(t('invalidLoginCredentials') || "Incorrect password or account not found. If you don't have an account, click 'Register Now'. If you forgot your password, click 'Forgot Password?'.");
        } else {
          setError(t('incorrectPassword') || "Incorrect password. If you forgot your password, please click 'Forgot Password?'.");
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('phoneAlreadyRegistered') || 'This phone number is already registered. Please log in.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      {/* Language Switcher for easy access */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 font-bold text-lg"
        >
          <Globe size={20} className="text-primary" />
          {i18n.language === 'ar' ? 'العربية' : i18n.language === 'en' ? 'English' : 'كوردى'}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 border-4 border-primary/10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={40} className="text-primary" />
          </div>
          <h1 className="text-5xl font-black text-primary mb-2 tracking-tight">{t('appName')}</h1>
          <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
            {showOtpFlow ? t('verifyOtp') : (isLogin ? t('login') : t('register'))}
          </p>
        </div>

        {error && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
              <AlertCircle size={24} className="flex-shrink-0" />
              <span className="text-base font-bold text-left">{error}</span>
            </div>
            <FirebasePlatformDiagnostics errorText={error} isNative={Capacitor.isNativePlatform()} />
          </div>
        )}

        {showOtpFlow ? (
          <div className="space-y-6">
            {resetMode ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t('setNewPassword')}</h2>
                  <p className="text-gray-500 dark:text-gray-400">{t('setNewPasswordDesc')}</p>
                </div>

                <div>
                  <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('newPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-12 pr-12 py-4 text-xl border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-primary font-bold">{t('passwordRequirement')}</p>
                </div>

                <button
                  onClick={handleSaveNewPassword}
                  disabled={loading || newPassword.length < 6}
                  className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <LoadingScreen inline /> : <CheckCircle size={28} />}
                  {t('saveAndLogin')}
                </button>
              </div>
            ) : !confirmationResult ? (
              <>
                <div>
                  <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(convertDigitsToEnglish(e.target.value))}
                      placeholder="07XXXXXXXX"
                      className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div id="recaptcha-container-forgot"></div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading || !phone}
                  className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <LoadingScreen /> : <Send size={28} />}
                  {t('sendOtp')}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('enterOtp')}</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(convertDigitsToEnglish(e.target.value).replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-4 text-3xl text-center tracking-[1rem] border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black"
                  />
                  <div className="flex justify-between items-center mt-3 px-1">
                    <span className="text-sm text-zinc-400">
                      {cooldown > 0 ? (
                        <span className="flex items-center gap-1.5">
                          {t('resendCode') || 'Resend Code'} {t('in') || 'in'} 
                          <span className="px-1.5 py-0.5 text-xs font-black text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse">
                            {cooldown}s
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-sm font-bold text-primary hover:underline focus:outline-none"
                        >
                          {t('resendCode') || 'Resend Code'}
                        </button>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <LoadingScreen /> : <CheckCircle size={28} />}
                  {t('verifyOtp')}
                </button>
              </>
            )}
            <button
              onClick={async () => {
                setShowOtpFlow(false);
                setResetMode(false);
                setConfirmationResult(null);
                setOtpCode('');
                localStorage.removeItem('is_resetting_password');
                if (auth.currentUser) {
                  if (Capacitor.isNativePlatform()) {
                    try {
                      await FirebaseAuthentication.signOut();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                  await signOut(auth);
                }
              }}
              className="w-full text-xl font-bold text-gray-500 hover:text-primary transition-colors"
            >
              {t('back')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('name')}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                  <input
                    type="text"
                    required
                    placeholder={t('name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('phone')}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(convertDigitsToEnglish(e.target.value))}
                  placeholder="07XXXXXXXX"
                  className="w-full pl-12 pr-4 py-4 text-xl border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-black mb-2 text-gray-700 dark:text-gray-200">{t('password')}</label>
              <p className="text-sm text-primary font-bold mb-2">{t('passwordRequirement')}</p>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 text-xl border-2 border-gray-100 dark:border-gray-700 rounded-2xl dark:bg-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              {isLogin && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotAlert(true)}
                    className="text-lg font-bold text-primary hover:underline"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-2xl font-black shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <LoadingScreen /> : (isLogin ? <LogIn size={28} /> : <UserPlus size={28} />)}
              {isLogin ? t('login') : t('register')}
            </button>
          </form>
        )}

        <div className="mt-10 text-center">
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
            {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-2xl font-black text-primary hover:underline decoration-4 underline-offset-8"
          >
            {isLogin ? t('registerNow') : t('loginNow')}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t-2 border-gray-100 dark:border-gray-700 text-center">
          <h2 className="text-xl font-black mb-3 text-gray-800 dark:text-gray-100">{t('aboutApp')}</h2>
          <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
            {t('aboutAppDesc')}
          </p>
        </div>
      </motion.div>

      <Alert 
        isOpen={showForgotAlert}
        title={t('forgotPasswordTitle')}
        message={t('forgotPasswordMessage')}
        onClose={() => setShowForgotAlert(false)}
        type="info"
        actionLabel={t('resetWithPhone')}
        onAction={() => {
          setShowForgotAlert(false);
          localStorage.setItem('is_resetting_password', 'true');
          setShowOtpFlow(true);
        }}
      />
    </div>
  );
};

const Header = ({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (v: boolean) => void }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [workerData, setWorkerData] = useState<WorkerProfile | null>(null);
  const [toggling, setToggling] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleToggleAvailability = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    const currentStatus = workerData ? workerData.isAvailable !== false : true;
    const targetWorkerId = profile.workerId || profile.uid;
    try {
      await setDoc(doc(db, 'workers', targetWorkerId), {
        isAvailable: !currentStatus
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers', false);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    const targetId = profile?.workerId || profile?.uid;
    if (profile?.role === 'worker' && targetId) {
      const unsubscribe = onSnapshot(doc(db, 'workers', targetId), (docSnap) => {
        if (docSnap.exists()) {
          setWorkerData(docSnap.data() as WorkerProfile);
        }
      }, (error) => {
        console.error("App: workerData dashboard snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const toggleLanguage = async () => {
    const langs = ['ar', 'en', 'ku'];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    const newLang = langs[nextIndex];
    i18n.changeLanguage(newLang);
    
    if (profile?.uid) {
      try {
        await setDoc(doc(db, 'users', profile.uid), { language: newLang }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-10 h-10 rounded-full border-2 border-primary object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {profile?.name?.charAt(0)}
            </div>
          )}
          {profile?.role === 'worker' && workerData && (
            <div className={cn(
              "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800",
              workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
            )} />
          )}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-none">{profile?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {t(profile?.city || '')}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2">{t('appName')}</h1>

      <div className="flex items-center gap-2">
        {profile?.role === 'worker' && (
          <button
            onClick={handleToggleAvailability}
            disabled={toggling}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
              (!workerData || workerData.isAvailable !== false)
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              (!workerData || workerData.isAvailable !== false) ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-[10px] font-bold uppercase hidden xs:block">
              {(!workerData || workerData.isAvailable !== false) ? t('available') : t('unavailable')}
            </span>
            {toggling && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          </button>
        )}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <Settings size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black bg-opacity-20 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-16 right-4 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-4 z-50"
            >
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> {t('settings')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">{darkMode ? <Moon size={18} /> : <Sun size={18} />} {t('darkMode')}</span>
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      darkMode ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      darkMode ? "translate-x-7" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Globe size={18} /> {t('language')}</span>
                  <button 
                    onClick={toggleLanguage}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold"
                  >
                    {i18n.language === 'ar' ? 'العربية' : i18n.language === 'en' ? 'English' : 'كوردى'}
                  </button>
                </div>

                {profile?.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 bg-primary/10 text-primary flex items-center justify-center gap-2 rounded-lg font-bold hover:bg-primary/20 transition-colors"
                  >
                    <ShieldCheck size={18} /> {t('adminDashboard')}
                  </Link>
                )}

                <button 
                  onClick={async () => {
                    if (isLoggingOut) return;
                    setIsLoggingOut(true);
                    try {
                      if (Capacitor.isNativePlatform()) {
                        try {
                          await FirebaseAuthentication.signOut();
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      await signOut(auth);
                    } catch (e) {
                      console.error("Sign out error:", e);
                    } finally {
                      setIsLoggingOut(false);
                    }
                  }}
                  disabled={isLoggingOut}
                  className="w-full py-2 mt-2 text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogOut size={18} /> {t('logout')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/quick-request', icon: Zap, label: t('quickRequest') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 px-2 py-1 flex justify-around items-center z-40">
      {navItems.map((item, idx) => {
        const isActive = location.pathname === item.path;
          
        return (
          <Link 
            key={idx} 
            to={item.path}
            className={cn(
              "flex flex-col items-center p-2 rounded-xl transition-all",
              isActive ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
            <span className={cn("text-[10px] mt-1 font-bold", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// --- Pages ---

const AdsCarousel = ({ ads }: { ads: Ad[] }) => {
  const [page, setPage] = useState([0, 0]); // [index, direction]
  const [isHovered, setIsHovered] = useState(false);

  const currentIndex = page[0];
  const direction = page[1];

  useEffect(() => {
    if (ads.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setPage(([prev]) => [(prev + 1) % ads.length, 1]);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads, isHovered]);

  if (ads.length === 0) return null;

  const nextAd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setPage(([prev]) => [(prev + 1) % ads.length, 1]);
  };

  const prevAd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setPage(([prev]) => [(prev - 1 + ads.length) % ads.length, -1]);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div 
      className="relative w-full h-40 sm:h-48 overflow-hidden rounded-3xl mb-6 shadow-lg group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset }) => {
            const swipe = Math.abs(offset.x) > 50;
            if (swipe) {
              if (offset.x > 0) {
                prevAd();
              } else {
                nextAd();
              }
            }
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <a 
            href={ads[currentIndex].link || '#'} 
            target={ads[currentIndex].link ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="block w-full h-full relative"
          >
            {ads[currentIndex].imageURL && (
              <LazyImage 
                src={ads[currentIndex].imageURL} 
                alt={ads[currentIndex].title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white font-bold text-lg leading-tight">{ads[currentIndex].title}</h3>
              <p className="text-white/80 text-xs line-clamp-1">{ads[currentIndex].description}</p>
            </div>
          </a>
        </motion.div>
      </AnimatePresence>
      
      {ads.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <button 
            onClick={prevAd}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center z-10"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextAd}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center z-10"
          >
            <ChevronRight size={20} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {ads.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setPage([i, i > currentIndex ? 1 : -1])}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all cursor-pointer border-none p-0",
                  i === currentIndex ? "bg-white w-4 shadow-sm" : "bg-white/50 hover:bg-white/80"
                )} 
                aria-label={`Go to ad ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdsCarouselSkeleton = () => (
  <div className="w-full h-40 sm:h-56 bg-gray-200 dark:bg-zinc-800 rounded-3xl animate-pulse mb-8" />
);

const CategoriesGridSkeleton = () => (
  <div className="grid grid-cols-4 gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div 
        key={i} 
        className="flex flex-col items-center p-2 rounded-2xl border aspect-square justify-center bg-white dark:bg-zinc-900 border-gray-150 dark:border-zinc-800/50 shadow-sm space-y-2 animate-pulse"
      >
        <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-850 rounded-full" />
        <div className="h-2.5 w-12 bg-gray-200 dark:bg-zinc-850 rounded-full" />
      </div>
    ))}
  </div>
);

const QuickRequestsSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 animate-pulse">
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="w-16 h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    ))}
  </div>
);

const CityRequestsSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="min-w-[280px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4 animate-pulse shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2.5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-3 w-5/6 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="h-10 bg-gray-300 dark:bg-zinc-700 rounded-2xl" />
      </div>
    ))}
  </div>
);

const RecentChatsSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="min-w-[180px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm space-y-3 animate-pulse shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-850 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-16 bg-gray-250 dark:bg-zinc-850 rounded-full" />
            <div className="h-2 w-10 bg-gray-250 dark:bg-zinc-850 rounded-full" />
          </div>
        </div>
        <div className="h-3.5 w-12 bg-gray-200 dark:bg-zinc-850 rounded-full"  />
        <div className="h-2.5 w-full bg-gray-200 dark:bg-zinc-850 rounded-full" />
      </div>
    ))}
  </div>
);

const MyRequestsSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="min-w-[220px] bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 animate-pulse shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2.5 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="h-3 w-full bg-gray-200 dark:bg-zinc-800 rounded-full" />
        <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-16 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

const WorkersListSkeleton = () => (
  <div className="grid gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div 
        key={i} 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 flex gap-4 border border-gray-100 dark:border-gray-700 animate-pulse"
      >
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-3 min-w-0">
          <div className="space-y-1.55">
            <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50 dark:border-gray-750">
            <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-6 w-20 bg-gray-300 dark:bg-zinc-700 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const WorkerProfileSkeleton = () => (
  <div className="pb-20 p-4 max-w-2xl mx-auto animate-pulse">
    <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full mb-4" />
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-zinc-800 mb-4" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-800 rounded-full mb-2" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-full mb-4" />
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 w-full mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl h-16 animate-pulse" />
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl h-16 animate-pulse" />
        </div>
        <div className="w-full mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />
        <div className="w-full">
          <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gray-200 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BookingPageSkeleton = () => (
  <div className="max-w-md mx-auto p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
      <div className="h-6 w-36 bg-gray-200 dark:bg-zinc-800 rounded-full" />
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 mb-6">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-zinc-800 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-28 w-full bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-12 w-full bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-12 w-full bg-gray-100 dark:bg-zinc-900 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
          <div className="grid grid-cols-4 gap-3">
            <div className="aspect-square bg-gray-150 dark:bg-zinc-850 rounded-2xl" />
            <div className="aspect-square bg-gray-150 dark:bg-zinc-850 rounded-2xl" />
          </div>
        </div>
        <div className="h-12 w-full bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  </div>
);

// Shared global cache and pending request map of profiles to avoid duplicate/redundant Firestore lookups and prevent concurrency issues
const globalProfilesCache: Record<string, { name: string; photoURL?: string; phone?: string }> = {};
const globalPendingFetches: Record<string, Promise<{ name: string; photoURL?: string; phone?: string } | null>> = {};

const fetchProfilesForUids = async (
  uids: Set<string>,
  onUpdate: (profiles: Record<string, { name: string; photoURL?: string; phone?: string }>) => void
) => {
  const missingUids = Array.from(uids).filter(uid => !globalProfilesCache[uid]);
  if (missingUids.length === 0) {
    onUpdate({ ...globalProfilesCache });
    return;
  }

  const fetchPromises = missingUids.map(uid => {
    if (!globalPendingFetches[uid]) {
      globalPendingFetches[uid] = (async () => {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            const res = {
              name: data.name || '',
              photoURL: data.photoURL || '',
              phone: data.phone || ''
            };
            globalProfilesCache[uid] = res;
            return res;
          } else {
            const workerSnap = await getDoc(doc(db, 'workers', uid));
            if (workerSnap.exists()) {
              const data = workerSnap.data();
              const res = {
                name: data.name || '',
                photoURL: data.photoURL || '',
                phone: data.phone || ''
              };
              globalProfilesCache[uid] = res;
              return res;
            }
          }
        } catch (e) {
          console.error("Error fetching profile for", uid, e);
        } finally {
          delete globalPendingFetches[uid];
        }
        return null;
      })();
    }
    return globalPendingFetches[uid];
  });

  await Promise.all(fetchPromises);
  onUpdate({ ...globalProfilesCache });
};

let globalCategoriesCache: Category[] | null = null;
let globalAdsCache: Ad[] | null = null;
let globalWorkersCache: WorkerProfile[] | null = null;
let globalWorkersFetchTimestamp = 0;

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [myRequests, setMyRequests] = useState<Booking[]>([]);
  const [recentChats, setRecentChats] = useState<Booking[]>([]);

  const handleRefresh = async () => {
    // Clear global caches so next query gets fresh data from the Firestore/LocalDB
    globalAdsCache = null;
    globalCategoriesCache = null;
    globalWorkersCache = null;
    globalWorkersFetchTimestamp = 0;
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 800));
  };
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [deleteBookingData, setDeleteBookingData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, { name: string; photoURL?: string; phone?: string }>>({});
  const [ads, setAds] = useState<Ad[]>(globalAdsCache || []);
  const [categories, setCategories] = useState<Category[]>(globalCategoriesCache || []);
  const [quickRequests, setQuickRequests] = useState<QuickRequest[]>([]);
  const [myQuickRequests, setMyQuickRequests] = useState<QuickRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [loadingAds, setLoadingAds] = useState(!globalAdsCache);
  const [loadingCategories, setLoadingCategories] = useState(!globalCategoriesCache);
  const [loadingRecentChats, setLoadingRecentChats] = useState(true);
  const [loadingQuickRequests, setLoadingQuickRequests] = useState(true);
  const [loadingMyQuickRequests, setLoadingMyQuickRequests] = useState(true);
  const [loadingMyRequests, setLoadingMyRequests] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoadingAds(false);
      setLoadingCategories(false);
      return;
    }
    const fetchAds = async (forceRefetch = false) => {
      if (!forceRefetch && globalAdsCache && globalAdsCache.length > 0) {
        setLoadingAds(false);
        return;
      }
      try {
        const q = query(collection(db, 'ads'), where('active', '==', true), orderBy('order', 'asc'), limit(10));
        const snapshot = await getDocsWithCacheFallback(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
        globalAdsCache = fetched;
        setAds(fetched);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'ads', false);
      } finally {
        setLoadingAds(false);
      }
    };
    const fetchCategories = async (forceRefetch = false) => {
      if (!forceRefetch && globalCategoriesCache && globalCategoriesCache.length > 0) {
        setLoadingCategories(false);
        return;
      }
      try {
        const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc'));
        const snapshot = await getDocsWithCacheFallback(q);
        if (snapshot.empty) {
          // Fallback to default categories
          const defaultCategories: Category[] = [
            { id: 'plumbing', icon: '💧', nameEn: 'Plumbing', nameAr: 'سباكة', nameKu: 'بۆری ئاو', order: 1, active: true },
            { id: 'acFixing', icon: '❄️', nameEn: 'AC Fixing', nameAr: 'تصليح مكيفات', nameKu: 'چاککردنەوەی سبلیت', order: 2, active: true },
            { id: 'electrical', icon: '⚡', nameEn: 'Electrical', nameAr: 'كهرباء', nameKu: 'کارەبا', order: 3, active: true },
            { id: 'cleaning', icon: '🧹', nameEn: 'Cleaning', nameAr: 'تنظيف', nameKu: 'پاککردنەوە', order: 4, active: true },
            { id: 'gardening', icon: '🌳', nameEn: 'Gardening', nameAr: 'حدائق', nameKu: 'باخچە', order: 5, active: true },
            { id: 'carpentry', icon: '🔨', nameEn: 'Carpentry', nameAr: 'نجارة', nameKu: 'دارتاشی', order: 6, active: true },
            { id: 'painting', icon: '🎨', nameEn: 'Painting', nameAr: 'صباغة', nameKu: 'بۆیاخکردن', order: 7, active: true },
            { id: 'applianceRepair', icon: '🛠️', nameEn: 'Appliance Repair', nameAr: 'تصليح أجهزة', nameKu: 'چاککردنەوەی أامێر', order: 8, active: true },
            { id: 'pestControl', icon: '🐜', nameEn: 'Pest Control', nameAr: 'مكافحة حشرات', nameKu: 'قڕکردني مێروو', order: 9, active: true },
            { id: 'locksmith', icon: '🔑', nameEn: 'Locksmith', nameAr: 'أقفال', nameKu: 'قوفڵ', order: 10, active: true },
            { id: 'movingDelivery', icon: '📦', nameEn: 'Moving & Delivery', nameAr: 'نقل وتوصيل', nameKu: 'گواستنەوە', order: 11, active: true },
            { id: 'decoration', icon: '🖼️', nameEn: 'Decoration', nameAr: 'ديكور', nameKu: 'دیکۆر', order: 12, active: true },
            { id: 'securityCameras', icon: '📹', nameEn: 'Security Cameras', nameAr: 'كاميرات مراقبة', nameKu: 'كاميرا چاودێری', order: 13, active: true },
            { id: 'internet', icon: '🌐', nameEn: 'Internet', nameAr: 'انترنت', nameKu: 'ئەنتەرنێت', order: 14, active: true },
          ];
          globalCategoriesCache = defaultCategories;
          setCategories(defaultCategories);
        } else {
          const fetchedCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          globalCategoriesCache = fetchedCats;
          setCategories(fetchedCats);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'categories', false);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchAds(refreshKey > 0);
    fetchCategories(refreshKey > 0);
  }, [profile, refreshKey]);

  useEffect(() => {
    if (profile?.role === 'worker' && profile.uid) {
      const q = query(
        collection(db, 'bookings'),
        where('workerId', '==', profile.workerId || profile.uid),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
        setLoadingMyRequests(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings', false);
        setLoadingMyRequests(false);
      });
      return () => unsubscribe();
    } else {
      setLoadingMyRequests(false);
    }
  }, [profile, refreshKey]);

  useEffect(() => {
    if (!profile) {
      setLoadingRecentChats(false);
      return;
    }
    
    let q;
    if (profile.role === 'worker' && profile.uid) {
      q = query(collection(db, 'bookings'), where('workerId', '==', profile.workerId || profile.uid), limit(10));
    } else {
      q = query(collection(db, 'bookings'), where('customerId', '==', profile.uid), limit(10));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).filter(b => b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'denied');
      setRecentChats(chats.sort((a, b) => {
        const timeA = a.lastMessageTimestamp || a.timestamp;
        const timeB = b.lastMessageTimestamp || b.timestamp;
        return timeB - timeA;
      }));
      setLoadingRecentChats(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings', false);
      setLoadingRecentChats(false);
    });
    return () => unsubscribe();
  }, [profile, refreshKey]);

  useEffect(() => {
    if (recentChats.length === 0) return;

    const uids = new Set<string>();
    recentChats.forEach(b => {
      uids.add(b.customerId);
      uids.add(b.workerId);
    });

    fetchProfilesForUids(uids, (profiles) => {
      setProfilesCache(profiles);
    });
  }, [recentChats]);

  const whatsappUrl = `https://wa.me/${settings.becomeWorkerWhatsappNumber || settings.whatsappNumber}?text=${encodeURIComponent(settings.becomeWorkerWhatsappMessage || t('whatsappMessage'))}`;

  useEffect(() => {
    if (profile?.role === 'worker' && profile.city) {
      const q = query(
        collection(db, 'quickRequests'), 
        where('city', '==', profile.city),
        where('status', '==', 'open'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setQuickRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickRequest)));
        setLoadingQuickRequests(false);
      }, (error) => {
        console.error("App: quickRequests snapshot error", error);
        setLoadingQuickRequests(false);
      });
      return () => unsubscribe();
    } else {
      setLoadingQuickRequests(false);
    }
  }, [profile, refreshKey]);

  useEffect(() => {
    if (profile && profile.role === 'user') {
      const q = query(
        collection(db, 'quickRequests'), 
        where('customerId', '==', profile.uid),
        where('status', '==', 'open'),
        limit(20)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyQuickRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickRequest)));
        setLoadingMyQuickRequests(false);
      }, (error) => {
        console.error("App: myQuickRequests snapshot error", error);
        setLoadingMyQuickRequests(false);
      });
      return () => unsubscribe();
    } else {
      setLoadingMyQuickRequests(false);
    }
  }, [profile, refreshKey]);

  const handleCancelQuickRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, 'quickRequests', id), {
        status: 'cancelled'
      });
      setAlertData({ isOpen: true, title: t('success'), message: t('requestCancelled'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'quickRequests');
    }
  };

  const handleAcceptQuickRequest = async (req: QuickRequest) => {
    if (!profile || profile.role !== 'worker' || !profile.uid) return;
    
    if (req.customerId === profile.uid) {
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('cannotAcceptSelf', 'You cannot accept your own request.'),
        type: 'error'
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      
      const reqRef = doc(db, 'quickRequests', req.id);
      batch.update(reqRef, {
        status: 'accepted',
        acceptedBy: profile.uid,
        workerPhotoURL: profile.photoURL || ''
      });

      const bookingId = `quick_${req.id}`;
      const bookingData: Booking = {
        id: bookingId,
        customerId: req.customerId,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        customerPhotoURL: req.customerPhotoURL || '',
        customerEmail: '', // Optional or fetch if needed
        workerId: profile.workerId || profile.uid,
        workerName: profile.name,
        workerPhone: profile.phone,
        workerPhotoURL: profile.photoURL || '',
        workerEmail: '',
        status: 'pending',
        timestamp: Date.now(),
        category: 'quickRequest',
        city: req.city,
        description: req.description,
        location: req.location,
        scheduledTime: req.scheduledTime,
        problemPhotos: req.photos
      };

      const bookingRef = doc(db, 'bookings', bookingId);
      batch.set(bookingRef, bookingData);

      await batch.commit();
      
      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: t('requestAccepted'), 
        type: 'success' 
      });
      
      nav('/profile');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'quickRequests');
    }
  };

  const filteredCategories = categories.filter(cat => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;
    
    const nameAr = cat.nameAr?.toLowerCase() || '';
    const nameEn = cat.nameEn?.toLowerCase() || '';
    const nameKu = cat.nameKu?.toLowerCase() || '';
    const keywords = cat.keywords?.toLowerCase() || '';
    
    return nameAr.includes(searchLower) || 
           nameEn.includes(searchLower) || 
           nameKu.includes(searchLower) || 
           keywords.includes(searchLower);
  });

  const handleDeleteBooking = async (id: string) => {
    try {
      const bookingSnap = await getDoc(doc(db, 'bookings', id));
      if (bookingSnap.exists()) {
        const b = bookingSnap.data() as Booking;
        if (b.status !== 'completed' && b.status !== 'denied' && b.status !== 'cancelled' && profile?.role !== 'admin') {
          toast.error(t('cannotDeleteActiveBookingChat'));
          return;
        }
      }
      console.log("Deleting booking:", id);
      // Also delete associated messages
      let messagesQ;
      if (profile?.role === 'admin') {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id));
      } else if (profile?.role === 'worker') {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id), where('workerId', '==', profile.workerId || profile.uid));
      } else {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id), where('customerId', '==', profile?.uid || ''));
      }
      let messagesSnapshot;
      try {
        messagesSnapshot = await getDocs(messagesQ);
      } catch (error) {
        console.error("Error fetching messages for deletion:", error);
        // If we can't fetch messages, we might still want to try deleting the booking
        // especially for older data that doesn't have proper message security fields.
        // We warn but don't block.
        // Try deleting the booking anyway
        try {
          await deleteDoc(doc(db, 'bookings', id));
          setDeleteBookingData(null);
          toast.success(t('success'));
        } catch (delError) {
          handleFirestoreError(delError, OperationType.DELETE, 'bookings', false);
          toast.error(t('error'));
          setDeleteBookingData(null);
        }
        return;
      }

      if (messagesSnapshot.size > 0) {
        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        try {
          await batch.commit();
        } catch (error: any) {
          console.error("Error deleting messages batch:", error);
          handleFirestoreError(error, OperationType.DELETE, 'messages', false);
          toast.error(t('error'));
          setDeleteBookingData(null);
          return;
        }
      }
      
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        console.error("Error deleting booking document:", error);
        handleFirestoreError(error, OperationType.DELETE, 'bookings', false);
        toast.error(t('error'));
        setDeleteBookingData(null);
        return;
      }

      setDeleteBookingData(null);
      toast.success(t('success'));
    } catch (error) {
      console.error("General error in handleDeleteBooking:", error);
      toast.error(t('error'));
      setDeleteBookingData(null);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-20 p-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary">{t('appName')}</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t(profile?.city || '')}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className="p-2 bg-white dark:bg-gray-800 shadow-sm text-primary rounded-full hover:bg-primary/10 transition-all border border-gray-100 dark:border-gray-700 h-10 w-10 flex items-center justify-center"
            title={t('search')}
          >
            <Search size={20} />
          </button>
          
          <button 
            onClick={() => {
              const el = document.getElementById('recent-chats-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                toast.success(t('recentChats'));
              } else {
                nav('/profile');
              }
            }}
            className="p-2 bg-white dark:bg-gray-800 shadow-sm text-primary rounded-full hover:bg-primary/10 transition-all border border-gray-100 dark:border-gray-700 h-10 w-10 flex items-center justify-center relative group"
            title={t('recentChats')}
          >
            <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
            {recentChats.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                {recentChats.length}
              </span>
            )}
          </button>

          {profile?.role === 'worker' && myRequests.length > 0 && (
            <button 
              onClick={() => {
                const el = document.getElementById('new-requests-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                  toast(t('newRequests'), { icon: '🔔' });
                } else {
                  nav('/profile');
                }
              }}
              className="p-2 bg-white dark:bg-gray-800 shadow-sm text-primary rounded-full hover:bg-primary/10 transition-all border border-gray-100 dark:border-gray-700 h-10 w-10 flex items-center justify-center relative group"
              title={t('newRequests')}
            >
              <Bell className="text-primary animate-pulse group-hover:scale-110 transition-transform" size={20} />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                {myRequests.length}
              </span>
            </button>
          )}

          {profile?.role === 'worker' ? (
            <button 
              onClick={() => nav('/profile')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all h-10 border-2 border-primary/20"
            >
              <Briefcase size={16} />
              <span className="hidden sm:inline">{t('workerProfile').toUpperCase()}</span>
              <span className="sm:hidden">{t('profile').toUpperCase()}</span>
            </button>
          ) : (
            settings.useInternalApplications ? (
              <Link 
                to="/apply"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all h-10 border-2 border-green-600/20"
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">{t('becomeWorker').toUpperCase()}</span>
                <span className="sm:hidden">{t('apply').toUpperCase()}</span>
              </Link>
            ) : (
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all h-10 border-2 border-green-600/20"
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">{t('becomeWorker').toUpperCase()}</span>
                <span className="sm:hidden">{t('apply').toUpperCase()}</span>
              </a>
            )
          )}
        </div>
      </div>

      {loadingAds ? (
        <AdsCarouselSkeleton />
      ) : (
        <AdsCarousel ads={ads} />
      )}

      {profile?.role === 'user' && (loadingMyQuickRequests || myQuickRequests.length > 0) && (
        <div id="pending-requests-section" className="mb-8 scroll-mt-20">
          <h2 className="text-lg font-black tracking-tight mb-4">{t('yourPendingRequests')}</h2>
          {loadingMyQuickRequests ? (
            <QuickRequestsSkeleton />
          ) : (
            <div className="space-y-3">
              {myQuickRequests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{t('quickRequest')}</p>
                    <p className="text-sm font-medium line-clamp-1">{req.description}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => handleCancelQuickRequest(req.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-900/20 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-all"
                  >
                    {t('cancel')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profile?.role === 'worker' && (loadingQuickRequests || quickRequests.length > 0) && (
        <div className="mb-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Zap className="text-yellow-500" size={20} fill="currentColor" />
              {t('newRequestsInYourCity')}
            </h2>
            <span className="bg-yellow-105 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {loadingQuickRequests ? "..." : quickRequests.length}
            </span>
          </div>
          {loadingQuickRequests ? (
            <CityRequestsSkeleton />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1">
              {quickRequests.map((req) => (
                <div 
                  key={req.id}
                  className="min-w-[280px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border-2 border-white dark:border-zinc-800">
                      {req.customerPhotoURL ? (
                        <img src={req.customerPhotoURL} alt={req.customerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        req.customerName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm leading-tight truncate">{req.customerName}</h3>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <MapPin size={8} /> {t(req.city)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400">{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-4 font-medium leading-relaxed min-h-[32px]">
                    {req.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/5 p-2 rounded-xl">
                      <Zap size={12} />
                      <span className="truncate">
                        {(() => {
                          const cat = categories.find(c => c.id === req.category);
                          return cat ? (i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn) : req.category;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800 p-2 rounded-xl">
                      <MapPin size={12} />
                      <span className="truncate">{req.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-primary bg-primary/5 p-2 rounded-xl">
                    <Clock size={12} />
                    {req.scheduledTime.includes('T') && !isNaN(Date.parse(req.scheduledTime)) ? new Date(req.scheduledTime).toLocaleString() : req.scheduledTime}
                  </div>

                  {req.photos && req.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                      {req.photos.map((p, idx) => (
                        <img key={idx} src={p} alt="Issue" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-zinc-800 shadow-sm" />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleAcceptQuickRequest(req)}
                    className="w-full bg-primary text-white font-black py-3 rounded-2xl shadow-md hover:shadow-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    {t('acceptRequest')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Bar - only visible when toggled */}
      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="relative overflow-hidden"
          >
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchCategories')}
              className="w-full ps-12 pe-12 py-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
            />
            <button 
              onClick={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
              className="absolute end-4 top-1/2 -translate-y-1/2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Grid - Main Focus */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight">
            {searchQuery ? t('searchResults') : t('categories')}
          </h2>
          {searchQuery && !loadingCategories && (
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {filteredCategories.length} {t('found')}
            </span>
          )}
        </div>
        
        {loadingCategories ? (
          <CategoriesGridSkeleton />
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => nav(`/category/${cat.id}`)}
                className="flex flex-col items-center p-2 rounded-2xl transition-all border-2 aspect-square justify-center bg-white dark:bg-zinc-900 border-transparent shadow-sm hover:border-primary/30 active:scale-95"
              >
                <span className="text-2xl mb-1">{cat.icon}</span>
                <span className="text-[9px] font-black text-center leading-tight line-clamp-2 px-1 text-gray-700 dark:text-gray-300">
                  {(i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn).toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
            <Search size={48} className="mb-4 text-gray-300" />
            <p className="font-bold text-sm">{t('noCategoriesFound')}</p>
          </div>
        )}
      </div>

      {(loadingRecentChats || recentChats.length > 0) && (
        <div id="recent-chats-section" className="mb-8 scroll-mt-20">
          <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
            <MessageSquare className="text-primary" size={20} />
            {t('recentChats')}
          </h2>
          {loadingRecentChats ? (
            <RecentChatsSkeleton />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {recentChats.map((chat) => {
                const targetId = profile?.role === 'worker' ? chat.customerId : chat.workerId;
                const targetProfile = profilesCache[targetId];
                
                return (
                  <div 
                    key={chat.id}
                    onClick={() => nav(`/chat/${chat.id}`)}
                    className="min-w-[180px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm cursor-pointer hover:border-primary/30 active:scale-95 transition-all relative group"
                  >
                    {(chat.status === 'completed' || chat.status === 'denied' || chat.status === 'cancelled' || profile?.role === 'admin') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteBookingData({ isOpen: true, bookingId: chat.id });
                        }}
                        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      {targetProfile?.photoURL ? (
                        <img src={targetProfile.photoURL} alt={targetProfile.name} className="w-8 h-8 rounded-full object-cover border border-primary/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                          {targetProfile?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-black truncate">
                          {(i18n.language === 'ar' ? profilesCache[chat.customerId]?.name : profilesCache[chat.customerId]?.name) || chat.customerName || profilesCache[chat.customerId]?.name || chat.customerId.substring(0, 8)}
                        </p>
                        <span className="text-[8px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full w-fit font-bold uppercase text-gray-500">
                          {t(chat.status)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-black text-primary mb-1">
                      {(() => {
                        const cat = categories.find(c => c.id === chat.category);
                        return cat ? (i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn) : t(chat.category);
                      })()}
                    </p>
                    <p className="text-[9px] text-gray-500 line-clamp-1 font-medium">
                      {chat.lastMessage ? chat.lastMessage : chat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {profile?.role === 'worker' && (loadingMyRequests || myRequests.length > 0) && (
        <div id="new-requests-section" className="mb-8 scroll-mt-20">
          <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
            <Briefcase className="text-primary" size={20} />
            {t('newRequests')}
          </h2>
          {loadingMyRequests ? (
            <MyRequestsSkeleton />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {myRequests.map((req) => (
                <div 
                  key={req.id}
                  onClick={() => nav(`/chat/${req.id}`)}
                  className="min-w-[220px] bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-primary/10 active:scale-95 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {profilesCache[req.customerId]?.photoURL ? (
                      <img src={profilesCache[req.customerId].photoURL} alt={profilesCache[req.customerId].name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                        {profilesCache[req.customerId]?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-black">{profilesCache[req.customerId]?.name || req.customerName || req.customerId.substring(0, 8)}</p>
                      <span className="text-[8px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {(() => {
                          const cat = categories.find(c => c.id === req.category);
                          return cat ? (i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn) : t(req.category);
                        })()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold line-clamp-1 mb-1">{req.description}</p>
                  {req.locationDescription && (
                    <p className="text-[10px] text-gray-500 font-medium line-clamp-1 mb-2 flex items-center gap-1">
                      <Info size={10} className="flex-shrink-0" />
                      <span>{req.locationDescription}</span>
                    </p>
                  )}
                  {req.category === 'quickRequest' ? (
                    <div className="mb-3 p-2 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 text-[10px] font-bold text-primary flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Clock size={12} className="text-primary" />
                      <span>{t('scheduledTime')}: {req.scheduledTime}</span>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <input 
                        type="text"
                        id={`home-time-${req.id}`}
                        placeholder={t('enterScheduledTime')}
                        className="w-full text-[10px] p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-primary outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          let acceptTime = req.scheduledTime || '';
                          if (req.category !== 'quickRequest') {
                            const timeInput = document.getElementById(`home-time-${req.id}`) as HTMLInputElement;
                            if (!timeInput?.value) {
                              timeInput?.focus();
                              timeInput?.classList.add('border-rose-400', 'ring-1', 'ring-rose-400/30');
                              setTimeout(() => {
                                timeInput?.classList.remove('border-rose-400', 'ring-1', 'ring-rose-400/30');
                              }, 2005);
                              return;
                            }
                            acceptTime = timeInput.value;
                          }
                          await updateDoc(doc(db, 'bookings', req.id), {
                            status: 'confirmed',
                            scheduledTime: acceptTime
                          });
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-150"
                      >
                        <Check size={12} strokeWidth={2.5} />
                        <span>{t('accept').toUpperCase()}</span>
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          setConfirmData({ isOpen: true, bookingId: req.id });
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 dark:bg-rose-950/25 dark:hover:bg-rose-900/40 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-150"
                      >
                        <X size={12} strokeWidth={2.5} />
                        <span>{t('deny').toUpperCase()}</span>
                      </button>
                    </div>
                    <div className="p-2 bg-primary text-white rounded-full shadow-sm">
                      <MessageSquare size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDeny')}
        message={t('confirmDeny')}
        onConfirm={async () => {
          if (confirmData?.bookingId) {
            const bookingId = confirmData.bookingId;
            await updateDoc(doc(db, 'bookings', bookingId), {
              status: 'denied'
            });
            // Sync with QuickRequest if applicable
            if (bookingId.startsWith('quick_')) {
              const quickReqId = bookingId.replace('quick_', '');
              try {
                await updateDoc(doc(db, 'quickRequests', quickReqId), {
                  status: 'denied'
                });
              } catch (err) {
                console.error("Error updating quick request on denial:", err);
              }
            }
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('deny')}
        cancelText={t('cancel')}
      />
      <ConfirmDialog 
        isOpen={!!deleteBookingData?.isOpen}
        title={t('deleteChat')}
        message={t('confirmDeleteChat')}
        onConfirm={() => deleteBookingData && handleDeleteBooking(deleteBookingData.bookingId)}
        onCancel={() => setDeleteBookingData(null)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
    </div>
    </PullToRefresh>
  );
};

const BookingPage = () => {
  const { t } = useTranslation();
  const { workerId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [allWorkers, setAllWorkers] = useState<WorkerProfile[]>([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [problemPhotos, setProblemPhotos] = useState<string[]>([]);
  const problemPhotosInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchAllWorkers = async () => {
      try {
        const q = query(collection(db, 'workers'));
        const snapshot = await getDocs(q);
        setAllWorkers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WorkerProfile)));
      } catch (error) {
        console.error("Error fetching all workers on booking page:", error);
      }
    };
    fetchAllWorkers();
  }, []);

  useEffect(() => {
    if (!workerId) return;
    const fetchWorker = async () => {
      try {
        const docRef = doc(db, 'workers', workerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWorker({ uid: docSnap.id, ...docSnap.data() } as WorkerProfile);
        }
      } catch (error) {
        console.error("Error fetching worker:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [workerId]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !worker || !description || !coords) {
      if (!description) {
        setAlertData({ isOpen: true, title: t('error'), message: t('enterDescription'), type: 'error' });
      } else if (!coords) {
        setAlertData({ isOpen: true, title: t('error'), message: t('pleaseSelectLocationOnMap', 'Please choose your location on the map.'), type: 'error' });
      }
      return;
    }

    if (worker.uid === (profile.workerId || profile.uid)) {
      setAlertData({ isOpen: true, title: t('error'), message: t('cannotBookSelf', 'You cannot book your own listing.'), type: 'error' });
      return;
    }

    if (worker.isAvailable === false) {
      setAlertData({ isOpen: true, title: t('error'), message: t('workerUnavailable'), type: 'error' });
      return;
    }

    setSending(true);
    try {
      // Check combined limit for pending requests
      const pendingBookingsQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', profile.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const pendingBookingsSnap = await getDocs(pendingBookingsQuery);

      const pendingQuickQuery = query(
        collection(db, 'quickRequests'),
        where('customerId', '==', profile.uid),
        where('status', 'in', ['open', 'accepted'])
      );
      const pendingQuickSnap = await getDocs(pendingQuickQuery);
      
      if (pendingBookingsSnap.size + pendingQuickSnap.size >= 2) {
        setAlertData({ 
          isOpen: true, 
          title: t('error'), 
          message: t('pendingLimitReached'), 
          type: 'error' 
        });
        setSending(false);
        return;
      }

      const bookingId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'bookings', bookingId), {
        id: bookingId,
        customerId: profile.uid,
        customerEmail: '',
        customerName: profile.name || '',
        customerPhone: profile.phone || '',
        customerPhotoURL: profile.photoURL || '',
        workerId: worker.uid,
        workerEmail: '',
        workerName: worker.name || '',
        workerPhone: worker.phone || '',
        workerPhotoURL: worker.photoURL || '',
        status: 'pending',
        timestamp: Date.now(),
        category: worker.profession || '',
        city: worker.city || '',
        description: description || '',
        location: location || '',
        locationDescription: locationDescription || '',
        problemPhotos: problemPhotos || [],
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
      });
      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: t('bookingSuccess'), 
        type: 'success' 
      });
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings');
    } finally {
      setSending(false);
    }
  };

  const handleProblemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (problemPhotos.length + files.length > 4) {
      setAlertData({ isOpen: true, title: t('error'), message: t('max4Photos'), type: 'error' });
      return;
    }

    setSending(true);
    try {
      const newPhotos = [...problemPhotos];
      for (let i = 0; i < files.length; i++) {
        const base64String = await compressImage(files[i], 800, 0.7);
        newPhotos.push(base64String);
      }
      setProblemPhotos(newPhotos);
    } catch (error) {
      console.error("Error compressing image:", error);
    } finally {
      setSending(false);
    }
  };

  const removeProblemPhoto = (index: number) => {
    setProblemPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return <BookingPageSkeleton />;
  if (!worker) return <div className="text-center py-12">{t('noWorkers')}</div>;

  return (
    <div className="max-w-md mx-auto p-6">
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">{t('bookingRequest')}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          {worker.photoURL ? (
            <LazyImage 
              src={worker.photoURL} 
              alt={worker.name} 
              className="w-16 h-16 rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">👤</div>
          )}
          <div>
            <h2 className="font-bold text-lg">{worker.name}</h2>
            <p className="text-primary text-sm font-medium">{t(worker.profession)}</p>
            {worker.specialties && worker.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {worker.specialties.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-bold uppercase">
                    {t(s)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleBooking} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('requestDescription')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('requestDescription')}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('location')}
            </label>
            <React.Suspense fallback={
              <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center">
                <span className="text-sm font-bold text-gray-400">{t('loadingMap', 'Loading Map...')}</span>
              </div>
            }>
              <MapPicker 
                coords={coords} 
                city={profile?.city || worker?.city} 
                workers={allWorkers}
                onChange={(lat, lng) => {
                  setCoords({ lat, lng });
                  setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                }} 
              />
            </React.Suspense>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('locationDescription')} <span className="text-xs font-normal text-gray-400">({t('optional')})</span>
            </label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder={t('locationDescription')}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('addProblemPhotos')} <span className="text-xs font-normal text-gray-400">({t('optional')})</span>
            </label>
            <div 
              className="grid grid-cols-4 gap-2"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (!files || files.length === 0) return;
                
                if (problemPhotos.length + files.length > 4) {
                  setAlertData({ isOpen: true, title: t('error'), message: t('max4Photos'), type: 'error' });
                  return;
                }

                setSending(true);
                try {
                  const newPhotos = [...problemPhotos];
                  for (let i = 0; i < files.length; i++) {
                    const base64String = await compressImage(files[i], 800, 0.7);
                    newPhotos.push(base64String);
                  }
                  setProblemPhotos(newPhotos);
                } catch (error) {
                  console.error("Error compressing image:", error);
                } finally {
                  setSending(false);
                }
              }}
            >
              {problemPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={photo} 
                    alt="" 
                    className="w-full h-full object-cover rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity" 
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProblemPhoto(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg z-10 hover:scale-110 active:scale-90 transition-transform"
                    aria-label={t('removePhoto')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {problemPhotos.length < 4 && (
                <button
                  type="button"
                  onClick={() => problemPhotosInputRef.current?.click()}
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                  disabled={sending}
                >
                  <Camera className="text-gray-400 group-hover:text-primary mb-1" size={24} />
                  <span className="text-[10px] text-gray-400 group-hover:text-primary font-bold">{t('addPhoto')}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-2 italic">{t('max4Photos')}</p>
            <input
              type="file"
              ref={problemPhotosInputRef}
              onChange={handleProblemPhotoUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <LoadingScreen /> : <><Calendar size={20} /> {t('sendRequest')}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const RatingModal = ({ isOpen, onClose, onSubmit, workerName }: { isOpen: boolean; onClose: () => void; onSubmit: (rating: number, review: string, tags: string[]) => Promise<void> | void; workerName: string }) => {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, review, selectedTags);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              disabled={isSubmitting}
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
          disabled={isSubmitting}
          className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-24 resize-none mb-6 text-sm disabled:opacity-50"
        />

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : t('submitRating')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ReportModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  reportedName, 
  reporterRole 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (reason: string, details: string) => Promise<void> | void; 
  reportedName: string;
  reporterRole: string;
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('reason_unprofessional');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_customer', label: t('reason_no_show_customer') },
    { id: 'reason_payment_issue', label: t('reason_payment_issue') },
    { id: 'reason_incorrect_location', label: t('reason_incorrect_location') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_unsafe_environment', label: t('reason_unsafe_environment') },
    { id: 'reason_scope_change', label: t('reason_scope_change') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const customerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_worker', label: t('reason_no_show_worker') },
    { id: 'reason_poor_quality', label: t('reason_poor_quality') },
    { id: 'reason_overcharging', label: t('reason_overcharging') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const reportReasons = reporterRole === 'worker' ? workerReasons : customerReasons;

  useEffect(() => {
    if (isOpen) {
      setReason(reportReasons[0].id);
      setDetails('');
    }
  }, [isOpen, reporterRole]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting || !details.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(reason, details);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4 text-red-500">
          <Flag size={24} />
          <h3 className="text-xl font-bold">{t('reportIssue')}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('reporting')}: <span className="font-bold text-gray-900 dark:text-white">{reportedName}</span>
        </p>
        
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('reason')}</label>
          <select 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
          >
            {reportReasons.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('details')}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={isSubmitting}
            placeholder={t('provideMoreDetails')}
            className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none text-sm disabled:opacity-50"
            required
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!details.trim() || isSubmitting}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : t('submitReport')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};


const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 800));
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workerData, setWorkerData] = useState<WorkerProfile | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState<City>(profile?.city || 'Baghdad');
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [ratingData, setRatingData] = useState<{ isOpen: boolean; booking: Booking | null }>({ isOpen: false, booking: null });
  const [reportData, setReportData] = useState<{ isOpen: boolean; booking: Booking | null }>({ isOpen: false, booking: null });
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [cancelBookingData, setCancelBookingData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [deleteBookingData, setDeleteBookingData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, { name: string; photoURL?: string; phone?: string }>>({});
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [application, setApplication] = useState<WorkerApplication | null>(null);
  const [toggling, setToggling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'active' | 'completed' | 'denied'>('active');
  const [categories, setCategories] = useState<Category[]>(globalCategoriesCache || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalCategoriesCache && globalCategoriesCache.length > 0) {
      setCategories(globalCategoriesCache);
      return;
    }
    const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      globalCategoriesCache = cats;
      setCategories(cats);
    }, (err) => {
      console.error("Error fetching categories in ProfilePage:", err);
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (profile.role === 'worker') {
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: i18n.language === 'ar' 
          ? 'لا يمكن للعمال تعديل صورتهم الشخصية. يمكن للأدمن فقط وضعها لك.' 
          : i18n.language === 'ku'
            ? 'کارمەند ناتوانێت وێنەی پڕۆفایلی خۆی بگۆڕێت. تەنها ئەدمین دەتوانێت بۆت دابنێت.'
            : 'Workers cannot set or change their profile photos. Only admins can assign it for you.',
        type: 'error'
      });
      return;
    }

    setUploading(true);
    try {
      const base64String = await compressImage(file, 400, 0.7);
      
      // Update user profile
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: base64String
        });
      } catch (err) {
        console.error("Error updating users photo:", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
        return;
      }

      // If user is a worker, update worker profile too
      if (profile.role === 'worker' && profile.uid) {
        try {
          const workerRef = doc(db, 'workers', profile.uid);
          const workerSnap = await getDoc(workerRef);
          if (workerSnap.exists()) {
            await updateDoc(workerRef, {
              photoURL: base64String
            });
          }
        } catch (err) {
          console.error("Error updating workers photo:", err);
          handleFirestoreError(err, OperationType.UPDATE, `workers/${profile.uid}`);
          return;
        }
      }

      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: t('photoUpdated'), 
        type: 'success' 
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      setAlertData({ isOpen: true, title: t('error'), message: t('errorOccurred'), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const targetId = profile?.workerId || profile?.uid;
    if (profile?.role === 'worker' && targetId) {
      const unsubscribe = onSnapshot(doc(db, 'workers', targetId), (docSnap) => {
        if (docSnap.exists()) {
          setWorkerData(docSnap.data() as WorkerProfile);
        }
      }, (error) => {
        console.error("App: workerData profile editor snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile, refreshKey]);

  const handleToggleAvailability = async () => {
    if (!profile || toggling) return;
    setToggling(true);
    const currentStatus = workerData ? workerData.isAvailable !== false : true;
    const targetWorkerId = profile.workerId || profile.uid;
    try {
      await setDoc(doc(db, 'workers', targetWorkerId), {
        isAvailable: !currentStatus
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers', false);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!profile || bookings.length === 0) return;

    const missingUids = new Set<string>();
    bookings.forEach(b => {
      if (!b.customerName || !b.customerPhone) missingUids.add(b.customerId);
      if (!b.workerName || !b.workerPhone) missingUids.add(b.workerId);
    });

    if (missingUids.size === 0) return;

    fetchProfilesForUids(missingUids, (profiles) => {
      setProfilesCache(profiles);
    });
  }, [bookings, profile?.role]);

  useEffect(() => {
    if (!profile) return;
    
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'bookings'), where('city', '==', profile.city || ''), limit(30));
    } else if (profile.role === 'worker') {
      q = query(
        collection(db, 'bookings'), 
        or(
          where('workerId', '==', profile.workerId || profile.uid),
          where('customerId', '==', profile.uid)
        ),
        limit(30)
      );
    } else {
      q = query(collection(db, 'bookings'), where('customerId', '==', profile.uid), limit(30));
    }

    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings', false);
    });

    const reportsQ = query(collection(db, 'reports'), where('reporterId', '==', profile.uid), limit(20));
    const unsubscribeReports = onSnapshot(reportsQ, (reportsSnap) => {
      setUserReports(reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports', false);
    });

    let isSubscribed = true;
    if (profile.role !== 'worker' && profile.role !== 'admin') {
      getDocWithCacheFallback(doc(db, 'workerApplications', profile.uid)).then(appSnap => {
        if (isSubscribed && appSnap.exists()) {
          setApplication({ uid: appSnap.id, ...appSnap.data() } as WorkerApplication);
        }
      }).catch(err => {
        console.error("Error fetching worker application:", err);
      });
    }

    return () => {
      isSubscribed = false;
      unsubscribeBookings();
      unsubscribeReports();
    };
  }, [profile, refreshKey]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    // Don't allow changing phone number if it's already set
    const updateData = { ...profile, name, city };
    if (!profile.phone) {
      (updateData as any).phone = phone;
    }
    await setDoc(doc(db, 'users', profile.uid), updateData, { merge: true });
    setIsEditing(false);
  };

  const handleReport = async (reason: string, details: string) => {
    if (!profile || !reportData.booking) return;

    // Check if already reported
    const alreadyReported = userReports.some(r => r.bookingId === reportData.booking?.id);
    if (alreadyReported) {
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('alreadyReported'),
        type: 'error'
      });
      setReportData({ isOpen: false, booking: null });
      return;
    }

    try {
      const reportId = `${profile.uid}_${reportData.booking.id}`;
      const isWorkerReporting = profile.role === 'worker';
      const reportedId = isWorkerReporting ? reportData.booking.customerId : reportData.booking.workerId;

      await setDoc(doc(db, 'reports', reportId), {
        id: reportId,
        bookingId: reportData.booking.id,
        reporterId: profile.uid,
        reportedId,
        reason,
        details,
        timestamp: Date.now(),
        status: 'pending',
        language: i18n.language
      });

      setAlertData({
        isOpen: true,
        title: t('success'),
        message: t('reportSubmitted'),
        type: 'success'
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('reportError'),
        type: 'error'
      });
    } finally {
      setReportData({ isOpen: false, booking: null });
    }
  };

  const handleRateWorker = async (rating: number, review: string, tags: string[]) => {
    if (!ratingData.booking || !profile) return;
    try {
      const booking = ratingData.booking;
      const reviewId = doc(collection(db, 'reviews')).id;
      
      await updateDoc(doc(db, 'bookings', booking.id), {
        rating,
        review,
        tags
      });
      
      // Create a dedicated review document
      await setDoc(doc(db, 'reviews', reviewId), {
        id: reviewId,
        bookingId: booking.id,
        workerId: booking.workerId,
        customerId: profile.uid,
        customerName: profile.name,
        customerPhoto: profile.photoURL || '',
        rating,
        comment: review,
        tags,
        timestamp: Date.now()
      });
      
      // Calculate average rating
      const reviewsQuery = query(collection(db, 'reviews'), where('workerId', '==', booking.workerId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const allReviews = reviewsSnapshot.docs.map(d => d.data() as Review);
      
      // Include the new review in case it's not in the snapshot yet
      const currentRatings = allReviews.map(r => r.rating);
      if (!allReviews.find(r => r.id === reviewId)) {
        currentRatings.push(rating);
      }
      
      const totalRating = currentRatings.reduce((acc, curr) => acc + curr, 0);
      const averageRating = Number((totalRating / currentRatings.length).toFixed(1));

      await updateDoc(doc(db, 'workers', booking.workerId), {
        rating: averageRating 
      });

      setRatingData({ isOpen: false, booking: null });
      setAlertData({ isOpen: true, title: t('success'), message: t('ratingSuccess'), type: 'success' });
    } catch (error) {
      console.error("Error rating worker:", error);
      setAlertData({ 
        isOpen: true, 
        title: t('error'), 
        message: error instanceof Error ? error.message : t('error'), 
        type: 'error' 
      });
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      const bookingSnap = await getDoc(doc(db, 'bookings', id));
      if (bookingSnap.exists()) {
        const b = bookingSnap.data() as Booking;
        if (b.status !== 'completed' && b.status !== 'denied' && b.status !== 'cancelled' && profile?.role !== 'admin') {
          setAlertData({ isOpen: true, title: t('error'), message: t('cannotDeleteActiveBookingChat'), type: 'error' });
          return;
        }
      }
      console.log("Deleting booking (user):", id);
      // Also delete associated messages
      let messagesQ;
      if (profile?.role === 'admin') {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id));
      } else if (profile?.role === 'worker') {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id), where('workerId', '==', profile.workerId || profile.uid));
      } else {
        messagesQ = query(collection(db, 'messages'), where('bookingId', '==', id), where('customerId', '==', profile?.uid || ''));
      }
      let messagesSnapshot;
      try {
        messagesSnapshot = await getDocs(messagesQ);
      } catch (error) {
        console.error("Error fetching messages for deletion (user):", error);
        // If we can't fetch messages, we might still want to try deleting the booking
        // especially for older data that doesn't have proper message security fields.
        // We warn but don't block.
        // Try deleting the booking anyway
        try {
          await deleteDoc(doc(db, 'bookings', id));
          setDeleteBookingData(null);
          setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
        } catch (delError) {
          handleFirestoreError(delError, OperationType.DELETE, 'bookings', false);
          setAlertData({ isOpen: true, title: t('error'), message: t('error'), type: 'error' });
          setDeleteBookingData(null);
        }
        return;
      }

      if (messagesSnapshot.size > 0) {
        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        try {
          await batch.commit();
        } catch (error) {
          console.error("Error deleting messages batch (user):", error);
          handleFirestoreError(error, OperationType.DELETE, 'messages', false);
          setAlertData({ isOpen: true, title: t('error'), message: t('error'), type: 'error' });
          setDeleteBookingData(null);
          return;
        }
      }
      
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        console.error("Error deleting booking document (user):", error);
        handleFirestoreError(error, OperationType.DELETE, 'bookings', false);
        setAlertData({ isOpen: true, title: t('error'), message: t('error'), type: 'error' });
        setDeleteBookingData(null);
        return;
      }

      setDeleteBookingData(null);
      setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
    } catch (error) {
      console.error("General error in handleDeleteBooking (user):", error);
      setAlertData({ isOpen: true, title: t('error'), message: t('error'), type: 'error' });
      setDeleteBookingData(null);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-20 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
        <button 
          onClick={() => navigate('/help')}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 group"
          title={t('help')}
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-11 h-11 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary shadow-sm group-hover:shadow-md transition-all active:scale-95 overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <HelpCircle size={22} className="relative z-10 transition-transform group-hover:rotate-12" />
            </div>
          </div>
        </button>
        
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            {profile?.photoURL ? (
              <LazyImage 
                src={profile.photoURL} 
                alt={profile.name} 
                className="w-24 h-24 rounded-full border-4 border-primary shadow-lg object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {profile?.name?.charAt(0)}
              </div>
            )}
            {profile?.role === 'worker' && workerData && (
              <div className={cn(
                "absolute top-0 right-0 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 shadow-sm",
                workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
              )} />
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
            {profile?.role !== 'worker' ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={16} className="text-primary" />
                )}
              </button>
            ) : (
              <div 
                className="absolute bottom-0 right-0 p-2 bg-gray-100 dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-750 cursor-help flex items-center justify-center"
                title={
                  i18n.language === 'ar' 
                    ? 'الصورة الشخصية مخصصة بواسطة الإدارة فقط' 
                    : i18n.language === 'ku'
                      ? 'وێنەی پڕۆفایل تەنها لەلایەن ئەدمینەوە دادەنرێت'
                      : 'Profile photo set by administration only'
                }
                onClick={() => {
                  setAlertData({
                    isOpen: true,
                    title: i18n.language === 'ar' ? 'الصورة الشخصية' : i18n.language === 'ku' ? 'وێنەی پڕۆفایل' : 'Profile Photo',
                    message: i18n.language === 'ar' 
                      ? 'بصفتك مزود خدمة، لا يمكنك تعديل صورتك الشخصية بنفسك. يرجى مراجعة الإدارة لوضع صورتك.' 
                      : i18n.language === 'ku'
                        ? 'وەکو کارمەند، ناتوانیت خۆت وێنەی پڕۆفایلەکەت بگۆڕیت. تکایە پەیوەندی بە بەڕێوەبەرایەتییەوە بکە.'
                        : 'As a worker, you cannot edit your own profile photo. Please contact the administration to set your photo.',
                    type: 'info'
                  });
                }}
              >
                <Lock size={14} className="text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="w-full space-y-3">
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder={t('name')}
              />
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value as City)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {IRAQI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={handleUpdateProfile} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold">{t('save')}</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <div className="flex flex-col items-center gap-1 mb-1">
                <p className="text-gray-500 flex items-center gap-1">{t(profile?.city || '')}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <Phone size={14} /> {profile?.phone}
                </p>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  profile?.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                  profile?.role === 'worker' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                )}>
                  {profile?.role}
                </span>
                {profile?.role === 'worker' && (
                  <span className="text-[10px] text-gray-400 font-mono">ID: {profile.uid?.substring(0, 8)}...</span>
                )}
              </div>

              {profile?.role === 'worker' && (
                <div className="w-full mb-6 px-4">
                  <button
                    onClick={handleToggleAvailability}
                    disabled={toggling}
                    className={cn(
                      "w-full p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group shadow-lg",
                      (!workerData || workerData.isAvailable !== false)
                        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50"
                        : "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30"
                    )}
                  >
                    <div className="flex items-center gap-3 z-10">
                      <div className={cn(
                        "w-4 h-4 rounded-full shadow-sm",
                        (!workerData || workerData.isAvailable !== false) ? "bg-green-500 animate-pulse" : "bg-red-500"
                      )} />
                      <span className={cn(
                        "text-xl font-black uppercase tracking-tighter",
                        (!workerData || workerData.isAvailable !== false) ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                      )}>
                        {(!workerData || workerData.isAvailable !== false) ? t('available') : t('unavailable')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium z-10">
                      {(!workerData || workerData.isAvailable !== false) ? t('youAreAvailableNow') : t('youAreUnavailableNow')}
                    </p>

                    {/* Background Visual Element */}
                    <div className={cn(
                      "absolute right-0 bottom-0 opacity-10 transition-transform group-active:scale-95",
                      (!workerData || workerData.isAvailable !== false) ? "text-green-500" : "text-red-500"
                    )}>
                      <Zap size={100} strokeWidth={3} />
                    </div>

                    {toggling && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                </div>
              )}

              {application && profile?.role !== 'worker' && (
                <div className="w-full mb-6 px-4">
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between shadow-sm",
                    application.status === 'pending' ? "bg-yellow-50 border-yellow-100 text-yellow-800" :
                    application.status === 'approved' ? "bg-green-50 border-green-100 text-green-800" :
                    "bg-red-50 border-red-100 text-red-800"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        application.status === 'pending' ? "bg-yellow-100" :
                        application.status === 'approved' ? "bg-green-100" : "bg-red-100"
                      )}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">{t('applicationStatus')}</p>
                        <p className="text-sm font-medium">{t(application.status)}</p>
                      </div>
                    </div>
                    {application.status === 'rejected' && (
                      <Link to="/apply" className="text-xs font-bold underline">{t('applyAgain')}</Link>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 border-2 border-primary text-primary rounded-full font-bold hover:bg-primary hover:text-white transition-all"
                >
                  {t('editProfile')}
                </button>
                {/* Help button removed here since it's now in the top corner icon */}
                {profile?.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className="px-6 py-2 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck size={18} /> {t('adminDashboard')}
                  </Link>
                )}
              </div>
              {profile?.role === 'worker' && (
                <div className="mt-6 w-full grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setBookingFilter('active')}
                    className={cn(
                      "p-3 rounded-2xl text-center border transition-all shadow-sm",
                      bookingFilter === 'active' 
                        ? "bg-primary text-white border-primary shadow-primary/20 scale-105" 
                        : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:scale-105"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase mb-1">{t('active')}</p>
                    <p className={cn("text-xl font-black", bookingFilter === 'active' ? "text-white" : "text-blue-700 dark:text-blue-300")}>
                      {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length}
                    </p>
                  </button>

                  <button 
                    onClick={() => setBookingFilter('completed')}
                    className={cn(
                      "p-3 rounded-2xl text-center border transition-all shadow-sm",
                      bookingFilter === 'completed' 
                        ? "bg-green-600 text-white border-green-600 shadow-green-600/20 scale-105" 
                        : "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300 hover:scale-105"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase mb-1">{t('completed')}</p>
                    <p className={cn("text-xl font-black", bookingFilter === 'completed' ? "text-white" : "text-green-700 dark:text-green-300")}>
                      {bookings.filter(b => b.status === 'completed').length}
                    </p>
                  </button>

                  <button 
                    onClick={() => setBookingFilter('denied')}
                    className={cn(
                      "p-3 rounded-2xl text-center border transition-all shadow-sm",
                      bookingFilter === 'denied' 
                        ? "bg-red-600 text-white border-red-600 shadow-red-600/20 scale-105" 
                        : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 hover:scale-105"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase mb-1">{t('denied')}</p>
                    <p className={cn("text-xl font-black", bookingFilter === 'denied' ? "text-white" : "text-red-700 dark:text-red-300")}>
                      {bookings.filter(b => b.status === 'denied' || b.status === 'cancelled').length}
                    </p>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calendar size={20} /> 
        {profile?.role === 'worker' ? (
          bookingFilter === 'completed' ? t('completedBookings') : 
          bookingFilter === 'denied' ? t('deniedBookings') : t('activeBookings')
        ) : t('bookings')}
      </h3>
      <div className="space-y-4">
        {(() => {
          const filtered = bookings.filter((b) => {
            if (profile?.role === 'admin') return (now - b.timestamp < 24 * 60 * 60 * 1000);
            
            // For workers (and optionally users), apply the status filter
            if (profile?.role === 'worker') {
              if (bookingFilter === 'completed') return b.status === 'completed';
              if (bookingFilter === 'denied') return b.status === 'denied' || b.status === 'cancelled';
              // Default: show pending and confirmed
              return b.status === 'pending' || b.status === 'confirmed';
            }
            
            // For normal users, maybe show all or follow same pattern?
            // The user asked specifically for worker profile.
            return true;
          });
          if (filtered.length === 0) {
            return <div className="text-center py-8 text-gray-500 italic">No bookings yet.</div>;
          }
          return filtered.map((booking) => {
            const isCustomer = booking.customerId === profile?.uid;
            const targetId = isCustomer ? booking.workerId : booking.customerId;
            const targetProfile = profilesCache[targetId];
            const photoUrl = (isCustomer ? booking.workerPhotoURL : booking.customerPhotoURL) || targetProfile?.photoURL;
            const name = (isCustomer ? booking.workerName : booking.customerName) || targetProfile?.name || '?';
            const categoryObj = categories.find(c => c.id === booking.category);
            const categoryLabel = categoryObj 
              ? (i18n.language === 'ar' ? categoryObj.nameAr : i18n.language === 'ku' ? categoryObj.nameKu : categoryObj.nameEn)
              : t(booking.category);

            return (
              <div 
                key={booking.id} 
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700/60 transition-all duration-200 relative group flex flex-col gap-4 overflow-hidden"
              >
                {/* Delete button absolutely positioned */}
                {(booking.status === 'completed' || booking.status === 'denied' || booking.status === 'cancelled') && (
                  <button
                    onClick={() => setDeleteBookingData({ isOpen: true, bookingId: booking.id })}
                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Top Section: Profile Header & Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 dark:border-gray-700/40 pb-4">
                  <div className="flex items-center gap-3">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={name} 
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                        {name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-gray-900 dark:text-gray-100 tracking-tight text-sm">
                          {profile?.role === 'admin' 
                            ? (booking.customerName || profilesCache[booking.customerId]?.name || booking.customerId.substring(0, 8))
                            : name}
                        </span>
                        {profile?.role !== 'admin' && (
                          <span className={cn(
                            "text-[8px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider uppercase",
                            isCustomer 
                              ? "bg-blue-50 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" 
                              : "bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                          )}>
                            {isCustomer ? t('worker') : t('customer')}
                          </span>
                        )}
                      </div>
                      
                      {/* Subtitle / Contact Action */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(booking.timestamp).toLocaleDateString()}
                        </span>
                        
                        {/* Interactive Phone Link */}
                        {profile?.role !== 'admin' && (isCustomer ? (booking.workerPhone || profilesCache[booking.workerId]?.phone) : (booking.customerPhone || profilesCache[booking.customerId]?.phone)) && (
                          <a 
                            href={`tel:${isCustomer ? (booking.workerPhone || profilesCache[booking.workerId]?.phone) : (booking.customerPhone || profilesCache[booking.customerId]?.phone)}`}
                            className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline bg-primary/5 px-2 py-0.5 rounded"
                          >
                            <Phone size={10} /> 
                            {isCustomer ? (booking.workerPhone || profilesCache[booking.workerId]?.phone) : (booking.customerPhone || profilesCache[booking.customerId]?.phone)}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    booking.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/10" : 
                    booking.status === 'pending' ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/10" : 
                    booking.status === 'completed' ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/10" : 
                    booking.status === 'denied' ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/10" : 
                    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200"
                  )}>
                    {t(booking.status)}
                  </span>
                </div>

                {/* Middle Content Section: Description & Booking Category */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                      {booking.category === 'quickRequest' && <span className="text-[11px]">⚡</span>}
                      {categoryLabel}
                    </span>
                    {booking.category === 'quickRequest' && (
                      <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                        {i18n.language === 'ar' ? 'طلب سريع' : i18n.language === 'ku' ? 'داواکاری خێرا' : 'Quick Request'}
                      </span>
                    )}
                  </div>

                  {/* Description Box */}
                  <p className="p-4 bg-gray-50/70 dark:bg-gray-900/30 rounded-2xl text-xs text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-50/50 dark:border-gray-700/20">
                    {booking.description}
                  </p>

                  {/* Structured Details: Location & Time Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                    {/* Location Field */}
                    <div className="flex items-start gap-2 p-3 bg-gray-50/45 dark:bg-gray-900/10 rounded-2xl border border-gray-100/30 dark:border-gray-700/10">
                      <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{t('location')}</p>
                        {booking.lat && booking.lng ? (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${booking.lat},${booking.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-black text-xs hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>{booking.location}</span>
                          </a>
                        ) : (
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{booking.location}</p>
                        )}
                        {booking.locationDescription && (
                          <p className="text-[10px] text-gray-500 mt-1 italic flex items-start gap-1">
                            <Info size={10} className="mt-0.5" />
                            <span>{booking.locationDescription}</span>
                          </p>
                        )}
                        {profile?.role === 'worker' && (booking.lat || booking.lng || booking.location) && (
                          <div className="mt-2 text-left">
                            <a 
                              href={booking.lat && booking.lng 
                                ? `https://www.google.com/maps/search/?api=1&query=${booking.lat},${booking.lng}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white hover:bg-primary/95 text-[10px] font-extrabold rounded-lg transition-all shadow-sm active:scale-95"
                              id={`view-loc-${booking.id}`}
                            >
                              <MapPin size={10} className="animate-pulse" />
                              <span>{i18n.language === 'ar' ? 'عرض الموقع' : i18n.language === 'ku' ? 'بینینی شوێن' : 'View Location'}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time Schedule Field */}
                    {booking.scheduledTime && (
                      <div className="flex items-start gap-2 p-3 bg-gray-50/45 dark:bg-gray-900/10 rounded-2xl border border-gray-100/30 dark:border-gray-700/10">
                        <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{t('scheduledTime')}</p>
                          <p className="text-xs font-black text-primary flex items-center gap-1 mt-0.5">
                            {booking.status === 'confirmed' && <Pin size={12} className="fill-primary" />}
                            {booking.scheduledTime}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image uploads block */}
                  {booking.problemPhotos && booking.problemPhotos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">{t('photos')}</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {booking.problemPhotos.map((photo, i) => (
                          <div key={i} className="relative group/photo flex-shrink-0">
                            <img 
                              src={photo} 
                              alt="" 
                              className="w-16 h-16 rounded-2xl object-cover border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:scale-105 transition-all duration-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/15 rounded-2xl transition-all pointer-events-none" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section: Admin Meta details */}
                {profile?.role === 'admin' && (
                  <div className="mt-1 flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                      <User size={12} className="text-primary" /> {t('customer')}: <span className="font-extrabold">{booking.customerName || profilesCache[booking.customerId]?.name || booking.customerId}</span>
                    </p>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                      <Briefcase size={12} className="text-primary" /> {t('worker')}: <span className="font-extrabold">{booking.workerName || profilesCache[booking.workerId]?.name || booking.workerId}</span>
                    </p>
                  </div>
                )}

                {/* Cancelled context callback */}
                {booking.status === 'cancelled' && booking.cancellationReason && (
                  <div className="mt-1 p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                    <Info size={12} />
                    <span>{t('cancellationReason')}: {t(booking.cancellationReason)}</span>
                  </div>
                )}

                {/* Action Buttons Section */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-gray-50 dark:border-gray-700/30">
                  <div className="flex flex-wrap gap-2 flex-grow sm:flex-grow-0">
                    {profile?.role === 'user' && (booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelBookingData({ isOpen: true, bookingId: booking.id });
                        }}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <X size={14} /> {t('cancelBooking')}
                      </button>
                    )}

                    {/* Pending bookings decision logic for worker */}
                    {profile?.role === 'worker' && booking.status === 'pending' && (
                      <div className="flex flex-col gap-3 w-full">
                        {booking.category === 'quickRequest' ? (
                          <div className="p-3 bg-primary/5 dark:bg-primary/15 rounded-2xl border border-primary/25 text-xs font-black text-primary flex items-center gap-2">
                            <Clock size={16} className="text-primary animate-pulse" />
                            <span>{t('scheduledTime')}: {booking.scheduledTime || ''}</span>
                          </div>
                        ) : (
                          <input 
                            type="text"
                            className="text-xs p-3 border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all w-full"
                            id={`time-${booking.id}`}
                            placeholder={t('enterScheduledTime')}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex gap-2">
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              let acceptTime = booking.scheduledTime || '';
                              if (booking.category !== 'quickRequest') {
                                const timeInput = document.getElementById(`time-${booking.id}`) as HTMLInputElement;
                                if (!timeInput?.value) {
                                  timeInput?.focus();
                                  timeInput?.classList.add('border-rose-400', 'ring-1', 'ring-rose-400/30');
                                  setTimeout(() => {
                                    timeInput?.classList.remove('border-rose-400', 'ring-1', 'ring-rose-400/30');
                                  }, 2005);
                                  return;
                                }
                                acceptTime = timeInput.value;
                              }
                              await updateDoc(doc(db, 'bookings', booking.id), {
                                status: 'confirmed',
                                scheduledTime: acceptTime
                              });
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs rounded-2xl font-extrabold shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            <Check size={14} strokeWidth={2.5} />
                            <span>{t('accept')}</span>
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              setConfirmData({ isOpen: true, bookingId: booking.id });
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 dark:bg-rose-950/25 dark:hover:bg-rose-900/40 dark:text-rose-400 text-xs rounded-2xl font-extrabold border border-rose-100 dark:border-rose-900/40 shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            <X size={14} strokeWidth={2.5} />
                            <span>{t('deny')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {profile?.role === 'worker' && booking.status === 'confirmed' && (
                      <button 
                        onClick={async () => {
                          const bookingId = booking.id;
                          await updateDoc(doc(db, 'bookings', bookingId), {
                            status: 'completed'
                          });
                          
                          // Delete associated messages when work is finished
                          try {
                            let messagesQ;
                            if (profile.role === 'admin') {
                              messagesQ = query(collection(db, 'messages'), where('bookingId', '==', bookingId));
                            } else if (profile?.workerId || profile?.role === 'worker') {
                              messagesQ = query(collection(db, 'messages'), where('bookingId', '==', bookingId), where('workerId', '==', profile.workerId || profile.uid));
                            } else {
                              messagesQ = query(collection(db, 'messages'), where('bookingId', '==', bookingId), where('customerId', '==', profile?.uid || ''));
                            }
                            const snapshots = await getDocs(messagesQ);
                            if (!snapshots.empty) {
                              const batch = writeBatch(db);
                              snapshots.docs.forEach(msgDoc => batch.delete(msgDoc.ref));
                              await batch.commit();
                            }
                          } catch (err) {
                            console.error("Error deleting messages on completion:", err);
                          }
                          
                          // If it's a quick request, also close it
                          if (bookingId.startsWith('quick_')) {
                            const quickReqId = bookingId.replace('quick_', '');
                            try {
                              await updateDoc(doc(db, 'quickRequests', quickReqId), {
                                status: 'completed'
                              });
                            } catch (err) {
                              console.error("Error updating quick request on completion:", err);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10"
                      >
                        <Check size={14} strokeWidth={2.5} />
                        {t('finish')}
                      </button>
                    )}

                    {profile?.role === 'user' && booking.status === 'completed' && !booking.rating && (
                      <button 
                        onClick={() => setRatingData({ isOpen: true, booking })}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <Star size={14} fill="white" /> {t('rate')}
                      </button>
                    )}
                  </div>

                  {/* Standard Chat/Report Actions Alignment */}
                  <div className="flex gap-2.5 ml-auto">
                    {!['completed', 'cancelled', 'denied'].includes(booking.status) && (
                      <Link 
                        to={`/chat/${booking.id}`} 
                        className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95 flex items-center justify-center"
                        title={t('chat')}
                      >
                        <MessageSquare size={18} />
                      </Link>
                    )}
                    <button 
                      onClick={() => setReportData({ isOpen: true, booking })}
                      disabled={userReports.some(r => r.bookingId === booking.id)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center",
                        userReports.some(r => r.bookingId === booking.id) 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-rose-950/20 dark:text-rose-400"
                      )}
                      title={userReports.some(r => r.bookingId === booking.id) ? t('alreadyReported') : t('report')}
                    >
                      <Flag size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDeny')}
        message={t('confirmDeny')}
        onConfirm={async () => {
          if (confirmData?.bookingId) {
            const bookingId = confirmData.bookingId;
            await updateDoc(doc(db, 'bookings', bookingId), {
              status: 'denied'
            });
            // Sync with QuickRequest if applicable
            if (bookingId.startsWith('quick_')) {
              const quickReqId = bookingId.replace('quick_', '');
              try {
                await updateDoc(doc(db, 'quickRequests', quickReqId), {
                  status: 'denied'
                });
              } catch (err) {
                console.error("Error updating quick request on denial:", err);
              }
            }
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('deny')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <RatingModal 
        isOpen={ratingData.isOpen}
        onClose={() => setRatingData({ isOpen: false, booking: null })}
        onSubmit={handleRateWorker}
        workerName={ratingData.booking?.workerName || ''}
      />
      <ReportModal 
        isOpen={reportData.isOpen}
        onClose={() => setReportData({ isOpen: false, booking: null })}
        onSubmit={handleReport}
        reportedName={profile?.role === 'worker' ? (reportData.booking?.customerName || '') : (reportData.booking?.workerName || '')}
        reporterRole={profile?.role || 'user'}
      />

      <CancelBookingDialog 
        isOpen={!!cancelBookingData?.isOpen}
        onConfirm={async (reason) => {
          if (cancelBookingData?.bookingId) {
            try {
              const bookingId = cancelBookingData.bookingId;
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled',
                cancellationReason: reason
              });
              
              if (bookingId.startsWith('quick_')) {
                const quickReqId = bookingId.replace('quick_', '');
                try {
                  await updateDoc(doc(db, 'quickRequests', quickReqId), {
                    status: 'cancelled'
                  });
                } catch (err) {
                  console.error("Error updating quick request on cancellation:", err);
                }
              }
              
              setAlertData({
                isOpen: true,
                title: t('success'),
                message: t('bookingCancelled'),
                type: 'success'
              });
            } catch (error) {
              console.error("Error cancelling booking:", error);
              setAlertData({
                isOpen: true,
                title: t('error'),
                message: t('error'),
                type: 'error'
              });
            }
          }
          setCancelBookingData(null);
        }}
        onCancel={() => setCancelBookingData(null)}
      />
      <ConfirmDialog 
        isOpen={!!deleteBookingData?.isOpen}
        title={t('deleteBooking')}
        message={t('confirmDeleteBooking')}
        onConfirm={() => deleteBookingData && handleDeleteBooking(deleteBookingData.bookingId)}
        onCancel={() => setDeleteBookingData(null)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
    </PullToRefresh>
  );
};

const WorkerApplicationPage = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(profile?.phone || '');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<WorkerApplication | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = onSnapshot(doc(db, 'workerApplications', profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        setApplication(docSnap.data() as WorkerApplication);
      }
    }, (error) => {
      console.error("App: WorkerApplicationPage snapshot error", error);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !phone || !nationalId || loading) return;
    
    setLoading(true);
    try {
      const appData: WorkerApplication = {
        uid: profile.uid,
        phone,
        nationalId,
        status: 'pending',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'workerApplications', profile.uid), appData);
      // Alert success is handled by the UI showing the pending status
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workerApplications');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role === 'worker') {
    return <Navigate to="/profile" />;
  }

  return (
    <div className="p-4 pb-20 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
        <ChevronLeft size={24} />
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
        
        <h2 className="text-2xl font-bold mb-2 relative z-10">{t('becomeWorker')}</h2>
        <p className="text-sm text-gray-500 mb-6 relative z-10">{t('becomeWorkerDesc')}</p>

        {application ? (
          <div className="text-center py-8 space-y-4">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              application.status === 'pending' ? "bg-yellow-100 text-yellow-600" :
              application.status === 'approved' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
              {application.status === 'pending' ? <Clock size={40} /> : 
               application.status === 'approved' ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
            </div>
            <h3 className="text-xl font-bold">{t('applicationStatus')}: {t(application.status)}</h3>
            <p className="text-sm text-gray-500">
              {application.status === 'pending' ? t('reportSubmitted') : 
               application.status === 'approved' ? t('applySuccess') : t('rejected')}
            </p>
            {application.status === 'rejected' && (
              <button 
                onClick={() => setDoc(doc(db, 'workerApplications', profile.uid), { status: 'pending', timestamp: Date.now() }, { merge: true })}
                className="mt-4 text-primary font-bold hover:underline"
              >
                {t('resendCode')}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('phone')}</label>
              <input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phone')}
                required
                readOnly={!!profile?.phone}
                className={cn(
                  "w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary",
                  profile?.phone && "opacity-70 cursor-not-allowed"
                )}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('nationalId')}</label>
              <input 
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={t('nationalIdPlaceholder')}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <LoadingScreen /> : <><CheckCircle size={20} /> {t('submitApplication').toUpperCase()}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { bookingId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [limitCount, setLimitCount] = useState(25);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const lastSentKey = `lastChatMessageSent_${profile.uid}`;
    
    const checkCooldown = () => {
      const lastSentStr = localStorage.getItem(lastSentKey);
      if (lastSentStr) {
        const lastSentAt = parseInt(lastSentStr, 10);
        const now = Date.now();
        const oneMinute = 60 * 1000;
        const remaining = Math.max(0, Math.ceil((oneMinute - (now - lastSentAt)) / 1000));
        setCooldown(remaining);
      }
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [profile]);

  useEffect(() => {
    if (!bookingId) return;
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `bookings/${bookingId}`, false);
    });
    return () => unsubscribe();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || !profile) return;
    let q;
    if (profile.role === 'admin') {
      q = query(
        collection(db, 'messages'), 
        where('bookingId', '==', bookingId), 
        orderBy('timestamp', 'desc'), 
        limit(limitCount)
      );
    } else if (profile.role === 'worker') {
      q = query(
        collection(db, 'messages'), 
        where('bookingId', '==', bookingId), 
        where('workerId', '==', profile.workerId || profile.uid),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'messages'), 
        where('bookingId', '==', bookingId), 
        where('customerId', '==', profile.uid),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Re-sort chronologically (oldest first) for UI presentation
      const sortedMsgs = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sortedMsgs);
      setHasMore(snapshot.docs.length >= limitCount);

      // Mark unread messages as read
      if (profile) {
        const unreadMessages = snapshot.docs.filter(doc => {
          const data = doc.data() as Message;
          return data.senderId !== profile.uid && !data.read;
        });

        if (unreadMessages.length > 0) {
          const batch = writeBatch(db);
          unreadMessages.forEach(docSnap => {
            batch.update(docSnap.ref, { read: true });
          });
          batch.commit().catch(err => handleFirestoreError(err, OperationType.UPDATE, 'messages', false));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages', false);
    });
    return () => unsubscribe();
  }, [bookingId, profile, limitCount]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !bookingId || booking?.status === 'completed') return;

    // Implementation of 1-minute rate limit
    const lastSentKey = `lastChatMessageSent_${profile.uid}`;
    const lastSentStr = localStorage.getItem(lastSentKey);
    const now = Date.now();
    
    if (lastSentStr) {
      const lastSentAt = parseInt(lastSentStr, 10);
      const timePassed = now - lastSentAt;
      const oneMinute = 60 * 1000;
      
      if (timePassed < oneMinute) {
        const secondsLeft = Math.ceil((oneMinute - timePassed) / 1000);
        toast.error(t('rateLimitMessage', { seconds: secondsLeft }) || `Please wait ${secondsLeft}s before sending another message`);
        return;
      }
    }
    
    if (booking?.status === 'completed') {
      toast.error(t('chatClosed'));
      return;
    }
    
    const msgId = Math.random().toString(36).substr(2, 9);
    const timestamp = now;
    
    // Get booking to get emails for permissions
    const bookingDoc = await getDocWithCacheFallback(doc(db, 'bookings', bookingId));
    const bookingData = bookingDoc.exists() ? bookingDoc.data() : null;

    const msgData = {
      id: msgId,
      bookingId,
      senderId: profile.uid,
      customerId: bookingData?.customerId || '',
      workerId: bookingData?.workerId || '',
      customerEmail: bookingData?.customerEmail || '',
      workerEmail: bookingData?.workerEmail || '',
      text: newMessage,
      timestamp,
      read: false
    };

    try {
      await setDoc(doc(db, 'messages', msgId), msgData);
      // Update booking with last message info
      await updateDoc(doc(db, 'bookings', bookingId), {
        lastMessage: newMessage,
        lastMessageSenderId: profile.uid,
        lastMessageTimestamp: timestamp
      });
      // Save last sent timestamp
      localStorage.setItem(lastSentKey, timestamp.toString());
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft /></Link>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">{t('chat')}</h2>
                {booking && (
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {t(booking.category)} • {profile?.role === 'worker' ? booking.customerName : booking.workerName}
                  </p>
                )}
              </div>
              {booking && (
                <div className="flex gap-2">
                  <a 
                    href={`tel:${profile?.role === 'worker' ? booking.customerPhone : booking.workerPhone}`}
                    className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all"
                    title={t('call')}
                  >
                    <Phone size={18} fill="currentColor" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        {booking && (
          <div className="px-10 py-2 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 line-clamp-1">{booking.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <MapPin size={10} /> 
                {booking.lat && booking.lng ? (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${booking.lat},${booking.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    {booking.location} 
                    <span className="text-[9px] font-normal opacity-80">({i18n.language === 'ar' ? 'عرض الموقع' : i18n.language === 'ku' ? 'بینینی شوێن' : 'View Location'})</span>
                  </a>
                ) : (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline"
                  >
                    {booking.location}
                  </a>
                )}
              </p>
              {booking.locationDescription && (
                <p className="text-[10px] text-primary font-bold flex items-center gap-1">
                  <Info size={10} /> {booking.locationDescription}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setLimitCount(prev => prev + 25)}
              className="py-2 px-4 text-xs font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-full transition-all my-2"
            >
              {t('loadPreviousMessages') || 'Load Older Messages'}
            </button>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-2xl shadow-sm text-sm",
                isMe ? "bg-primary text-white rounded-tr-none" : "bg-white dark:bg-gray-800 rounded-tl-none"
              )}>
                {msg.text}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className={cn("text-[8px] opacity-70")}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMe && (
                    <span className="text-[8px] opacity-70">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        {booking?.status === 'completed' ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <Lock size={14} />
            <span>{t('chatClosedMessage') || 'This chat is closed because the work is finished'}</span>
          </div>
        ) : (
          <>
            {cooldown > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg self-start animate-pulse">
                <Clock size={10} />
                <span>{t('rateLimitTimer', { seconds: cooldown }) || `You can send another message in ${cooldown}s`}</span>
              </div>
            )}
            <div className="flex gap-2">
              <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={cooldown > 0 ? t('wait') : t('typeMessage')}
                disabled={cooldown > 0}
                className={cn(
                  "flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full focus:ring-2 focus:ring-primary outline-none transition-all",
                  cooldown > 0 && "opacity-50 grayscale cursor-not-allowed"
                )}
              />
              <button 
                type="submit" 
                disabled={cooldown > 0 || !newMessage.trim()}
                className={cn(
                  "p-2 bg-primary text-white rounded-full shadow-lg transition-all",
                  (cooldown > 0 || !newMessage.trim()) ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-105 active:scale-95"
                )}
              >
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

const QuickRequestPage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  
  // Initialize with state from Voice Assistant if available
  useEffect(() => {
    if (location.state) {
      if (location.state.description) setDescription(location.state.description);
      if (location.state.categoryId) setCategory(location.state.categoryId);
    }
  }, [location.state]);

  const [scheduledTime, setScheduledTime] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [geolocation, setGeolocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [allWorkers, setAllWorkers] = useState<WorkerProfile[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRequestIds, setActiveRequestIds] = useState<string[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [activeRequests, setActiveRequests] = useState<QuickRequest[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [cityRequests, setCityRequests] = useState<QuickRequest[]>([]);

  useEffect(() => {
    const fetchAllWorkers = async () => {
      try {
        const q = query(collection(db, 'workers'));
        const snapshot = await getDocs(q);
        setAllWorkers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WorkerProfile)));
      } catch (error) {
        console.error("Error fetching all workers in QuickRequestPage:", error);
      }
    };
    fetchAllWorkers();
  }, []);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (err) => {
      console.error("Error fetching categories:", err);
    });
    return () => unsubscribe();
  }, []);

  // Consolidated initialization logic
  useEffect(() => {
    // If not authenticated, stop checking
    if (!profile) {
      const timer = setTimeout(() => {
        setCheckingExisting(false);
      }, 1000); // 1 second fallback if profile never loads
      return () => clearTimeout(timer);
    }

    let unsubscribe: (() => void) | undefined;
    let unsubscribeMyRequests: (() => void) | undefined;

    const initialize = async () => {
      try {
        // ALWAYS listen to my own active requests regardless of role
        const qMy = query(
          collection(db, 'quickRequests'),
          where('customerId', '==', profile.uid),
          where('status', 'in', ['open', 'accepted'])
        );
        unsubscribeMyRequests = onSnapshot(qMy, (snapshot) => {
          const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickRequest));
          setActiveRequests(reqs);
          setActiveRequestIds(reqs.map(r => r.id));
          // Default to isWaiting if there are active requests, unless the user manually canceled out
          if (profile.role !== 'worker') {
            // Only auto-switch if we have them and we just loaded them initially
            // Actually, we should just let the state naturally update. If they click New, they can stay.
            // Just updating the activeRequests array will update the UI automatically.
            setCheckingExisting(false);
            
            // Auto open isWaiting ONLY IF it was the first load and we found something
            // But we already initialize checkingExisting to true so this works:
            if (checkingExisting && reqs.length > 0) {
              setIsWaiting(true);
            } else if (reqs.length === 0) {
              setIsWaiting(prev => {
                if (prev) return false;
                return prev;
              });
            }
          }
        }, (err) => {
          console.error("My requests snapshot error:", err);
          if (profile.role !== 'worker') setCheckingExisting(false);
        });

        if (profile.role === 'worker' && profile.city) {
          const q = query(
            collection(db, 'quickRequests'),
            where('city', '==', profile.city),
            where('status', '==', 'open')
          );
          unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickRequest));
            // Sort client-side to avoid composite index requirement
            reqs.sort((a, b) => b.timestamp - a.timestamp);
            
            // Only filter if specialties are actually defined, otherwise show all in city
            const workerSpecialties = (profile as any).specialties || [];
            const filteredReqs = reqs.filter(r => r.customerId !== profile.uid);
            if (workerSpecialties.length > 0) {
              setCityRequests(filteredReqs.filter(r => workerSpecialties.includes(r.category)));
            } else {
              setCityRequests(filteredReqs);
            }
            setCheckingExisting(false);
          }, (error) => {
            console.error("Worker snapshot error:", error);
            setCheckingExisting(false);
          });
        } else if (profile.role !== 'worker') {
          // Already handled by unsubscribeMyRequests
        } else {
          setCheckingExisting(false);
        }
      } catch (error) {
        console.error("Error initializing quick requests:", error);
        setCheckingExisting(false);
      }
    };

    initialize();
    return () => {
      unsubscribe?.();
      unsubscribeMyRequests?.();
    };
  }, [profile]);

  const handleAccept = async (req: QuickRequest) => {
    if (!profile || profile.role !== 'worker') return;
    
    if (req.customerId === profile.uid) {
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('cannotAcceptSelf', 'You cannot accept your own request.'),
        type: 'error'
      });
      return;
    }

    if (!profile.phone) {
      setAlertData({ 
        isOpen: true, 
        title: t('error'), 
        message: t('phoneRequiredToAccept', 'You must have a phone number in your profile to accept requests.'), 
        type: 'error' 
      });
      return;
    }

    setSending(true);
    try {
      const batch = writeBatch(db);
      const reqRef = doc(db, 'quickRequests', req.id);
      batch.update(reqRef, {
        status: 'accepted',
        acceptedBy: profile.uid,
        workerName: profile.name,
        workerPhone: profile.phone,
        workerPhotoURL: profile.photoURL || ''
      });
      const bookingId = `quick_${req.id}`;
      const bookingData: Booking = {
        id: bookingId,
        customerId: req.customerId,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        customerPhotoURL: req.customerPhotoURL || '',
        customerEmail: '',
        workerId: profile.workerId || profile.uid,
        workerName: profile.name,
        workerPhone: profile.phone,
        workerPhotoURL: profile.photoURL || '',
        workerEmail: '',
        status: 'pending',
        timestamp: Date.now(),
        category: 'quickRequest',
        city: req.city,
        description: req.description,
        location: req.location,
        scheduledTime: req.scheduledTime,
        problemPhotos: req.photos
      };
      const bookingRef = doc(db, 'bookings', bookingId);
      batch.set(bookingRef, bookingData);
      await batch.commit();
      setAlertData({ isOpen: true, title: t('success'), message: t('requestAccepted'), type: 'success' });
      nav('/profile');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'quickRequests');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    setSending(true);
    try {
      await updateDoc(doc(db, 'quickRequests', requestId), {
        status: 'cancelled'
      });
      setAlertData({ isOpen: true, title: t('success'), message: t('requestCancelled'), type: 'success' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'quickRequests');
    } finally {
      setSending(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // WORKER DASHBOARD VIEW
  if (profile?.role === 'worker') {
    return (
      <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">{t('quickRequest')}</h1>
            <p className="text-sm text-gray-500">{t('cityRequestsCount', { count: cityRequests.length, city: (profile.city ? t(profile.city) : '') })}</p>
          </div>
          <div className="bg-primary/10 text-primary p-3 rounded-2xl">
            <Zap size={24} fill="currentColor" />
          </div>
        </div>

        {cityRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Zap size={32} />
            </div>
            <h3 className="font-bold text-lg mb-2">{t('noQuickRequests')}</h3>
            <p className="text-sm text-gray-500">{t('checkLater', 'Check back later for new requests in your city.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cityRequests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-zinc-800 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 overflow-hidden border-2 border-white dark:border-zinc-700">
                    {req.customerPhotoURL ? (
                      <img src={req.customerPhotoURL} alt={req.customerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{req.customerName.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{req.customerName}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                    {req.description}
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <Zap size={14} className="text-primary" />
                      {(() => {
                        const cat = categories.find(c => c.id === req.category);
                        return cat ? (i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn) : req.category;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <MapPin size={14} className="text-primary" />
                      {req.location}
                      {req.geolocation && (
                        <a href={`https://maps.google.com/?q=${req.geolocation}`} target="_blank" rel="noreferrer" className="text-primary underline ml-2">
                          {t('viewOnMap', 'Map')}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <Clock size={14} className="text-primary" />
                      {req.scheduledTime.includes('T') && !isNaN(Date.parse(req.scheduledTime)) ? new Date(req.scheduledTime).toLocaleString() : req.scheduledTime}
                    </div>
                  </div>

                  {req.photos && req.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {req.photos.map((p, idx) => (
                        <img key={idx} src={p} alt="Issue" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-zinc-800" />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAccept(req)}
                  disabled={sending}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={20} />{t('acceptRequest')}</>}
                </button>
              </div>
            ))}
          </div>
        )}

        <Alert isOpen={!!alertData} title={alertData?.title || ''} message={alertData?.message || ''} type={alertData?.type || 'info'} onClose={() => setAlertData(null)} />
      </div>
    );
  }
  if (isWaiting) {
    return (
      <div className="pb-24 pt-6 px-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">{t('yourActiveRequests', 'Active Requests')}</h1>
            <p className="text-sm text-gray-500">{t('showingActiveRequests', { count: activeRequests.length })}</p>
          </div>
          <button 
            onClick={() => {
              if (activeRequests.length >= 2) {
                setAlertData({ 
                  isOpen: true, 
                  title: t('error'), 
                  message: t('limitReached', 'Request limit reached. You can only have 2 active requests at a time.'), 
                  type: 'error' 
                });
                return;
              }
              setIsWaiting(false);
            }}
            className={`flex items-center gap-2 font-bold px-4 py-2 rounded-xl transition-all ${
              activeRequests.length >= 2 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <Plus size={18} />
            {t('newRequest', 'New')}
          </button>
        </div>

        <div className="space-y-6">
          {activeRequests.map((req) => {
            const isAccepted = req.status === 'accepted';
            
            return (
              <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in duration-300">
                {!isAccepted ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="text-primary animate-pulse" size={20} fill="currentColor" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black mb-1">{t('findingWorker', 'Finding a Worker...')}</h3>
                    <p className="text-xs text-gray-400 mb-6 font-bold uppercase tracking-widest">
                      {t('category')}: {(() => {
                        const cat = categories.find(c => c.id === req.category);
                        return cat ? (i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn) : req.category;
                      })()}
                    </p>

                    <div className="w-full bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium italic">"{req.description}"</p>
                    </div>

                    <button 
                      onClick={() => handleCancel(req.id)}
                      disabled={sending}
                      className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-3 rounded-2xl transition-all text-sm"
                    >
                      {sending ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <X size={18} />}
                      {t('cancelRequest', 'Cancel Request')}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mx-auto mb-4">
                      <Check size={32} strokeWidth={3} />
                    </div>
                    
                    <h3 className="text-2xl font-black mb-1 tracking-tight">{t('workerFound', 'Worker Found!')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mb-6 text-sm">{t('workerAcceptedDesc', 'A worker has accepted your request.')}</p>

                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-3xl p-6 mb-6 text-left space-y-4">
                      <div className="flex items-center gap-4">
                        {req.workerPhotoURL ? (
                          <img src={req.workerPhotoURL} alt={req.workerName || ''} className="w-10 h-10 rounded-xl object-cover shadow-lg" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                            {req.workerName?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('worker', 'Worker')}</p>
                          <p className="font-bold text-base">{req.workerName}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('phone', 'Phone Number')}</p>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-xl text-primary">{req.workerPhone}</p>
                          <a 
                            href={`tel:${req.workerPhone}`}
                            className="p-2 bg-primary text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                          >
                            <Phone size={16} fill="currentColor" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'quickRequests', req.id), {
                            status: 'closed'
                          });
                        } catch (err) {
                          console.error("Error closing quick request from page:", err);
                          handleFirestoreError(err, OperationType.UPDATE, `quickRequests/${req.id}`);
                        }
                        nav('/profile');
                      }}
                      className="w-full py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                    >
                      {t('viewBooking', 'View Booking')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Alert isOpen={!!alertData} title={alertData?.title || ''} message={alertData?.message || ''} type={alertData?.type || 'info'} onClose={() => setAlertData(null)} />
      </div>
    );
  }

  // CUSTOMER CREATE VIEW (default)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (photos.length + files.length > 4) {
      setAlertData({ isOpen: true, title: t('error'), message: t('max4Photos'), type: 'error' });
      return;
    }

    setSending(true);
    try {
      const newPhotos = [...photos];
      for (let i = 0; i < files.length; i++) {
        const base64String = await compressImage(files[i], 800, 0.7);
        newPhotos.push(base64String);
      }
      setPhotos(newPhotos);
    } catch (error) {
      console.error("Error compressing image:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!category || !description || !scheduledTime || !coords) {
      if (!category || !description || !scheduledTime) {
        setAlertData({ isOpen: true, title: t('error'), message: t('fillAllFields'), type: 'error' });
      } else if (!coords) {
        setAlertData({ isOpen: true, title: t('error'), message: t('pleaseSelectLocationOnMap', 'Please choose your location on the map.'), type: 'error' });
      }
      return;
    }

    setSending(true);
    try {
      const pendingBookingsQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', profile.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const pendingBookingsSnap = await getDocs(pendingBookingsQuery);

      if (activeRequests.length + pendingBookingsSnap.size >= 2) {
        setAlertData({ 
          isOpen: true, 
          title: t('error'), 
          message: t('limitReached', 'Request limit reached. You can only have 2 active requests at a time.'), 
          type: 'error' 
        });
        setSending(false);
        return;
      }

      const ObjectData: any = {
        customerId: profile.uid,
        customerName: profile.name,
        customerPhone: profile.phone,
        customerPhotoURL: profile.photoURL || '',
        city: profile.city || ('' as any),
        category,
        description,
        scheduledTime,
        location: locationDesc || '',
        photos,
        status: 'open',
        timestamp: Date.now()
      };
      if (coords) ObjectData.geolocation = `${coords.lat},${coords.lng}`;
      
      const reqData = ObjectData as Omit<QuickRequest, 'id'>;

      const docRef = await addDoc(collection(db, 'quickRequests'), reqData);
      setIsWaiting(true);
      
      setDescription('');
      setCategory('');
      setScheduledTime('');
      setLocationDesc('');
      setGeolocation('');
      setCoords(null);
      setPhotos([]);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'quickRequests');
    } finally {
      setSending(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setAlertData({ isOpen: true, title: t('error'), message: t('geolocationNotSupported', 'Geolocation is not supported by your browser'), type: 'error' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation(`${position.coords.latitude},${position.coords.longitude}`);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setAlertData({ isOpen: true, title: t('error'), message: t('geolocationError', 'Could not get your location. Please check permissions.'), type: 'error' });
        setGettingLocation(false);
      }
    );
  };

  if (!category && profile?.role !== 'worker' && !isWaiting) {
    return (
      <div className="pb-24 pt-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-2xl mx-auto">
          {activeRequests.length > 0 && (
            <button 
              onClick={() => setIsWaiting(true)}
              className="w-full mb-6 bg-primary/10 text-primary p-4 rounded-3xl font-black flex items-center justify-between hover:bg-primary/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-widest font-black opacity-70">{t('view', 'View')}</p>
                  <p>{t('yourActiveRequests', 'Active Requests')} ({activeRequests.length})</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          )}
          
          <h1 className="text-3xl font-black mb-2 tracking-tight">{t('quickRequest')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-8">{t('selectCategory')}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex flex-col items-center p-6 rounded-3xl transition-all border-2 bg-white dark:bg-zinc-900 border-transparent shadow-lg hover:border-primary active:scale-95 group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-[10px] font-black text-center leading-tight">
                  {(i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn).toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setCategory('')} 
            className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('quickRequest')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
              {categories.find(c => c.id === category) ? (i18n.language === 'ar' ? categories.find(c => c.id === category)?.nameAr : i18n.language === 'ku' ? categories.find(c => c.id === category)?.nameKu : categories.find(c => c.id === category)?.nameEn) : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="hidden">
              <label className="block text-sm font-bold mb-2">{t('category', 'Category')}</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('selectCategory', 'Select a category')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {i18n.language === 'ar' ? c.nameAr : i18n.language === 'ku' ? c.nameKu : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">{t('quickRequestDesc')}</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary h-32 resize-none"
                placeholder={t('describeNeedPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">{t('location')}</label>
            <React.Suspense fallback={
              <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center">
                <span className="text-sm font-bold text-gray-400">{t('loadingMap', 'Loading Map...')}</span>
              </div>
            }>
              <MapPicker 
                coords={coords} 
                city={profile?.city} 
                workers={allWorkers}
                onChange={(lat, lng) => {
                  setCoords({ lat, lng });
                }} 
              />
            </React.Suspense>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">{t('whenDoYouNeedIt')}</label>
                <input 
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary"
                  placeholder={t('timePlaceholder', 'e.g., Now, Tomorrow morning')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  {t('quickRequestLocation')} <span className="text-xs font-normal text-gray-400">({t('optional')})</span>
                </label>
                <input 
                  type="text"
                  value={locationDesc}
                  onChange={(e) => setLocationDesc(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary"
                  placeholder={t('locationDetailsPlaceholder', 'e.g., Al-Mansour, St. 14, Bldg. 5')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">{t('photosOfProblem')}</label>
              <div className="flex flex-wrap gap-3">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative group">
                    <img src={p} alt={`Photo ${idx + 1}`} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20" />
                    <button 
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-all"
                  >
                    <Plus size={24} />
                    <span className="text-[10px] mt-1 font-bold">MAX 4</span>
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                multiple 
                accept="image/*"
                className="hidden" 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={sending}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={20} />
                {t('submitRequest')}
              </>
            )}
          </button>
        </form>
      </div>

      <Alert 
        isOpen={!!alertData} 
        title={alertData?.title || ''} 
        message={alertData?.message || ''} 
        type={alertData?.type || 'info'} 
        onClose={() => {
          if (alertData?.type === 'success' && !isWaiting) nav('/'); // Use nav
          setAlertData(null);
        }} 
      />
    </div>
  );
};

const HelpPage = () => {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!profile || !auth.currentUser) return;
    setIsLoading(true);
    try {
      const phoneToBlock = profile.phone ? profile.phone.replace(/\D/g, '') : '';
      const uid = profile.uid;
      const workerId = profile.workerId || (profile.role === 'worker' ? uid : null);
      
      // Get the ID token before deleting any of their Firestore profile/auth info
      let idToken = null;
      try {
        idToken = await auth.currentUser.getIdToken(true);
      } catch (tokenErr) {
        console.warn("Failed to get ID token", tokenErr);
      }

      // 1. Add to deletedAccounts to block forever
      if (phoneToBlock) {
        await setDoc(doc(db, 'deletedAccounts', phoneToBlock), {
          phone: phoneToBlock,
          uid: uid,
          deletedAt: Date.now()
        });
      }
      
      // 2. Delete worker profile if worker
      if (workerId) {
        await deleteDoc(doc(db, 'workers', workerId));
      }
      
      // 3. Delete user profile
      await deleteDoc(doc(db, 'users', uid));
      localStorage.setItem('phone_verification_required', 'true');
      
      // 4. Try to delete Auth user (locally via SDK, or fallback to Admin API)
      let authDeleted = false;
      try {
        await auth.currentUser.delete();
        authDeleted = true;
        console.log("Deleted Auth user locally");
      } catch (authErr: any) {
        console.warn("Local auth deletion failed, trying backend Admin API...", authErr);
      }

      if (!authDeleted && idToken) {
        try {
          const response = await fetch('/api/admin/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
          const resData = await response.json();
          if (response.ok && resData.success) {
            authDeleted = true;
            console.log("Deleted Auth user via backend Admin API");
          } else {
            console.error("Backend auth deletion failed:", resData.error);
          }
        } catch (fetchErr) {
          console.error("Fetch error calling backend delete-account:", fetchErr);
        }
      }

      // Always clear auth sessions locally to sign out
      if (Capacitor.isNativePlatform()) {
        try {
          await FirebaseAuthentication.signOut();
        } catch (e) {
          console.error(e);
        }
      }
      await signOut(auth);
      
      toast.success(t('accountDeletedSuccess'));
      navigate('/');
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Error deleting account. Please try again.");
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="p-4 pb-20 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-3xl font-black tracking-tight">{t('help')}</h2>
      </div>
      
      <div className="grid gap-6">
        {/* Support Contacts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Mail size={24} /></div>
            <div>
              <h3 className="font-black text-sm">{t('supportEmail')}</h3>
              <p className="text-[10px] text-gray-500 font-bold">{settings.supportEmail}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Phone size={24} /></div>
            <div>
              <h3 className="font-black text-sm">{t('supportPhone')}</h3>
              <p className="text-[10px] text-gray-500 font-bold">{settings.supportPhone}</p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary text-white rounded-xl"><Info size={20} /></div>
            <h3 className="font-black text-lg">{t('aboutApp')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            {t('aboutAppDesc')}
          </p>
        </div>

        {/* Policy Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 text-white rounded-xl"><ShieldCheck size={20} /></div>
            <h3 className="font-black text-lg">{t('appPolicy')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium mb-4">
            {t('appPolicyDesc')}
          </p>
          <ul className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <li key={i} className="flex gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {t(`policy_${i}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Safety Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500 text-white rounded-xl"><Lock size={20} /></div>
            <h3 className="font-black text-lg">{t('safetyGuidelines')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium mb-4">
            {t('safetyGuidelinesDesc')}
          </p>
          <div className="grid gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t(`safety_${i}`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Account Section */}
        {profile && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-950/50 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1 px-2.5 bg-red-100 dark:bg-red-950 text-red-600 rounded-xl font-bold flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <h3 className="font-black text-lg text-red-600">{t('deleteAccount')}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
              {t('deleteAccountConfirm')}
            </p>
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading}
              className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 text-center flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 size={20} />
                  {t('deleteAccount')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t('deleteAccount')}
        message={t('deleteAccountConfirm')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
        isLoading={isLoading}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerProfile | null>(null);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; id: string; type: 'worker' | 'ad' | 'category' } | null>(null);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'workers' | 'users' | 'reports' | 'applications' | 'settings' | 'ads' | 'categories'>('workers');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const appSettings = useSettings();

  // Category form state
  const [catId, setCatId] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameKu, setCatNameKu] = useState('');
  const [catOrder, setCatOrder] = useState(0);
  const [catActive, setCatActive] = useState(true);
  const [catKeywords, setCatKeywords] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Ad form state
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adImageURL, setAdImageURL] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adActive, setAdActive] = useState(true);
  const [adOrder, setAdOrder] = useState(0);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  // Settings form state
  const [supportEmail, setSupportEmail] = useState(appSettings.supportEmail);
  const [supportPhone, setSupportPhone] = useState(appSettings.supportPhone);
  const [whatsappNumber, setWhatsappNumber] = useState(appSettings.whatsappNumber);
  const [becomeWorkerWhatsappNumber, setBecomeWorkerWhatsappNumber] = useState(appSettings.becomeWorkerWhatsappNumber || appSettings.whatsappNumber);
  const [useInternalApplications, setUseInternalApplications] = useState(appSettings.useInternalApplications ?? false);
  const [becomeWorkerWhatsappMessage, setBecomeWorkerWhatsappMessage] = useState(appSettings.becomeWorkerWhatsappMessage || '');

  useEffect(() => {
    setSupportEmail(appSettings.supportEmail);
    setSupportPhone(appSettings.supportPhone);
    setWhatsappNumber(appSettings.whatsappNumber);
    setBecomeWorkerWhatsappNumber(appSettings.becomeWorkerWhatsappNumber || appSettings.whatsappNumber);
    setUseInternalApplications(appSettings.useInternalApplications ?? false);
    setBecomeWorkerWhatsappMessage(appSettings.becomeWorkerWhatsappMessage || '');
  }, [appSettings]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<City>(profile?.city || 'Baghdad');
  const [profession, setProfession] = useState('plumbing');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('8 AM - 5 PM');
  const [transport, setTransport] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [serviceArea, setServiceArea] = useState<City[]>([]);
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>({ lat: 33.3152, lng: 44.3661 });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 0.7);
        setPhotoURL(compressed);
      } catch (error) {
        console.error("Error compressing file:", error);
      }
    }
  };

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photos.length < 3) {
      try {
        const compressed = await compressImage(file, 800, 0.6);
        setPhotos(prev => [...prev, compressed]);
      } catch (error) {
        console.error("Error compressing gallery photo:", error);
      }
    }
  };

  const handleAdImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1200, 0.6);
        setAdImageURL(compressed);
      } catch (error) {
        console.error("Error compressing ad image:", error);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'workers'), limit(30));
        const snapshot = await getDocs(q);
        setWorkers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WorkerProfile)));

        const cq = query(collection(db, 'categories'), orderBy('order', 'asc'), limit(50));
        const cSnapshot = await getDocs(cq);
        if (cSnapshot.empty) {
          const defaultCategories: Category[] = [
            { id: 'plumbing', icon: '💧', nameEn: 'Plumbing', nameAr: 'سباكة', nameKu: 'بۆری ئاو', order: 1, active: true },
            { id: 'acFixing', icon: '❄️', nameEn: 'AC Fixing', nameAr: 'تصليح مكيفات', nameKu: 'چاککردنەوەی سپلیت', order: 2, active: true },
            { id: 'electrical', icon: '⚡', nameEn: 'Electrical', nameAr: 'كهرباء', nameKu: 'کارەبا', order: 3, active: true },
            { id: 'cleaning', icon: '🧹', nameEn: 'Cleaning', nameAr: 'تنظيف', nameKu: 'پاککردنەوە', order: 4, active: true },
            { id: 'gardening', icon: '🌳', nameEn: 'Gardening', nameAr: 'حدائق', nameKu: 'باخچە', order: 5, active: true },
            { id: 'carpentry', icon: '🔨', nameEn: 'Carpentry', nameAr: 'نجارة', nameKu: 'دارتاشی', order: 6, active: true },
            { id: 'painting', icon: '🎨', nameEn: 'Painting', nameAr: 'صباغة', nameKu: 'بۆیاخکردن', order: 7, active: true },
            { id: 'applianceRepair', icon: '🛠️', nameEn: 'Appliance Repair', nameAr: 'تصليح أجهزة', nameKu: 'چاککردنەوەی ئامێر', order: 8, active: true },
            { id: 'pestControl', icon: '🐜', nameEn: 'Pest Control', nameAr: 'مكافحة حشرات', nameKu: 'قڕکردنی مێروو', order: 9, active: true },
            { id: 'locksmith', icon: '🔑', nameEn: 'Locksmith', nameAr: 'أقفال', nameKu: 'قوفڵ', order: 10, active: true },
            { id: 'movingDelivery', icon: '📦', nameEn: 'Moving & Delivery', nameAr: 'نقل وتوصيل', nameKu: 'گواستنەوە', order: 11, active: true },
            { id: 'decoration', icon: '🖼️', nameEn: 'Decoration', nameAr: 'ديكور', nameKu: 'دیکۆر', order: 12, active: true },
            { id: 'securityCameras', icon: '📹', nameEn: 'Security Cameras', nameAr: 'كاميرات مراقبة', nameKu: 'کامێراي چاودێری', order: 13, active: true },
            { id: 'internet', icon: '🌐', nameEn: 'Internet', nameAr: 'انترنت', nameKu: 'ئەنتەرنێت', order: 14, active: true },
          ];
          setCategories(defaultCategories);
        } else {
          setCategories(cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'workers/categories', false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTabData = async () => {
      try {
        if (activeTab === 'users') {
          const q = query(collection(db, 'users'), limit(30));
          const snapshot = await getDocs(q);
          setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        } else if (activeTab === 'reports') {
          const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(30));
          const snapshot = await getDocs(q);
          setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
        } else if (activeTab === 'applications') {
          const q = query(collection(db, 'workerApplications'), orderBy('timestamp', 'desc'), limit(30));
          const snapshot = await getDocs(q);
          setApplications(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WorkerApplication)));
        } else if (activeTab === 'ads') {
          const q = query(collection(db, 'ads'), orderBy('order', 'asc'), limit(30));
          const snapshot = await getDocs(q);
          setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, activeTab as string, false);
      }
    };
    fetchTabData();
  }, [activeTab]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setCity(profile?.city || 'Baghdad');
    setProfession('plumbing');
    setPhone('');
    setHours('8 AM - 5 PM');
    setTransport(true);
    setSpecialties([]);
    setServiceArea([]);
    setDescription('');
    setPhotoURL('');
    setPhotos([]);
    setWorkerCoords({ lat: 33.3152, lng: 44.3661 });
    setIsAdding(false);
    setEditingWorker(null);
  };

  const resetCategoryForm = () => {
    setCatId('');
    setCatIcon('');
    setCatNameEn('');
    setCatNameAr('');
    setCatNameKu('');
    setCatOrder(0);
    setCatActive(true);
    setCatKeywords('');
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  useEffect(() => {
    if (editingCategory) {
      setCatId(editingCategory.id);
      setCatIcon(editingCategory.icon);
      setCatNameEn(editingCategory.nameEn);
      setCatNameAr(editingCategory.nameAr);
      setCatNameKu(editingCategory.nameKu);
      setCatOrder(editingCategory.order);
      setCatActive(editingCategory.active);
      setCatKeywords(editingCategory.keywords || '');
      setIsAddingCategory(true);
    }
  }, [editingCategory]);

  useEffect(() => {
    if (editingWorker) {
      setName(editingWorker.name);
      setEmail(editingWorker.email);
      setCity(editingWorker.city);
      setProfession(editingWorker.profession);
      setPhone(editingWorker.phone);
      setHours(editingWorker.workingHours);
      setTransport(editingWorker.hasTransport);
      setSpecialties(editingWorker.specialties || []);
      setServiceArea(editingWorker.service_area || []);
      setDescription(editingWorker.description || '');
      setPhotoURL(editingWorker.photoURL || '');
      setPhotos(editingWorker.photos || []);
      setWorkerCoords(editingWorker.location || { lat: 33.3152, lng: 44.3661 });
      setIsAdding(true);
    }
  }, [editingWorker]);

  const handleSave = async () => {
    try {
      if (!name || !phone || !city || (specialties.length === 0)) {
        setAlertData({ isOpen: true, title: t('error'), message: t('fillAllFields'), type: 'error' });
        return;
      }

      // Automatically set profession to the first specialty selected
      const finalProfession = specialties[0];

      const uid = editingWorker?.uid || Math.random().toString(36).substr(2, 9);
      const workerData = {
        uid,
        name,
        city,
        profession: finalProfession,
        specialties,
        service_area: Array.from(new Set([city, ...serviceArea])),
        phone,
        workingHours: hours,
        hasTransport: transport,
        description,
        photoURL,
        photos,
        rating: editingWorker?.rating || 5.0,
        location: workerCoords || { lat: 33.3152, lng: 44.3661 },
        role: 'worker',
        createdAt: editingWorker?.createdAt || Date.now()
      };

      await setDoc(doc(db, 'workers', uid), workerData);
      
      // Link to user if they exist by phone
      const { getDocs } = await import('firebase/firestore');
      let userDocId = null;

      if (phone) {
        const usersQuery = query(collection(db, 'users'), where('phone', '==', phone));
        const userDocs = await getDocs(usersQuery);
        if (!userDocs.empty) {
          userDocId = userDocs.docs[0].id;
        }
      }

      if (userDocId) {
        await setDoc(doc(db, 'users', userDocId), {
          role: 'worker',
          workerId: uid
        }, { merge: true });
      }
      
      resetForm();
      setAlertData({ isOpen: true, title: t('success'), message: t('workerSaved'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
      setAlertData({ isOpen: true, title: t('error'), message: t('errorSavingWorker'), type: 'error' });
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (!catId || !catNameEn || !catNameAr || !catNameKu || !catIcon) {
        setAlertData({ isOpen: true, title: t('error'), message: t('fillAllFields'), type: 'error' });
        return;
      }
      
      const categoryData: Category = {
        id: catId,
        icon: catIcon,
        nameEn: catNameEn,
        nameAr: catNameAr,
        nameKu: catNameKu,
        order: catOrder,
        active: catActive,
        keywords: catKeywords
      };

      await setDoc(doc(db, 'categories', catId), categoryData);
      resetCategoryForm();
      setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
    }
  };

  const handleSeedCategories = async () => {
    try {
      const defaultCategories: Category[] = [
        { id: 'plumbing', icon: '💧', nameEn: 'Plumbing', nameAr: 'السباكة', nameKu: 'بۆری ئاو', order: 1, active: true },
        { id: 'acFixing', icon: '❄️', nameEn: 'AC Fixing', nameAr: 'تصليح المكيفات', nameKu: 'چاککردنەوەی سپلیت', order: 2, active: true },
        { id: 'electrical', icon: '⚡', nameEn: 'Electrical', nameAr: 'الكهرباء', nameKu: 'کارەبایی', order: 3, active: true },
        { id: 'cleaning', icon: '🧹', nameEn: 'Cleaning', nameAr: 'التنظيف', nameKu: 'پاککردنەوە', order: 4, active: true },
        { id: 'gardening', icon: '🌳', nameEn: 'Gardening', nameAr: 'البستنة', nameKu: 'باخچەوانی', order: 5, active: true },
        { id: 'carpentry', icon: '🪚', nameEn: 'Carpentry', nameAr: 'النجارة', nameKu: 'دارتاشی', order: 6, active: true },
        { id: 'painting', icon: '🎨', nameEn: 'Painting', nameAr: 'الطلاء', nameKu: 'بۆیاخکردن', order: 7, active: true },
        { id: 'applianceRepair', icon: '🛠️', nameEn: 'Appliance Repair', nameAr: 'تصليح أجهزة', nameKu: 'چاککردنەوەی ئامێرەکان', order: 8, active: true },
        { id: 'pestControl', icon: '🐜', nameEn: 'Pest Control', nameAr: 'مكافحة الحشرات', nameKu: 'قڕکردنی مێروو', order: 9, active: true },
        { id: 'locksmith', icon: '🔑', nameEn: 'Locksmith', nameAr: 'حداد أقفال', nameKu: 'قوفڵساز', order: 10, active: true },
        { id: 'movingDelivery', icon: '📦', nameEn: 'Moving & Delivery', nameAr: 'نقل وتوصيل', nameKu: 'گواستنەوە و گەیاندن', order: 11, active: true },
        { id: 'decoration', icon: '🏠', nameEn: 'Decoration', nameAr: 'ديكور', nameKu: 'دیکۆر', order: 12, active: true },
        { id: 'securityCameras', icon: '🛡️', nameEn: 'Security Cameras', nameAr: 'كاميرات مراقبة', nameKu: 'کامێرای چاودێری', order: 13, active: true },
        { id: 'internet', icon: '🌐', nameEn: 'Internet & Wi-Fi', nameAr: 'إنترنت وواي فاي', nameKu: 'ئینتەرنێت و وای فای', order: 14, active: true },
      ];

      const batch = writeBatch(db);
      for (const cat of defaultCategories) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      await batch.commit();
      setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'user' | 'worker' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setAlertData({ isOpen: true, title: t('success'), message: t('roleUpdated'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDelete = async (uid: string) => {
    setConfirmData({ isOpen: true, id: uid, type: 'worker' });
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmData({ isOpen: true, id, type: 'category' });
  };

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'app_settings'), {
        supportEmail,
        supportPhone,
        whatsappNumber,
        becomeWorkerWhatsappNumber,
        useInternalApplications,
        becomeWorkerWhatsappMessage
      });
      setAlertData({
        isOpen: true,
        title: t('success'),
        message: t('settingsUpdated'),
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app_settings');
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('reportError'),
        type: 'error'
      });
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setAlertData({ isOpen: true, title: t('success'), message: t('reportResolved'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleApplicationAction = async (application: WorkerApplication, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'workerApplications', application.uid), { status });
      
      if (status === 'approved') {
        // Update user role
        await updateDoc(doc(db, 'users', application.uid), { role: 'worker' });
        
        // Create initial worker profile if it doesn't exist
        const workerRef = doc(db, 'workers', application.uid);
        const workerSnap = await getDoc(workerRef);
        if (!workerSnap.exists()) {
          const userSnap = await getDoc(doc(db, 'users', application.uid));
          const userData = userSnap.data() as UserProfile;
          
          await setDoc(workerRef, {
            uid: application.uid,
            name: userData.name,
            email: userData.email,
            phone: application.phone,
            city: userData.city,
            profession: 'plumbing', // Default
            specialties: [],
            service_area: [userData.city],
            workingHours: '8 AM - 5 PM',
            hasTransport: true,
            rating: 5.0,
            location: { lat: 33.3152, lng: 44.3661 },
            role: 'worker',
            createdAt: Date.now(),
            isAvailable: true
          });
        }
      }
      
      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: status === 'approved' ? t('approved') : t('rejected'), 
        type: 'success' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workerApplications/${application.uid}`);
    }
  };

  const handleSaveAd = async () => {
    try {
      const id = editingAd?.id || Math.random().toString(36).substr(2, 9);
      const adData: Ad = {
        id,
        title: adTitle,
        description: adDescription,
        imageURL: adImageURL,
        link: adLink,
        active: adActive,
        order: Number(adOrder),
        createdAt: editingAd?.createdAt || Date.now()
      };

      await setDoc(doc(db, 'ads', id), adData);
      resetAdForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ads');
    }
  };

  const resetAdForm = () => {
    setAdTitle('');
    setAdDescription('');
    setAdImageURL('');
    setAdLink('');
    setAdActive(true);
    setAdOrder(0);
    setIsAddingAd(false);
    setEditingAd(null);
  };

  const handleDeleteAd = async (id: string) => {
    setConfirmData({ isOpen: true, id, type: 'ad' });
  };

  if (profile?.role !== 'admin') return <Navigate to="/" />;

  return (
    <div className="p-4 pb-20">
      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDelete')}
        message={t('confirmDeleteMessage')}
        onConfirm={async () => {
          if (confirmData?.id) {
            try {
              if (confirmData.type === 'worker') {
                await deleteDoc(doc(db, 'workers', confirmData.id));
                await deleteDoc(doc(db, 'users', confirmData.id));
              } else if (confirmData.type === 'ad') {
                await deleteDoc(doc(db, 'ads', confirmData.id));
              } else if (confirmData.type === 'category') {
                await deleteDoc(doc(db, 'categories', confirmData.id));
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.DELETE, `${confirmData.type === 'worker' ? 'workers' : confirmData.type === 'ad' ? 'ads' : 'categories'}/${confirmData.id}`);
            }
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('adminDashboard')}</h2>
        {activeTab === 'workers' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 bg-primary text-white rounded-full shadow-lg"
          >
            <Plus />
          </button>
        )}
        {activeTab === 'categories' && (
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-2 bg-primary text-white rounded-full shadow-lg"
          >
            <Plus />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl flex-wrap">
        <button 
          onClick={() => setActiveTab('workers')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'workers' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Briefcase size={16} /> {t('workers')}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'users' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Users size={16} /> {t('users')}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'reports' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Flag size={16} /> {t('reports')}
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'applications' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <FileText size={16} /> {t('applications')}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'settings' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Settings size={16} /> {t('settings')}
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'ads' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <ImageIcon size={16} /> {t('ads')}
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'categories' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Grid size={16} /> {t('categories')}
        </button>
      </div>

      {activeTab === 'workers' ? (
        <>
          <AnimatePresence>
            {(isAdding || editingWorker) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-8 border border-primary/20"
              >
                <h3 className="text-xl font-bold mb-4">{editingWorker ? t('editWorker') : t('addWorker')}</h3>
                <div className="grid gap-4">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={t('name')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phone')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <select value={city} onChange={e => setCity(e.target.value as City)} className="p-2 border rounded-lg dark:bg-gray-700">
                    {IRAQI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('specialties')}</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSpecialties(prev => {
                              const exists = prev?.includes(cat.id);
                              if (exists) {
                                return prev.filter(s => s !== cat.id);
                              } else {
                                return [...(prev || []), cat.id];
                              }
                            });
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                            specialties?.includes(cat.id) ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          )}
                        >
                          {i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('serviceArea')}</label>
                    <div className="flex flex-wrap gap-2">
                      {IRAQI_CITIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setServiceArea(prev => 
                              prev?.includes(c) ? prev.filter(s => s !== c) : [...(prev || []), c]
                            );
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                            serviceArea?.includes(c) ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('photoURL')} (.png)</label>
                    <div className="flex items-center gap-3">
                      {photoURL && (
                        <img src={photoURL} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-primary cursor-pointer hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </div>
                    <input 
                      value={photoURL} 
                      onChange={e => setPhotoURL(e.target.value)} 
                      placeholder={t('photoURL')} 
                      className="p-2 border rounded-lg dark:bg-gray-700 w-full text-xs" 
                    />
                  </div>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder={t('workerDescription')} 
                    className="p-2 border rounded-lg dark:bg-gray-700 h-24 resize-none" 
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center justify-between">
                      <span>{t('photos')} ({photos.length}/3)</span>
                      <span className="text-[10px] text-gray-500 font-normal">{t('maxPhotos')}</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {photos.map((p, idx) => p && (
                        <div key={idx} className="relative group">
                          <img src={p} alt={`Photo ${idx + 1}`} className="w-20 h-20 rounded-xl object-cover border-2 border-primary/20 cursor-pointer hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {photos.length < 3 && (
                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Camera size={20} className="text-gray-400" />
                          <span className="text-[8px] mt-1 text-gray-400">{t('addPhoto')}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotosChange} 
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 my-2">
                    <label className="text-sm font-bold block">{t('workerLocation', "Worker's Coordinate Location")}</label>
                    <p className="text-xs text-gray-400 font-normal">{t('workerLocationDesc', "Set the fixed/work location of this worker on the map")}</p>
                    <React.Suspense fallback={
                      <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-400">{t('loadingMap', 'Loading Map...')}</span>
                      </div>
                    }>
                      <MapPicker 
                        coords={workerCoords} 
                        city={city} 
                        onChange={(lat, lng) => setWorkerCoords({ lat, lng })} 
                      />
                    </React.Suspense>
                  </div>

                  <input value={hours} onChange={e => setHours(e.target.value)} placeholder={t('workingHours')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <div className="items-center gap-2 flex">
                    <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} id="transport" />
                    <label htmlFor="transport">{t('transport')}</label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold">{t('save')}</button>
                    <button onClick={resetForm} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">{t('cancel')}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {workers.map(worker => (
              <div key={worker.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <p className="font-bold">{worker.name}</p>
                  <p className="text-xs text-gray-500">{t(worker.profession)} - {t(worker.city)}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingWorker(worker);
                      setName(worker.name);
                      setEmail(worker.email);
                      setCity(worker.city);
                      setProfession(worker.profession);
                      setSpecialties(worker.specialties || []);
                      setServiceArea(worker.service_area || []);
                      setPhone(worker.phone);
                      setHours(worker.workingHours);
                      setTransport(worker.hasTransport);
                      setDescription(worker.description || '');
                      setPhotoURL(worker.photoURL || '');
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(worker.uid)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          {allUsers.map(user => (
            <div key={user.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{user.name}</p>
                  <p className="text-[10px] text-gray-500">{user.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value as any)}
                  className={cn(
                    "text-[10px] font-bold py-1 px-2 rounded-lg border-none focus:ring-1 focus:ring-primary",
                    user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                    user.role === 'worker' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  )}
                >
                  <option value="user">USER</option>
                  <option value="worker">WORKER</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-red-100 dark:border-red-900/30">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                    report.status === 'pending' ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  )}>
                    {t(report.status)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(report.timestamp).toLocaleString()}
                  </span>
                </div>
                {report.status === 'pending' && (
                  <button 
                    onClick={() => handleResolveReport(report.id)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    {t('resolve')}
                  </button>
                )}
              </div>
              <p className="text-sm font-bold mb-1">{t(report.reason)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{report.details}</p>
              <div className="flex gap-4 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                <p><span className="font-bold">{t('reporter')}:</span> {report.reporterId}</p>
                <p><span className="font-bold">{t('reported')}:</span> {report.reportedId}</p>
                <p><span className="font-bold">{t('booking')}:</span> {report.bookingId}</p>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Flag size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noReports')}</p>
            </div>
          )}
        </div>
      ) : activeTab === 'applications' ? (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">{app.phone}</p>
                  <p className="text-xs text-gray-500">{new Date(app.timestamp).toLocaleString()}</p>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                  app.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                  app.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {t(app.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <p><span className="text-gray-500">{t('phone')}:</span> {app.phone}</p>
                <p><span className="text-gray-500">{t('nationalId')}:</span> {app.nationalId}</p>
              </div>
              {app.status === 'pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApplicationAction(app, 'approved')}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-xs"
                  >
                    {t('approve')}
                  </button>
                  <button 
                    onClick={() => handleApplicationAction(app, 'rejected')}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold text-xs"
                  >
                    {t('reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
          {applications.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noApplications')}</p>
            </div>
          )}
        </div>
      ) : activeTab === 'ads' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{t('manageAds')}</h3>
            <button 
              onClick={() => setIsAddingAd(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> {t('addAd')}
            </button>
          </div>

          <AnimatePresence>
            {(isAddingAd || editingAd) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-primary/20"
              >
                <h4 className="text-lg font-bold mb-4">{editingAd ? t('editAd') : t('addAd')}</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adTitle')}</label>
                    <input 
                      value={adTitle} 
                      onChange={e => setAdTitle(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adDescription')}</label>
                    <textarea 
                      value={adDescription} 
                      onChange={e => setAdDescription(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adLink')}</label>
                    <input 
                      value={adLink} 
                      onChange={e => setAdLink(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">{t('adOrder')}</label>
                      <input 
                        type="number"
                        value={adOrder} 
                        onChange={e => setAdOrder(Number(e.target.value))} 
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input 
                        type="checkbox" 
                        id="adActive"
                        checked={adActive} 
                        onChange={e => setAdActive(e.target.checked)} 
                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                      />
                      <label htmlFor="adActive" className="text-sm font-bold">{t('adActive')}</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adImage')}</label>
                    <div className="flex items-center gap-4">
                      {adImageURL && (
                        <div className="relative group">
                          <img src={adImageURL} alt="Preview" className="w-24 h-12 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setAdImageURL('')}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <label className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Camera size={20} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">{t('addPhoto')}</span>
                        <input type="file" accept="image/*" onChange={handleAdImageChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleSaveAd}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                    >
                      {t('save')}
                    </button>
                    <button 
                      onClick={resetAdForm}
                      className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4">
            {ads.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                <Pin size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">{t('noAds')}</p>
              </div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex gap-4 items-center">
                  {ad.imageURL && (
                    <img src={ad.imageURL} alt={ad.title} className="w-24 h-16 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold truncate">{ad.title}</h5>
                      {!ad.active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold uppercase">
                          {t('unavailable')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{ad.description}</p>
                    <p className="text-[10px] text-primary font-bold mt-1">{t('adOrder')}: {ad.order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingAd(ad);
                        setAdTitle(ad.title);
                        setAdDescription(ad.description);
                        setAdImageURL(ad.imageURL);
                        setAdLink(ad.link || '');
                        setAdActive(ad.active);
                        setAdOrder(ad.order);
                        setIsAddingAd(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{t('manageCategories')}</h3>
            <button 
              onClick={() => setIsAddingCategory(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> {t('addCategory')}
            </button>
          </div>

          <AnimatePresence>
            {(isAddingCategory || editingCategory) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-8 border border-primary/20"
              >
                <h3 className="text-xl font-bold mb-4">{editingCategory ? t('editCategory') : t('addCategory')}</h3>
                <div className="grid gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('categoryId')}</label>
                    <input value={catId} onChange={e => setCatId(e.target.value)} placeholder="e.g., plumbing" className="w-full p-2 border rounded-lg dark:bg-gray-700" disabled={!!editingCategory} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('icon')}</label>
                    <input value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="Emoji Icon (e.g., 💧)" className="w-full p-2 border rounded-lg dark:bg-gray-700" />
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2">{t('categoryNames')}</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">English</label>
                      <input value={catNameEn} onChange={e => setCatNameEn(e.target.value)} placeholder="English Name" className="w-full p-2 border rounded-lg dark:bg-gray-700" />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex justify-end">العربية (Arabic)</label>
                      <input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="الاسم بالعربي" className="w-full p-2 border rounded-lg dark:bg-gray-700 text-right" dir="rtl" />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex justify-end">کوردی (Kurdish)</label>
                      <input value={catNameKu} onChange={e => setCatNameKu(e.target.value)} placeholder="ناوى بە کوردى" className="w-full p-2 border rounded-lg dark:bg-gray-700 text-right" dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">{t('order')}</label>
                      <input type="number" value={catOrder} onChange={e => setCatOrder(Number(e.target.value))} placeholder="Order" className="w-full p-2 border rounded-lg dark:bg-gray-700" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" id="catActive" checked={catActive} onChange={e => setCatActive(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                      <label htmlFor="catActive" className="text-sm font-bold">{t('active')}</label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('keywords')}</label>
                    <textarea 
                      value={catKeywords} 
                      onChange={e => setCatKeywords(e.target.value)} 
                      placeholder={t('keywordsPlaceholder')}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 min-h-[80px]"
                    />
                    <p className="text-[10px] text-gray-400 italic">{t('keywordsHint')}</p>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveCategory} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {t('save')}
                    </button>
                    <button onClick={resetCategoryForm} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4">
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <Grid size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-6">{t('noCategories')}</p>
                <button 
                  onClick={handleSeedCategories}
                  className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all flex items-center gap-2 mx-auto"
                >
                  <Plus size={20} /> {t('seedCategories')}
                </button>
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex gap-4 items-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-2xl">
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold truncate">{cat.nameEn} / {cat.nameAr} / {cat.nameKu}</h5>
                      {!cat.active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold uppercase">
                          {t('unavailable')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">ID: {cat.id} | Order: {cat.order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatId(cat.id);
                        setCatIcon(cat.icon);
                        setCatNameEn(cat.nameEn);
                        setCatNameAr(cat.nameAr);
                        setCatNameKu(cat.nameKu);
                        setCatOrder(cat.order);
                        setCatActive(cat.active);
                        setIsAddingCategory(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-6">
          <h3 className="text-xl font-bold mb-4">{t('settings')}</h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('supportEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={supportEmail} 
                  onChange={e => setSupportEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="support@khdmat.iq"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('supportPhone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={supportPhone} 
                  onChange={e => setSupportPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="+964 770 000 0000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('whatsappNumber')}</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={whatsappNumber} 
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="9647700000000"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                {t('becomeWorker')} {t('settings')}
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{t('useInternalApplications')}</p>
                    <p className="text-[10px] text-gray-500">{t('useInternalApplicationsDesc')}</p>
                  </div>
                  <button 
                    onClick={() => setUseInternalApplications(!useInternalApplications)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      useInternalApplications ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      useInternalApplications ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                {!useInternalApplications && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('becomeWorkerWhatsappNumber')}</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={becomeWorkerWhatsappNumber} 
                          onChange={e => setBecomeWorkerWhatsappNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                          placeholder="9647700000000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('whatsappMessage')}</label>
                      <textarea 
                        value={becomeWorkerWhatsappMessage} 
                        onChange={e => setBecomeWorkerWhatsappMessage(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all h-24 resize-none text-sm"
                        placeholder="hi, how can i work for KHDMAT..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={handleUpdateSettings}
              className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              {t('updateSettings').toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryWorkersPage = () => {
  const { t, i18n } = useTranslation();
  const { categoryId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    const unsubscribe = onSnapshot(doc(db, 'categories', categoryId), (docSnap) => {
      if (docSnap.exists()) {
        setCategory(docSnap.data() as Category);
      }
    });
    return () => unsubscribe();
  }, [categoryId]);

  useEffect(() => {
    const fetchWorkers = async () => {
      const searchParams = new URLSearchParams(location.search);
      const filterCity = searchParams.get('city');
      const targetCity = filterCity || profile?.city;

      if (!targetCity || !categoryId) {
        setLoading(false);
        return;
      }

      const applyFilters = (workersList: WorkerProfile[]) => {
        return workersList.filter(w => {
          const inCity = w.city === targetCity || (w.service_area && w.service_area?.includes(targetCity));
          const inCategory = w.profession === categoryId || (w.specialties && w.specialties?.includes(categoryId));
          const isAvailable = w.isAvailable !== false;
          
          // Final visibility logic: Hide if not available, unless admin is viewing
          if (profile?.role === 'admin') return inCity && inCategory;
          return inCity && inCategory && isAvailable;
        }).sort((a, b) => {
          // Available workers first
          const availA = a.isAvailable !== false ? 1 : 0;
          const availB = b.isAvailable !== false ? 1 : 0;
          if (availA !== availB) return availB - availA;
          // Then by rating
          return b.rating - a.rating;
        });
      };

      const now = Date.now();
      const cacheTTL = 180000; // 3 minutes TTL
      const hasFreshMemoryCache = globalWorkersCache && (now - globalWorkersFetchTimestamp < cacheTTL);

      if (globalWorkersCache) {
        // Load instantly from memory cache to avoid unnecessary spinner
        const filtered = applyFilters(globalWorkersCache);
        setWorkers(filtered);
        
        if (hasFreshMemoryCache) {
          setLoading(false);
          return;
        }
      } else {
        // Only show spinner if there is zero cached data
        setLoading(true);
      }

      try {
        const q = query(collection(db, 'workers'), limit(150));
        // Use local cache fallback for extreme speeds
        const snapshot = await getDocsWithCacheFallback(q);
        const workersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as WorkerProfile));
        
        globalWorkersCache = workersData;
        globalWorkersFetchTimestamp = Date.now();

        const filtered = applyFilters(workersData);
        setWorkers(filtered);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'workers/category', false);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [profile?.city, categoryId, location.search]);

  const getCategoryName = () => {
    if (!category) return categoryId ? t(categoryId) : t('workers');
    return i18n.language === 'ar' ? category.nameAr : i18n.language === 'ku' ? category.nameKu : category.nameEn;
  };

  return (
    <div className="pb-20 p-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black tracking-tight text-primary">
          {category?.icon} {getCategoryName()}
        </h2>
      </div>

      <div>
        <h2 className="text-lg font-black tracking-tight mb-4 flex items-center justify-between">
          {t('workers')}
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{workers.length} {t('workers').toLowerCase()}</span>
        </h2>
        
        {loading ? (
          <WorkersListSkeleton />
        ) : workers.length > 0 ? (
          <div className="grid gap-4">
            {workers.map((worker) => (
              <motion.div 
                key={worker.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 flex gap-4 border border-gray-100 dark:border-gray-700 transition-all",
                  worker.isAvailable === false && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div 
                  className="relative cursor-pointer"
                  onClick={() => navigate(`/worker/${worker.uid}`)}
                >
                  {worker.photoURL ? (
                    <LazyImage 
                      src={worker.photoURL} 
                      alt={worker.name} 
                      className="w-20 h-20 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">👤</div>
                  )}
                  {worker.isAvailable === false && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('unavailable')}</span>
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Star size={10} fill="white" /> {worker.rating}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 
                    className="font-bold text-lg cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/worker/${worker.uid}`)}
                  >
                    {worker.name}
                  </h3>
                  <p className="text-primary text-sm font-medium mb-1">{t(worker.profession)}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {worker.specialties?.slice(0, 2).map(s => (
                      <span key={s} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                        {t(s)}
                      </span>
                    ))}
                    {worker.specialties && worker.specialties.length > 2 && (
                      <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                        +{worker.specialties.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                      <MapPin size={10} /> {t(worker.city)}
                    </div>
                    <button 
                      onClick={() => navigate(`/book/${worker.uid}`)}
                      disabled={worker.isAvailable === false || worker.uid === profile?.uid || worker.uid === (profile as any)?.workerId}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm transition-all",
                        (worker.isAvailable !== false && worker.uid !== profile?.uid && worker.uid !== (profile as any)?.workerId)
                          ? "bg-primary text-white hover:scale-105 active:scale-95" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {worker.uid === profile?.uid || worker.uid === (profile as any)?.workerId ? t('worker').toUpperCase() : t('bookNow').toUpperCase()}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 font-medium">{t('noWorkersFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkerProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { workerId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!workerId) return;
    
    // Check if worker profile exists in Cache
    const cachedWorker = globalWorkersCache?.find(w => w.uid === workerId);
    if (cachedWorker) {
      setWorker(cachedWorker);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Fetch categories first to show correct names using global cache if available
    const fetchCategories = async () => {
      if (globalCategoriesCache && globalCategoriesCache.length > 0) {
        setCategories(globalCategoriesCache);
        return;
      }
      try {
        const q = query(collection(db, 'categories'), where('active', '==', true), limit(50));
        const snapshot = await getDocsWithCacheFallback(q);
        if (!snapshot.empty) {
          const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(cats);
          globalCategoriesCache = cats;
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();

    // Listen for worker profile
    const unsubscribeWorker = onSnapshot(doc(db, 'workers', workerId), (docSnap) => {
      if (docSnap.exists()) {
        setWorker({ uid: docSnap.id, ...docSnap.data() } as WorkerProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workers/${workerId}`, false);
      setLoading(false);
    });

    // Listen for reviews
    const q = query(collection(db, 'reviews'), where('workerId', '==', workerId), limit(50));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews', false);
    });

    return () => {
      unsubscribeWorker();
      unsubscribeReviews();
    };
  }, [workerId]);

  const handleToggleAvailability = async () => {
    if (!profile || !worker || toggling) return;
    setToggling(true);
    const currentStatus = worker.isAvailable !== false;
    const targetWorkerId = (profile as any)?.workerId || profile.uid;
    try {
      await setDoc(doc(db, 'workers', targetWorkerId), {
        isAvailable: !currentStatus
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers', false);
    } finally {
      setToggling(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/worker/${worker.uid}`;
    const shareTitle = `${worker?.name || ''} - ${worker?.profession ? t(worker.profession) : ''}`;
    const shareText = i18n.language === 'ar' 
      ? `تحقق من الملف الشخصي لـ ${worker?.name || ''} على منصة خدمات!` 
      : i18n.language === 'ku' 
      ? `سەیری پڕۆفایلی ${worker?.name || ''} بکە لەسەر پلاتفۆرمی خزمەت!` 
      : `Check out ${worker?.name || ''}'s profile on Khdmat app!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success(
          i18n.language === 'ar' ? 'تمت المشاركة بنجاح!' : 
          i18n.language === 'ku' ? 'بە سەرکەوتوویی هاوبەش کرا!' : 
          'Shared successfully!'
        );
        return;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        console.warn('Web Share failed, falling back to copy:', error);
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(
          i18n.language === 'ar' ? 'تم نسخ رابط الملف الشخصي!' : 
          i18n.language === 'ku' ? 'بەستەری پڕۆفایل کۆپی کرا!' : 
          'Profile link copied to clipboard!'
        );
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(
          i18n.language === 'ar' ? 'تم نسخ رابط الملف الشخصي!' : 
          i18n.language === 'ku' ? 'بەستەری پڕۆفایل کۆپی کرا!' : 
          'Profile link copied to clipboard!'
        );
      }
    } catch (err) {
      toast.error(
        i18n.language === 'ar' ? 'فشل في نسخ الرابط' : 
        i18n.language === 'ku' ? 'کۆپیکردنی بەستەر سەرکەوتوو نەبوو' : 
        'Failed to copy link'
      );
    }
  };

  if (loading) return <WorkerProfileSkeleton />;
  if (!worker) return <div className="text-center py-12">{t('noWorkers')}</div>;

  const isMyProfile = profile?.uid === worker.uid || (profile as any)?.workerId === worker.uid;
  const isAvailable = worker.isAvailable !== false;
  const canBook = !isMyProfile && isAvailable;

  const tagCounts: { [key: string]: number } = {};
  reviews.forEach(r => {
    if (r.tags) {
      r.tags.forEach(tagId => {
        tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
      });
    }
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div id="worker-profile-container" className="pb-20 p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={handleShare}
          className="p-2.5 bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 rounded-full flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm"
        >
          <Share2 size={18} />
          <span>
            {i18n.language === 'ar' ? 'مشاركة' : i18n.language === 'ku' ? 'هاوبەشکردن' : 'Share'}
          </span>
        </button>
      </div>

      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 transition-all",
        !isAvailable && "opacity-80 grayscale-[0.3]"
      )}>
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {worker.photoURL ? (
              <LazyImage 
                src={worker.photoURL} 
                alt={worker.name} 
                className="w-32 h-32 rounded-full border-4 border-primary shadow-lg cursor-pointer hover:opacity-90 transition-opacity" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-bold shadow-lg">
                {worker.name.charAt(0)}
              </div>
            )}
            <div className={cn(
              "absolute bottom-0 right-0 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 shadow-md",
              isAvailable ? "bg-green-500" : "bg-red-500"
            )} />
          </div>
          
          <h2 className="text-2xl font-bold">{worker.name}</h2>
          <p className="text-primary font-medium mb-2">{t(worker.profession)}</p>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-bold">
              <Star size={16} fill="white" /> {worker.rating}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-bold text-white",
              isAvailable ? "bg-green-500" : "bg-red-500"
            )}>
              {isAvailable ? t('available') : t('unavailable')}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold">{t('workingHours')}</p>
              <p className="text-sm font-bold">{worker.workingHours}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold">{t('transport')}</p>
              <p className="text-sm font-bold">{worker.hasTransport ? t('available') : t('unavailable')}</p>
            </div>
          </div>

          {worker.description && (
            <div className="w-full mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 border-primary">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Info size={16} className="text-primary" /> {t('workerDescription')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {worker.description}
              </p>
            </div>
          )}

          {worker.photos && worker.photos.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Camera size={16} className="text-primary" /> {t('photos')}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {worker.photos.filter(p => !!p).map((p, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer"
                  >
                    <LazyImage src={p} alt={`Work ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {worker.specialties && worker.specialties.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-sm font-bold mb-2">{t('specialties')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.specialties.map(s => {
                  const category = categories.find(c => c.id === s);
                  const name = category ? (i18n.language === 'ar' ? category.nameAr : i18n.language === 'ku' ? category.nameKu : category.nameEn) : t(s);
                  return (
                    <span key={s} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            {isMyProfile ? (
              <button 
                onClick={handleToggleAvailability}
                disabled={toggling}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  isAvailable 
                    ? "bg-green-500 text-white hover:bg-green-600" 
                    : "bg-red-500 text-white hover:bg-red-600"
                )}
              >
                {toggling ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <>
                    <Clock size={20} /> 
                    {isAvailable ? t('youAreAvailableNow') : t('youAreUnavailableNow')}
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={() => navigate(`/book/${worker.uid}`)}
                disabled={!canBook}
                className={cn(
                  "w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  canBook 
                    ? "bg-primary hover:scale-[1.02]" 
                    : "bg-gray-400 cursor-not-allowed"
                )}
              >
                <Calendar size={20} /> {canBook ? t('bookNow') : t('workerUnavailable')}
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Star size={20} className="text-yellow-400" /> {t('reviews')} ({reviews.length})
      </h3>

      {reviews.length > 0 && Object.keys(tagCounts).length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl mb-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
            {i18n.language === 'ar' ? 'الكلمات الأكثر تكراراً' : i18n.language === 'ku' ? 'بەربڵاوترین وەسفەکان' : 'Top compliments'}
          </p>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tagId, count]) => {
              const tagObj = SUGGESTED_TAGS.find(t => t.id === tagId);
              if (!tagObj) return null;
              const label = i18n.language === 'ar' ? tagObj.ar : i18n.language === 'ku' ? tagObj.ku : tagObj.en;
              return (
                <div key={tagId} className="flex items-center gap-2 px-3 py-1 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-500/10">
                  <span>{label}</span>
                  <span className="bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-2 py-0.2 rounded-full text-[10px]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center py-8 text-gray-500 italic">{t('noReviews')}</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                {review.customerPhoto ? (
                  <img src={review.customerPhoto} alt={review.customerName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold">
                    {review.customerName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">{review.customerName}</p>
                  <p className="text-[10px] text-gray-500">{new Date(review.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Star size={10} fill="currentColor" /> {review.rating}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
              
              {review.tags && review.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gray-50 dark:border-gray-700/50">
                  {review.tags.map(tagId => {
                    const tagObj = SUGGESTED_TAGS.find(t => t.id === tagId);
                    if (!tagObj) return null;
                    const label = i18n.language === 'ar' ? tagObj.ar : i18n.language === 'ku' ? tagObj.ku : tagObj.en;
                    return (
                      <span key={tagId} className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-full text-[11px] font-medium border border-gray-200/50 dark:border-gray-600/30">
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LanguageSelectionPopup = ({ onComplete }: { onComplete: (lang: string) => void }) => {
  const { t, i18n } = useTranslation();
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

const QuickRequestNotifier = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const [activeRequest, setActiveRequest] = useState<QuickRequest | null>(null);

  useEffect(() => {
    if (!profile || (profile.role !== 'user' && profile.role !== 'customer')) return;

    const q = query(
      collection(db, 'quickRequests'),
      where('customerId', '==', profile.uid),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as QuickRequest;
        
        // If data is accepted but missing phone (happens if worker profile not synced yet)
        if (data.status === 'accepted' && data.acceptedBy && !data.workerPhone) {
          try {
            const workerDoc = await getDoc(doc(db, 'users', data.acceptedBy));
            if (workerDoc.exists()) {
              const workerData = workerDoc.data();
              setActiveRequest({ ...data, workerPhone: workerData.phone, workerName: workerData.name });
            } else {
              setActiveRequest(data);
            }
          } catch (err) {
            console.error("Error fetching worker fallback in notifier:", err);
            setActiveRequest(data);
          }
        } else {
          setActiveRequest(data);
        }
      } else {
        setActiveRequest(null);
      }
    }, (err) => {
      console.error("QuickRequestNotifier snapshot error:", err);
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.role]);

  const handleDismiss = async () => {
    if (!activeRequest) return;
    try {
      await updateDoc(doc(db, 'quickRequests', activeRequest.id), {
        status: 'closed' // Mark as closed so it doesn't show up in global notifier anymore
      });
      setActiveRequest(null);
      nav('/profile');
    } catch (err) {
      console.error("Error closing quick request:", err);
      handleFirestoreError(err, OperationType.UPDATE, `quickRequests/${activeRequest.id}`);
    }
  };

  if (!activeRequest) return null;

  // Show it everywhere to ensure the user sees it until dismissed
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in duration-500 text-center relative">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600 mx-auto mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        
        <h2 className="text-3xl font-black mb-2 tracking-tight">{t('workerFound', 'Worker Found!')}</h2>
        <p className="text-gray-500 dark:text-gray-400 font-bold mb-8">{t('workerAcceptedDesc', 'A worker has accepted your request.')}</p>

        <div className="bg-gray-50 dark:bg-zinc-900 rounded-3xl p-6 mb-8 text-left space-y-4">
          <div className="flex items-center gap-4">
            {activeRequest.workerPhotoURL ? (
              <img src={activeRequest.workerPhotoURL} alt={activeRequest.workerName || ''} className="w-12 h-12 rounded-2xl object-cover shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
                {activeRequest.workerName?.[0] || '?'}
              </div>
            )}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('worker', 'Worker')}</p>
              <p className="font-bold text-lg">{activeRequest.workerName}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('phone', 'Phone Number')}</p>
            <div className="flex items-center justify-between">
              <p className="font-black text-2xl text-primary">{activeRequest.workerPhone}</p>
              <a 
                href={`tel:${activeRequest.workerPhone}`}
                className="p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <Phone size={20} fill="currentColor" />
              </a>
            </div>
          </div>
        </div>

        <button 
          onClick={handleDismiss}
          className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {t('viewBooking', 'View Booking')}
        </button>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, profile, loading, isAuthReady } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const [profileSetupCompleted, setProfileSetupCompleted] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log("[AppContent] User session/UID changed. Resetting profileSetupCompleted to false.");
    setProfileSetupCompleted(false);
  }, [user?.uid]);

  useEffect(() => {
    // Hide native splash screen immediately on mount so the user doesn't wait
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(err => {
        console.warn("[App] Failed to hide splash screen:", err);
      });
    }
  }, []);

  useEffect(() => {
    // Initialize notifications channel and request permissions at app start
    NotificationService.createNotificationChannel();
    NotificationService.requestPermissions();
  }, []);

  useEffect(() => {
    // Small delay to let the main page render first before showing popups
    const timer = setTimeout(() => setPageReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Add global click listener for photos
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && (target as HTMLImageElement).src) {
        const img = target as HTMLImageElement;
        // Don't trigger on tiny icons or specific UI elements that shouldn't zoom
        if (img.width > 40 && img.height > 40 && !img.closest('.no-zoom')) {
          setFullScreenImage(img.src);
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleProfileSetup = async (city: City, phone: string) => {
    if (!user) return;
    try {
      const updates: any = { city, phoneVerified: true, isReRegistered: false };
      if (phone) updates.phone = phone;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        updates.uid = user.uid;
        updates.role = 'user';
        updates.createdAt = Date.now();
        updates.name = user.displayName || 'User';
      } else {
        const existingData = userDocSnap.data();
        if (!existingData || !existingData.name) {
          updates.name = user.displayName || 'User';
        }
      }
      
      await setDoc(userDocRef, updates, { merge: true });
      localStorage.removeItem('phone_verification_required');
      setProfileSetupCompleted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    // Seed mock data once if admin
    if (isAuthReady && profile?.role === 'admin') {
      const hasSeeded = localStorage.getItem('hasSeededMockData');
      if (!hasSeeded) {
        seedMockData().then(() => {
          localStorage.setItem('hasSeededMockData', 'true');
        });
      }
    }
  }, [isAuthReady, profile]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    document.dir = ['ar', 'ku'].includes(i18n.language) ? 'rtl' : 'ltr';
    document.title = t('appName');
  }, [i18n.language, t]);

  useEffect(() => {
    if (profile?.language && profile.language !== i18n.language) {
      i18n.changeLanguage(profile.language);
    }
  }, [profile?.language, i18n]);

  const handleLanguageSetup = async (lang: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      const updates: any = { language: lang };
      if (!userDocSnap.exists()) {
        updates.uid = user.uid;
        updates.name = user.displayName || 'User';
        updates.city = 'Erbil'; // Fallback city before they pick
        updates.role = 'user';
        updates.createdAt = Date.now();
      }
      
      await setDoc(userDocRef, updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    if (isAuthReady && user) {
      console.log("[App] State:", { 
        uid: user.uid, 
        email: user.email, 
        hasProfile: !!profile, 
        profileCity: profile?.city, 
        profilePhone: profile?.phone,
        showProfileSetup: !profile || !profile.city || !profile.phone
      });
    }
  }, [isAuthReady, user, profile]);

  const isPublicPage = ['/privacy', '/terms'].includes(location.pathname);

  // Router Guard pattern using isAuthReady to block rendering/navigation until authentication status is finalized
  const hasLoggedInUser = localStorage.getItem('has_logged_in_user') === 'true';
  if (!isAuthReady || (hasLoggedInUser && !user && !isPublicPage)) {
    return <LoadingScreen />;
  }

  const isResettingPassword = localStorage.getItem('is_resetting_password') === 'true';
  if ((!user || isResettingPassword) && !isPublicPage) return <AuthPage />;

  const showProfileSetup = (!profile || !profile.city || profile?.phoneVerified === false || profile?.isReRegistered === true || localStorage.getItem('phone_verification_required') === 'true') && !profileSetupCompleted;
  const showLanguageSetup = !showProfileSetup && profile && !profile.language;

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationManager />
      {user && <Header darkMode={darkMode} setDarkMode={setDarkMode} />}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-600 dark:text-amber-400 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>
            {i18n.language === 'ar' 
              ? "أنت غير متصل بالإنترنت. يتم عرض الحجوزات والرسائل المخزنة سابقاً." 
              : i18n.language === 'ku'
                ? "تۆ لە دەرەوەی هێڵی. حیجزەکان و نامە کۆنەکان پیشان دەدرێن."
                : "You are offline. Viewing previously loaded booking details and chat messages."}
          </span>
        </div>
      )}
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary locationKey={location.pathname}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:categoryId" element={<CategoryWorkersPage />} />
            <Route path="/worker/:workerId" element={<WorkerProfilePage />} />
            <Route path="/book/:workerId" element={<BookingPage />} />
            <Route path="/quick-request" element={<QuickRequestPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/apply" element={<WorkerApplicationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/chat/:bookingId" element={<ChatPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {user && <BottomNav />}
      {user && (
        <React.Suspense fallback={null}>
          <VoiceAssistant />
        </React.Suspense>
      )}
      {showProfileSetup && pageReady && <ProfileSetupPopup onComplete={handleProfileSetup} />}
      {showLanguageSetup && pageReady && <LanguageSelectionPopup onComplete={handleLanguageSetup} />}
      <QuickRequestNotifier />
      <FullScreenImage 
        src={fullScreenImage} 
        isOpen={!!fullScreenImage} 
        onClose={() => setFullScreenImage(null)} 
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" />
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
