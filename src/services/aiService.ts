import { GoogleGenAI, Type } from "@google/genai";
import { City, Category } from "../types";
import { Capacitor } from '@capacitor/core';

// Initialize the SDK - always use process.env.GEMINI_API_KEY as per guidelines
const getAI = () => {
    // Vite will statically replace process.env.GEMINI_API_KEY at build time
    // using the define property in vite.config.ts
    // We check both VITE_GEMINI_API_KEY and process.env.GEMINI_API_KEY
    // @ts-ignore
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const processAICommand = async (
  transcript: string,
  currentLanguage: 'en' | 'ar' | 'ku',
  categories: Category[],
  cities: City[],
  context?: { userMessage: string, aiResponse: string }[],
  bookings: any[] = [],
  requests: any[] = [],
  settings?: any
) => {
  try {
    if (!transcript.trim()) {
      return { intent: "UNKNOWN", responseMessage: "" };
    }

    // High fidelity offline conversational fallback
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        let responseMessage = "I am currently offline. I can still help you navigate. Try saying 'go to profile', 'go to register', or 'view bookings'.";
        let intent = "OFFLINE_COMPANION";
        let path = "";

        const cleanCmd = transcript.toLowerCase();
        if (cleanCmd.includes("profile") || cleanCmd.includes("حساب") || cleanCmd.includes("الخاص") || cleanCmd.includes("پرۆفایل") || cleanCmd.includes("پڕۆفایل")) {
            intent = "NAVIGATE";
            path = "profile";
            responseMessage = currentLanguage === 'ar' 
              ? "تفهمت، سأقوم بنقلك إلى صفحة الملف الشخصي الآن." 
              : currentLanguage === 'ku' 
                ? "کەواتە، ئێستا دەتبەم بۆ لاپەڕەی پڕۆفایلەکەت." 
                : "Understood, I am navigating you to your profile page now.";
        } else if (cleanCmd.includes("booking") || cleanCmd.includes("حجز") || cleanCmd.includes("طلب") || cleanCmd.includes("داواکاری") || cleanCmd.includes("حیجز")) {
            intent = "NAVIGATE";
            path = "bookings";
            responseMessage = currentLanguage === 'ar' 
              ? "بالتأكيد، سأقوم بنقلك لصفحة حجوزاتك لمراجعتها دون اتصال." 
              : currentLanguage === 'ku' 
                ? "بێگومان، لاپەڕەی حیجزەکانت بۆ دەکەمەوە بۆ مراجعەکردنی بەبێ هێڵ." 
                : "Certainly, opening your bookings page so you can review them offline.";
        } else if (cleanCmd.includes("apply") || cleanCmd.includes("become") || cleanCmd.includes("register") || cleanCmd.includes("تقديم") || cleanCmd.includes("سجل") || cleanCmd.includes("خزمەتگوزار") || cleanCmd.includes("کار بکەم")) {
            intent = "NAVIGATE";
            path = "apply";
            responseMessage = currentLanguage === 'ar' 
              ? "مفهوم، سأفتح لك صفحة التسجيل كعامل لتقديم خدماتك." 
              : currentLanguage === 'ku' 
                ? "باشە، لاپەڕەی خۆتۆمارکردن وەک پێشکەشکاری خزمەتگوزاری دەکەمەوە." 
                : "Understood, opening the registration page to apply as a service worker.";
        } else if (cleanCmd.includes("help") || cleanCmd.includes("support") || cleanCmd.includes("مساعدة") || cleanCmd.includes("دعم") || cleanCmd.includes("هاوکاری")) {
            intent = "NAVIGATE";
            path = "help";
            responseMessage = currentLanguage === 'ar' 
              ? "حسناً، إليك صفحة المساعدة والدعم لمراجعة أرقام الهواتف والأسئلة الشائعة." 
              : currentLanguage === 'ku' 
                ? "باشە، ئەمەش لاپەڕەی هاوکاری و پشتگیری بۆ مراجعەکردني ژمارەکان و پرسیارە باوەکان." 
                : "Alright, navigating to the help and support page to view contact lines and FAQs.";
        } else if (cleanCmd.includes("home") || cleanCmd.includes("categories") || cleanCmd.includes("رئيسي") || cleanCmd.includes("سەرەکی")) {
            intent = "NAVIGATE";
            path = "home";
            responseMessage = currentLanguage === 'ar' 
              ? "سأقوم بإرجاعك إلى الصفحة الرئيسية الآن." 
              : currentLanguage === 'ku' 
                ? "دەتبەمەوە بۆ لاپەڕەی سەرەکی ئێستا." 
                : "Navigating you back to the home page now.";
        } else {
            if (currentLanguage === 'ar') {
                responseMessage = "أنا حالياً في وضع العمل دون اتصال بالإنترنت. لتغيير الصفحة، يمكنك قول 'اذهب للملف الشخصي'، 'افتح حجوزاتي'، 'مساعدة'، أو 'التسجيل كعامل'. البحث والذكاء الاصطناعي المتقدم يتطلبان توفر الإنترنت.";
            } else if (currentLanguage === 'ku') {
                responseMessage = "من ئێستا لە دۆخی دەرەوەی هێڵم. بۆ گۆڕینی لاپەڕە، دەتوانی بڵێی 'بڕۆ بۆ پڕۆفایل'، 'حیجزەکانم نیشان بدە'، 'هاوکاری'، یان 'تۆمارکردن وەک کارمەند'. گەڕان و ذكاء اصطناعي پێویستی بە ئینتەرنێتە.";
            } else {
                responseMessage = "I am currently operating offline. To change pages, you can say 'go to profile', 'open bookings', 'help', or 'register as worker'. Live AI and worker searching require active internet.";
            }
        }

        return { intent, path, responseMessage };
    }

    const ai = getAI();
    
    // Add a simple retry wrapper for the AI call
    const callAI = async (retryCount = 0): Promise<any> => {
        try {
            if (ai) {
                const categoriesList = categories.map((c: any) => `ID: ${c.id} (Names: ${c.nameEn}, ${c.nameAr}, ${c.nameKu})`).join("\n");
                const citiesList = cities.join(", ");
                const historyText = context?.map((c: any) => `User: ${c.userMessage}\nAI: ${c.aiResponse}`).join("\n") || "No previous history.";
                
                const bookingsContext = bookings.map(b => `- Booking ID: ${b.id}, Category: ${b.category}, Worker: ${b.workerName || 'Unknown'}, Status: ${b.status}`).join("\n");
                const requestsContext = requests.map(r => `- Request ID: ${r.id}, Category: ${r.category}, Status: ${r.status}`).join("\n");

                const supportPhone = settings?.supportPhone || "+964 783 271 5181";
                const supportEmail = settings?.supportEmail || "support@khdmat.iq";

                const prompt = `
                    You are an intelligent AI assistant for "Khdmat", an Iraqi service booking mobile app.
                    The app supports 3 languages: English (en), Arabic (ar), and Kurdish (ku).
                    
                    Current language: ${currentLanguage}
                    Available Cities in Iraq: ${citiesList}
                    Available Service Categories:
                    ${categoriesList}

                    User's Active Bookings:
                    ${bookingsContext || "No active bookings."}

                    User's Active Quick Requests:
                    ${requestsContext || "No active quick requests."}

                    Support Contacts:
                    - Phone: ${supportPhone}
                    - Email: ${supportEmail}

                    Conversation History:
                    ${historyText}

                    Current User transcript: "${transcript}"

                    Goal: Extract the user's intent and parameters.
                    Intents:
                    - SEARCH_WORKERS: User wants to see a list of workers for a specific category and optionally a city.
                    - CREATE_BOOKING: User wants to post a new service request (Quick Request) to all workers in a city.
                    - NAVIGATE: User wants to go to a specific page.
                    - CANCEL_REQUEST: User wants to cancel an existing service request or booking.
                    - CONTACT_WORKER: User wants to message a worker.
                    - UNKNOWN: General questions, greetings, explanations about what you can do, or unclear requests.

                    Rules for 'intent' and parameters:
                    1. For CREATE_BOOKING: Extract 'categoryId', 'city', and 'description'.
                    2. For CANCEL_REQUEST: If the user specifies which booking or request to cancel (e.g. "cancel my plumber request"), find the 'bookingId' or 'requestId' from the provided lists. If multiple or none match specifically, ask for clarification in 'responseMessage'.
                    3. For CONTACT_WORKER: Extract 'bookingId' and the 'message' text. If the user says "tell the plumber I'm coming", find the booking with 'plumber' category and set 'message' to "I'm coming".
                    4. For NAVIGATE, 'path' MUST be one of the following exact strings:
                       - "home" (for home, categories list, front page)
                       - "bookings" (for bookings lists, my bookings, active requests, job requests, pending requests)
                       - "chats" (for chats list, conversations, messages list)
                       - "profile" (for profile, account page, my user profile, register details)
                       - "apply" (for apply as worker, become a worker, register as worker, join as worker)
                       - "help" (for help, help page, support, FAQS, questions, complaints)
                       - "admin" (for admin page, admin dashboard, management console)
                       - "privacy" (for privacy policy, data protection, privacy guidelines)
                       - "terms" (for terms of service, terms and conditions, user agreement)
                       - "quick-request" (for post a request, create a booking, make a quick service call, order now)
                    5. For SEARCH_WORKERS: Extract 'categoryId' and 'city'.
                    6. If the user asks for support number or email, provide the ones listed above in 'responseMessage'.
                    7. If the user asks "What can you do?", "help me with", or similar, respond with a friendly, comprehensive overview of your actions in 'responseMessage'.
                    
                    Response Format:
                    - intent: The intent string.
                    - categoryId: (optional)
                    - city: (optional)
                    - description: (optional)
                    - path: (optional)
                    - bookingId: (optional) The ID of the booking to cancel or message.
                    - requestId: (optional) The ID of the quick request to cancel.
                    - message: (optional) The message to send to the worker.
                    - responseMessage: A natural language response for the user.
                `;

                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                intent: { type: Type.STRING },
                                categoryId: { type: Type.STRING },
                                city: { type: Type.STRING },
                                description: { type: Type.STRING },
                                path: { type: Type.STRING },
                                bookingId: { type: Type.STRING },
                                requestId: { type: Type.STRING },
                                message: { type: Type.STRING },
                                responseMessage: { type: Type.STRING }
                            },
                            required: ["intent", "responseMessage"]
                        }
                    }
                });

                return JSON.parse(response.text || '{}');
            } else {
                // Fallback to backend
                return await fallbackToBackend();
            }
        } catch (err: any) {
            console.warn(`[AI Service] Attempt ${retryCount + 1} failed:`, err);
            const isResourceExhausted = err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429;
            
            if (isResourceExhausted && retryCount < 2) {
                // Exponential backoff
                const delay = Math.pow(2, retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return callAI(retryCount + 1);
            }
            throw err;
        }
    };

    const fallbackToBackend = async () => {
        let apiBase = '';
        if (Capacitor.isNativePlatform()) {
            apiBase = (import.meta as any).env.VITE_API_URL || 'https://ais-pre-7n3kblcmfafnwvgtnazv4k-743533245032.europe-west2.run.app';
            apiBase = apiBase.trim();
            if (!apiBase.startsWith('http://') && !apiBase.startsWith('https://')) apiBase = 'https://' + apiBase;
            if (apiBase.endsWith('/')) apiBase = apiBase.slice(0, -1);
        } else {
            apiBase = window.location.origin;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${apiBase}/api/ai/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, currentLanguage, categories, cities, context, bookings, requests, settings }),
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || errBody.message || `HTTP_${response.status}`);
        }
        return await response.json();
    };

    return await callAI();
  } catch (error: any) {
    console.error("AI Service Error:", error);
    
    let technicalDetail = error.message || String(error);
    if (error.name === 'AbortError') technicalDetail = "Request timed out (15s)";

    const errorMessages = {
      en: `AI Connection Failed. ${technicalDetail}`,
      ar: `فشل الاتصال بالذكاء الاصطناعي. ${technicalDetail}`,
      ku: `پەیوەندی سەرنەکەوت. ${technicalDetail}`
    };
    
    return {
      intent: "UNKNOWN",
      responseMessage: errorMessages[currentLanguage] || errorMessages.en
    };
  }
};
