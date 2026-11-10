import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Loader2,
  Play,
  History,
  Send,
  MessageCircle,
  Clock,
  Compass,
  ChevronRight,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { processAICommand } from "../services/aiService";
import { useAuth } from "../AuthContext";
import { useSettings } from "../hooks/useSettings";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
  onSnapshot,
  writeBatch,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import {
  handleFirestoreError,
  OperationType,
} from "../lib/firestore-error-handler";
import { useNavigate, useLocation } from "react-router-dom";
import { Category, IRAQI_CITIES, City } from "../types";
import toast from "react-hot-toast";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";

interface AIInteraction {
  id: string;
  userMessage: string;
  aiResponse: string;
  timestamp: any;
  intent?: string;
}

// @ts-ignore
const BrowserSpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const VoiceAssistant: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<AIInteraction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_voice_enabled");
      return saved === "true"; // default to false (muted) on mobile to ensure zero lag, users can unmute via toggle
    } catch {
      return false;
    }
  });

  const toggleVoice = () => {
    const nextVal = !isVoiceEnabled;
    setIsVoiceEnabled(nextVal);
    try {
      localStorage.setItem("ai_voice_enabled", nextVal.toString());
    } catch (e) {}
    if (!nextVal) {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
      if (Capacitor.isNativePlatform()) {
        try {
          TextToSpeech.stop();
        } catch (e) {}
      }
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const browserRecognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    const fetchContext = async () => {
      try {
        console.log("[VoiceAssistant] Refreshing AI context data...");
        // Active Bookings
        const bookingsQ = query(
          collection(db, "bookings"),
          where("customerId", "==", user.uid),
          where("status", "in", ["pending", "confirmed"])
        );
        const bookingsSnap = await getDocs(bookingsQ);
        setActiveBookings(
          bookingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );

        // Active Requests
        const requestsQ = query(
          collection(db, "quickRequests"),
          where("customerId", "==", user.uid),
          where("status", "==", "open")
        );
        const requestsSnap = await getDocs(requestsQ);
        setActiveRequests(
          requestsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (e) {
        console.error("Error fetching AI context data:", e);
      }
    };
    fetchContext();
  }, [isOpen, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const lastSentKey = `lastAIInteractionSent_${user.uid}`;

    const checkCooldown = () => {
      const lastSentStr = localStorage.getItem(lastSentKey);
      if (lastSentStr) {
        const lastSentAt = parseInt(lastSentStr, 10);
        const now = Date.now();
        const oneMinute = 60 * 1000;
        const remaining = Math.max(
          0,
          Math.ceil((oneMinute - (now - lastSentAt)) / 1000)
        );
        setCooldown(remaining);
      }
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [user?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [history, isOpen, isProcessing]);

  const handleInputFocus = () => {
    // Scroll to bottom when keyboard opens to prevent clipping active conversation
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 150);
  };

  useEffect(() => {
    // @ts-ignore
    console.log(
      "[VoiceAssistant] mounted. VITE_API_URL:",
      import.meta.env.VITE_API_URL
    );
    console.log("[VoiceAssistant] Origin:", window.location.origin);

    const fetchCategories = async () => {
      const q = query(
        collection(db, "categories"),
        where("active", "==", true)
      );
      const snapshot = await getDocs(q);
      const cats = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Category)
      );
      setCategories(cats);
    };
    fetchCategories();

    if (BrowserSpeechRecognition && !Capacitor.isNativePlatform()) {
      browserRecognitionRef.current = new BrowserSpeechRecognition();
      browserRecognitionRef.current.continuous = false;
      browserRecognitionRef.current.interimResults = false;

      browserRecognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        handleAIProcess(text);
      };

      browserRecognitionRef.current.onerror = (event: any) => {
        console.error("Browser Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      browserRecognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (Capacitor.isNativePlatform()) {
      SpeechRecognition.requestPermissions();
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !user?.uid || history.length > 0) return;

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, `users/${user.uid}/ai_interactions`),
          orderBy("timestamp", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as AIInteraction)
        );
        const sorted = [...items].sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tA - tB;
        });
        setHistory(sorted);
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `users/${user!.uid}/ai_interactions`,
          false
        );
      }
    };
    fetchHistory();
  }, [isOpen, user?.uid]);

  const speak = async (text: string) => {
    if (!isVoiceEnabled) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await TextToSpeech.speak({
          text: text,
          lang:
            i18n.language === "ar"
              ? "ar-SA"
              : i18n.language === "ku"
              ? "ar-IQ"
              : "en-US",
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: "ambient",
        });
      } catch (e) {
        console.error("Native TTS Error:", e);
      }
    } else if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const langMap: Record<string, string> = {
        en: "en-US",
        ar: "ar-SA",
        ku: "ku-TR",
      };
      const targetLang = langMap[i18n.language] || "en-US";
      const voice = voices.find((v) => v.lang.startsWith(targetLang));
      if (voice) utterance.voice = voice;
      utterance.lang = targetLang;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = async () => {
    if (isListening) {
      if (Capacitor.isNativePlatform()) {
        try {
          await SpeechRecognition.stop();
        } catch (e) {}
      } else if (browserRecognitionRef.current) {
        try {
          browserRecognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel();
    }
    if (Capacitor.isNativePlatform()) {
      await TextToSpeech.stop();
    }

    setInputText("");
    setIsListening(true);

    if (Capacitor.isNativePlatform()) {
      try {
        const available = await SpeechRecognition.available();
        if (available.available) {
          const langMap: Record<string, string> = {
            en: "en-US",
            ar: "ar-SA",
            ku: "ar-IQ",
          };
          const result = await SpeechRecognition.start({
            language: langMap[i18n.language] || "en-US",
            partialResults: false,
            popup: true,
          });

          setIsListening(false);
          if (result.matches && result.matches.length > 0) {
            handleAIProcess(result.matches[0]);
          }
        } else {
          setIsListening(false);
          toast.error("Voice recognition not available");
        }
      } catch (e) {
        console.error("Native Speech Error:", e);
        setIsListening(false);
      }
    } else {
      if (!browserRecognitionRef.current) {
        toast.error(t("geoError"));
        setIsListening(false);
        return;
      }
      const langMap: Record<string, string> = {
        en: "en-US",
        ar: "ar-SA",
        ku: "ar-IQ",
      };
      browserRecognitionRef.current.lang = langMap[i18n.language] || "en-US";
      try {
        browserRecognitionRef.current.start();
      } catch (e) {
        console.error("Browser Speech Start Error:", e);
        try {
          browserRecognitionRef.current.abort();
          setTimeout(() => browserRecognitionRef.current.start(), 100);
        } catch (innerE) {
          setIsListening(false);
        }
      }
    }
  };

  const clearHistory = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const q = query(collection(db, `users/${user.uid}/ai_interactions`));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setHistory([]);
      toast.success(t("historyCleared", "History cleared"));
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.DELETE,
        `users/${user.uid}/ai_interactions`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIProcess = async (text: string) => {
    if (!text.trim()) return;

    // Rate limit check
    if (user) {
      const lastSentKey = `lastAIInteractionSent_${user.uid}`;
      const lastSentStr = localStorage.getItem(lastSentKey);
      const now = Date.now();

      if (lastSentStr) {
        const lastSentAt = parseInt(lastSentStr, 10);
        const timePassed = now - lastSentAt;
        const oneMinute = 60 * 1000;

        if (timePassed < oneMinute) {
          const secondsLeft = Math.ceil((oneMinute - timePassed) / 1000);
          const limitMsg =
            t("rateLimitMessage", { seconds: secondsLeft }) ||
            `Please wait ${secondsLeft}s before sending another message`;
          toast.error(limitMsg);
          speak(limitMsg);
          return;
        }
      }
    }

    setInputText("");
    setIsProcessing(true);
    try {
      const lang = (i18n.language || "en").split("-")[0] as "en" | "ar" | "ku";
      const context = history.slice(-3).map((h) => ({
        userMessage: h.userMessage,
        aiResponse: h.aiResponse,
      }));

      const result = await processAICommand(
        text,
        lang,
        categories,
        IRAQI_CITIES,
        context,
        activeBookings,
        activeRequests,
        settings
      );

      console.log("[VoiceAssistant] AI Result:", result);

      // Save interaction
      if (user) {
        const timestamp = Date.now();
        const lastSentKey = `lastAIInteractionSent_${user.uid}`;

        const newInteraction: AIInteraction = {
          id: Math.random().toString(36).substr(2, 9),
          userMessage: text,
          aiResponse: result.responseMessage,
          timestamp: { seconds: Math.floor(timestamp / 1000) },
          intent: result.intent,
        };
        setHistory((prev) => [...prev, newInteraction]);

        // Save last sent timestamp
        localStorage.setItem(lastSentKey, timestamp.toString());

        try {
          await addDoc(collection(db, `users/${user.uid}/ai_interactions`), {
            userId: user.uid,
            userMessage: text,
            aiResponse: result.responseMessage,
            timestamp: serverTimestamp(),
            intent: result.intent,
            metadata: {
              categoryId: result.categoryId || null,
              city: result.city || null,
              path: result.path || null,
            },
          });
        } catch (e) {
          handleFirestoreError(
            e,
            OperationType.CREATE,
            `users/${user.uid}/ai_interactions`
          );
        }
      }

      speak(result.responseMessage);

      // Handle Intents
      if (result.intent === "SEARCH_WORKERS" && result.categoryId) {
        const dest = `/category/${result.categoryId}${
          result.city ? `?city=${result.city}` : ""
        }`;
        console.log("[VoiceAssistant] Navigating to:", dest);
        navigate(dest);
        setTimeout(() => setIsOpen(false), 3000);
      } else if (result.intent === "NAVIGATE") {
        const pathMap: Record<string, string> = {
          home: "/",
          bookings: "/",
          profile: "/profile",
          chats: "/",
          chat: "/",
          apply: "/apply",
          help: "/help",
          admin: "/admin",
          privacy: "/privacy",
          terms: "/terms",
          "quick-request": "/quick-request",
        };
        const target = result.path?.toLowerCase() || "home";
        const dest = pathMap[target] || "/";
        console.log("[VoiceAssistant] Navigating to:", dest);
        navigate(dest);

        // Smooth scroll to homepage sections for bookings/chats
        if (
          target === "bookings" ||
          target === "chats" ||
          target === "chat" ||
          target === "conversations"
        ) {
          setTimeout(() => {
            let elementId = "recent-chats-section";
            if (target === "bookings") {
              elementId =
                profile?.role === "worker"
                  ? "new-requests-section"
                  : "pending-requests-section";
            }
            const el = document.getElementById(elementId);
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }, 600);
        }

        if (dest !== location.pathname) {
          setTimeout(() => setIsOpen(false), 3000);
        }
      } else if (result.intent === "CANCEL_REQUEST") {
        console.log("[VoiceAssistant] Handling CANCEL_REQUEST intent", result);
        if (result.bookingId) {
          try {
            await updateDoc(doc(db, "bookings", result.bookingId), {
              status: "cancelled",
              updatedAt: serverTimestamp(),
            });
            toast.success(
              t("bookingCancelled", "Booking cancelled successfully")
            );
            setTimeout(() => setIsOpen(false), 3000);
          } catch (e) {
            console.error("Error cancelling booking via AI:", e);
            toast.error(t("cancelError", "Failed to cancel booking"));
          }
        } else if (result.requestId) {
          try {
            await updateDoc(doc(db, "quickRequests", result.requestId), {
              status: "cancelled",
              updatedAt: serverTimestamp(),
            });
            toast.success(
              t("requestCancelled", "Request cancelled successfully")
            );
            setTimeout(() => setIsOpen(false), 3000);
          } catch (e) {
            console.error("Error cancelling request via AI:", e);
            toast.error(t("cancelError", "Failed to cancel request"));
          }
        } else {
          navigate("/bookings");
          setTimeout(() => {
            toast(
              t(
                "cancelInstruction",
                "Please select the booking you want to cancel"
              ),
              { icon: "ℹ️" }
            );
          }, 1000);
        }
      } else if (result.intent === "CONTACT_WORKER") {
        console.log("[VoiceAssistant] Handling CONTACT_WORKER intent", result);
        if (result.bookingId && result.message) {
          try {
            const bookingDoc = await getDoc(
              doc(db, "bookings", result.bookingId)
            );
            if (!bookingDoc.exists()) {
              toast.error(t("bookingNotFound", "Booking not found"));
              return;
            }
            const bookingData = bookingDoc.data();
            const msgId = Math.random().toString(36).substr(2, 9);
            const timestamp = Date.now();

            await setDoc(doc(db, "messages", msgId), {
              id: msgId,
              bookingId: result.bookingId,
              senderId: user?.uid,
              customerId: bookingData?.customerId || "",
              workerId: bookingData?.workerId || "",
              customerEmail: bookingData?.customerEmail || "",
              workerEmail: bookingData?.workerEmail || "",
              text: result.message,
              timestamp,
              read: false,
            });

            // Update booking with last message info
            await updateDoc(doc(db, "bookings", result.bookingId), {
              lastMessage: result.message,
              lastMessageSenderId: user?.uid,
              lastMessageTimestamp: timestamp,
            });

            toast.success(t("messageSent", "Message sent to worker"));
            setTimeout(() => {
              navigate(`/chat/${result.bookingId}`);
              setIsOpen(false);
            }, 2000);
          } catch (e) {
            console.error("Error sending message via AI:", e);
            toast.error(t("sendError", "Failed to send message"));
          }
        } else {
          navigate("/chats");
          setTimeout(() => {
            toast(
              t("contactInstruction", "Select a worker to start chatting"),
              { icon: "💬" }
            );
          }, 1000);
        }
      } else if (result.intent === "CREATE_BOOKING" && result.categoryId) {
        console.log(
          "[VoiceAssistant] Handling CREATE_BOOKING intent. Result:",
          result
        );

        // Verify category exists
        const categoryExists = categories.some(
          (c) => c.id === result.categoryId
        );
        if (!categoryExists) {
          console.warn(
            "[VoiceAssistant] Category ID from AI not found in categories list:",
            result.categoryId
          );
        }

        // If the AI has enough info, it can DIRECTLY book
        // IMPORTANT: Check all required fields for a quick request
        if (result.description && result.city && profile && categoryExists) {
          console.log("[VoiceAssistant] Attempting direct booking...");
          try {
            const reqData = {
              customerId: user!.uid,
              customerName: profile.name,
              customerPhone: profile.phone || "",
              customerPhotoURL: profile.photoURL || "",
              city: result.city,
              category: result.categoryId,
              description: result.description,
              scheduledTime: "As soon as possible",
              location: profile.city || result.city, // Fallback
              photos: [],
              status: "open",
              timestamp: Date.now(),
            };
            console.log(
              "[VoiceAssistant] Collection: quickRequests, Data:",
              reqData
            );

            const docRef = await addDoc(
              collection(db, "quickRequests"),
              reqData
            );
            console.log(
              "[VoiceAssistant] Direct booking successful! ID:",
              docRef.id
            );
            toast.success(t("requestSent"));
            setTimeout(() => setIsOpen(false), 4000);
          } catch (e) {
            console.error("[VoiceAssistant] Direct booking FAILED:", e);
            // Fallback: navigate to form with pre-filled data
            navigate("/quick-request", {
              state: {
                categoryId: result.categoryId,
                description: result.description,
                city: result.city,
              },
            });
          }
        } else {
          console.log(
            "[VoiceAssistant] Direct booking skipped. Missing info:",
            {
              description: !!result.description,
              city: !!result.city,
              profile: !!profile,
              categoryExists,
            }
          );

          // If AI said "I've booked it" but we hit this block, we should clarify or just navigate silently
          console.log(
            "[VoiceAssistant] Redirecting to /quick-request with state"
          );
          navigate("/quick-request", {
            state: {
              categoryId: result.categoryId,
              description: result.description,
              city: result.city,
            },
          });
          setTimeout(() => setIsOpen(false), 4000);
        }
      }
    } catch (error) {
      console.error("AI Processing Error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Error processing AI command";

      let userFriendlyMsg = t(
        "errorProcessingAI",
        "Sorry, I encountered an error. Please check your connection."
      );

      if (
        errorMsg.includes("URL_NOT_CONFIGURED") ||
        errorMsg.includes("Unexpected token") ||
        errorMsg.includes("<!doctype")
      ) {
        userFriendlyMsg =
          "Connection Error: Please check your network connection and ensure your app is up to date.";
      } else if (errorMsg.includes("NETWORK_FAIL")) {
        userFriendlyMsg =
          "Network Error: Could not reach the server. Please check your internet.";
      }

      speak(userFriendlyMsg);
      toast.error(userFriendlyMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <motion.button
        id="ai-assistant-fab"
        drag
        dragMomentum={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ willChange: "transform" }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white p-3 rounded-full shadow-lg border border-white/20 touch-none flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 max-w-lg mx-auto flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "easeInOut",
                      }}
                      style={{ willChange: "transform" }}
                      className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </motion.div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                      {t("aiAssistant")}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleVoice}
                      className={`p-2 rounded-full transition-colors ${
                        isVoiceEnabled
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                      }`}
                      title={isVoiceEnabled ? "Mute Voice" : "Unmute Voice"}
                    >
                      {isVoiceEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                    {history.length > 0 && (
                      <div className="flex items-center">
                        <AnimatePresence mode="wait">
                          {confirmClear ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 rounded-full pl-3 pr-1 py-1"
                            >
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                {t("confirmClear", "Clear?")}
                              </span>
                              <button
                                onClick={() => {
                                  clearHistory();
                                  setConfirmClear(false);
                                }}
                                className="p-1 px-2 bg-red-600 text-white rounded-full text-[10px] font-bold transition-transform active:scale-95"
                              >
                                {t("yes", "Yes")}
                              </button>
                              <button
                                onClick={() => setConfirmClear(false)}
                                className="p-1 px-2 text-gray-500 text-[10px] font-bold"
                              >
                                {t("no", "No")}
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="trash"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={() => setConfirmClear(true)}
                              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                              title={t("clearHistory")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={`p-2 rounded-full transition-colors ${
                        showHistory
                          ? "bg-indigo-100 text-indigo-600"
                          : "hover:bg-gray-100 text-gray-400"
                      }`}
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        if (
                          typeof window !== "undefined" &&
                          "speechSynthesis" in window &&
                          window.speechSynthesis
                        ) {
                          window.speechSynthesis.cancel();
                        }
                        if (Capacitor.isNativePlatform()) TextToSpeech.stop();
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Content */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]"
                >
                  {history.length === 0 && !isProcessing && (() => {
                    const lang = i18n.language || 'en';
                    const isAr = lang.startsWith('ar');
                    const isKu = lang.startsWith('ku');

                    const navSkillsList = [
                      { label: isAr ? 'الرئيسية 🏠' : isKu ? 'سەرەکی 🏠' : 'Home 🏠', cmd: 'Navigate to home' },
                      { label: isAr ? 'طلب سريع ⚡' : isKu ? 'داواکاری خێرا ⚡' : 'Post Quick Request ⚡', cmd: 'Navigate to quick-request' },
                      { label: isAr ? 'ملفي الشخصي 👤' : isKu ? 'پڕۆفایلی من 👤' : 'My Profile 👤', cmd: 'Navigate to profile' },
                      { label: isAr ? 'مركز المساعدة ❔' : isKu ? 'ناوەندی یارمەتی ❔' : 'Help & Support ❔', cmd: 'Navigate to help' },
                      { label: isAr ? 'سجل كعامل 💼' : isKu ? 'تۆمارکردن وەک وەستا 💼' : 'Become a Worker 💼', cmd: 'Navigate to apply' },
                      { label: isAr ? 'شروط الخدمة 📜' : isKu ? 'مەرجەکان 📜' : 'Terms & Privacy 📜', cmd: 'Navigate to terms' },
                    ];

                    if (profile?.role === 'admin') {
                      navSkillsList.push({
                        label: isAr ? 'لوحة الإشراف 🛡️' : isKu ? 'بەسەرپەرشتکار 🛡️' : 'Admin Panel 🛡️',
                        cmd: 'Navigate to admin'
                      });
                    }

                    return (
                      <div className="flex flex-col space-y-5 py-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 p-4 rounded-3xl border border-indigo-500/10 dark:border-indigo-500/20 text-center">
                          <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 mb-1">
                            {isAr ? 'مساعد "خدمات" الذكي 🤖' : isKu ? 'یاریدەدەری زیرەکی خدمات 🤖' : 'Khdmat AI Assistant 🤖'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                            {isAr 
                              ? 'أهلاً بك! يمكنني مساعدتك في العثور على العمال، نشر الطلبات السريعة والتنقل بين كافة الصفحات بسهولة تامة.' 
                              : isKu 
                              ? 'سڵاو! دەتوانم یارمەتیت بدەم لە دۆزینەوەی وەستا، بڵاوکردنەوەی داواکاری خێرا و گواستنەوەت بۆ هەموو پەڕەکان.' 
                              : 'Welcome! I can help you find workers, place requests, cancel tasks, and instantly navigate to any section on the app.'}
                          </p>
                        </div>

                        {/* Section 1: Navigation Skills */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2.5 px-1">
                            <Compass className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {isAr ? 'التنقل السريع في التطبيق' : isKu ? 'گواستنەوەی خێرا' : 'Instant Navigation'}
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {navSkillsList.map((skill, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setInputText(skill.cmd);
                                  handleAIProcess(skill.cmd);
                                }}
                                className="flex items-center justify-between p-2.5 text-xs text-start font-bold bg-gray-50 hover:bg-indigo-50/50 dark:bg-gray-800/60 dark:hover:bg-indigo-900/30 border border-gray-100 dark:border-gray-800 rounded-2xl transition-all active:scale-95 text-gray-700 dark:text-gray-200"
                              >
                                <span>{skill.label}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Search & Service Skills */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2.5 px-1">
                            <Search className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {isAr ? 'البحث عن خدمات وعمال' : isKu ? 'گەڕان بۆ وەستاکان' : 'Find Local Workers'}
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {[
                              { 
                                q: isAr ? 'ابحث لي عن سباك في بغداد' : isKu ? 'بۆ بگەڕێ بۆ بۆریچی لە بەغدا' : 'Find a plumber in Baghdad',
                                hint: isAr ? 'سباكة بغداد 💧' : isKu ? 'بۆریچی بەغدا 💧' : 'Baghdad Plumbing 💧'
                              },
                              { 
                                q: isAr ? 'أحتاج فني تصليح مكيفات في أربيل' : isKu ? 'پێویستم بە وەستای سپلیتە لە هەولێر' : 'I need an AC technician in Erbil',
                                hint: isAr ? 'تكييف أربيل ❄️' : isKu ? 'سپلیتی هەولێر ❄️' : 'Erbil AC Repair ❄️'
                              },
                              { 
                                q: isAr ? 'هل يوجد عمال تنظيف في البصرة؟' : isKu ? 'پاککردنەوە لە بەسرە هەیە؟' : 'Find cleaning services in Basra',
                                hint: isAr ? 'تنظيف البصرة 🧹' : isKu ? 'پاککردنەوە لە بەسرە 🧹' : 'Basra Cleaning 🧹'
                              }
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setInputText(item.q);
                                  handleAIProcess(item.q);
                                }}
                                className="w-full text-start p-3 bg-gray-50 hover:bg-indigo-50/50 dark:bg-gray-800/60 dark:hover:bg-indigo-900/30 border border-gray-100 dark:border-gray-800 rounded-2xl transition-all active:scale-95 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between"
                              >
                                <span className="font-semibold">"{item.q}"</span>
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{item.hint}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 3: Commands guide */}
                        <div className="p-3.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wide mb-1">
                              {isAr ? 'أوامر التحكم الذكية' : isKu ? 'ئاماری سەرەکی زیرەک' : 'Smart Voice Commands'}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed font-semibold">
                              {isAr 
                                ? 'يمكنك التحدث بالصوت مباشرة! جرب قول "إلغاء طلبي السريع" أو "أرسل رسالة للسباك أنني بانتظاره" وسيقوم النظام بتنفيذ الأمر فوراً.' 
                                : isKu 
                                ? 'دەتوانیت بە دەنگ قسە بکەیت! بۆ نموونە بڵێ "داواکارییە خێراکەم هەڵوەشێنەرەوە" یان "نامە بنێرە بۆ بۆریچییەکە بەوەی کە ڕێگام" بۆ جێبەجێکردنی.' 
                                : 'You can query with voice or text! Ask to "cancel my plumber request" or "tell the active worker I am ready" and the database will update in real time.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {history.map((item) => (
                    <React.Fragment key={item.id}>
                      {/* User Message */}
                      <div className="flex justify-end relative animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-tr-none text-sm text-gray-600 dark:text-gray-300 max-w-[85%]">
                          {item.userMessage}
                        </div>
                      </div>
                      {/* AI Response */}
                      <div className="flex justify-start relative animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tl-none text-sm shadow-md max-w-[85%]">
                          {item.aiResponse}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-indigo-50 dark:bg-indigo-900/40 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-xs text-indigo-600 font-medium">
                          {t("processing")}
                        </span>
                      </div>
                    </div>
                  )}

                  {isListening && (
                    <div className="flex justify-end">
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl rounded-tr-none flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                        <span className="text-xs text-red-600 font-medium">
                          {t("listening")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
                  {cooldown > 0 && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg self-start animate-pulse">
                      <Clock size={10} />
                      <span>
                        {t("rateLimitTimer", { seconds: cooldown }) ||
                          `AI cooling down: ${cooldown}s`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          cooldown > 0 ? t("wait") : t("typeAicMessage")
                        }
                        disabled={cooldown > 0}
                        onFocus={handleInputFocus}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            inputText.trim() &&
                            cooldown === 0
                          ) {
                            handleAIProcess(inputText);
                          }
                        }}
                        className={`w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl pr-12 rtl:pr-4 rtl:pl-12 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all ${
                          cooldown > 0 ? "opacity-50" : ""
                        }`}
                      />
                      <button
                        onClick={() =>
                          inputText.trim() &&
                          cooldown === 0 &&
                          handleAIProcess(inputText)
                        }
                        disabled={
                          !inputText.trim() || isProcessing || cooldown > 0
                        }
                        className="absolute right-2 rtl:right-auto rtl:left-2 top-1.5 p-1.5 text-indigo-600 disabled:text-gray-300 bg-white dark:bg-gray-700 rounded-xl shadow-sm transition-opacity"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startListening}
                      disabled={isProcessing || cooldown > 0}
                      className={`p-3 rounded-2xl transition-colors ${
                        isListening
                          ? "bg-red-600 text-white"
                          : cooldown > 0
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
