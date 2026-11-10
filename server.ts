import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import * as admin from 'firebase-admin';

dotenv.config();

// Attempt to initialize Firebase Admin SDK.
// Cloud Run provides application default credentials.
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log("[Server] Firebase Admin initialized.");
  }
} catch (e) {
  console.error("[Server] Firebase Admin initialization failed:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression()); // Compress all JSON API calls and static files
  app.use(cors()); // Allow the phone app to talk to the server
  app.use(express.json());

  // Password reset endpoint using Admin SDK
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { idToken, newPassword } = req.body;
      if (!idToken || !newPassword) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!admin.apps.length) {
         return res.status(500).json({ error: "Admin SDK not initialized" });
      }

      // 1. Verify the Identity of the caller (must be logged in via Phone Auth)
      const decoded = await admin.auth().verifyIdToken(idToken);
      const phoneNumber = decoded.phone_number;
      if (!phoneNumber) {
        return res.status(403).json({ error: "Only phone-authenticated users can reset their password." });
      }

      // 2. Find the user's primary Email/Password account UID using Firebase Auth directly
      const digits = phoneNumber.replace(/\D/g, '');
      const variants = [
        digits,
        digits.startsWith('964') ? digits : '964' + (digits.startsWith('0') ? digits.slice(1) : digits),
        digits.startsWith('964') ? '0' + digits.slice(3) : (digits.startsWith('0') ? digits : '0' + digits),
        digits.startsWith('964') ? digits.slice(3) : (digits.startsWith('0') ? digits.slice(1) : digits),
        phoneNumber
      ];

      let targetUid = null;
      for (const variant of variants) {
        const authEmail = `${variant.replace(/\D/g, '')}@khdmat.app`;
        try {
          const userRecord = await admin.auth().getUserByEmail(authEmail);
          if (userRecord) {
            targetUid = userRecord.uid;
            break;
          }
        } catch (authErr: any) {
          if (authErr.code !== 'auth/user-not-found') {
            console.error("Auth lookup error:", authErr);
          }
        }
      }

      if (!targetUid) {
        return res.status(404).json({ error: "User profile not found in Firebase Auth." });
      }

      // 3. Update the Firebase Auth account's password AND the Firestore document
      await admin.auth().updateUser(targetUid, { password: newPassword });

      try {
        const fs = require('fs');
        const path = require('path');
        const firebaseConfigStr = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
        const firebaseConfig = JSON.parse(firebaseConfigStr);
        const { getFirestore } = require('firebase-admin/firestore');
        const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

        await db.collection('users').doc(targetUid).update({ 
          password: newPassword, 
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      } catch (firestoreErr) {
        console.warn("[Admin] Firestore update failed, but Auth updated.", firestoreErr);
      }

      console.log(`[Admin] Successfully reset password for UID: ${targetUid} via phone ${phoneNumber}`);
      res.json({ success: true, targetUid });
    } catch (e: any) {
      console.error("[Admin] Reset password error:", e);
      res.status(500).json({ error: e.message || "Failed to reset password" });
    }
  });

  // Account deletion endpoint using Firebase Admin SDK to bypass the requires-recent-login restriction
  app.post("/api/admin/delete-account", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!admin.apps.length) {
         return res.status(500).json({ error: "Admin SDK not initialized" });
      }

      // 1. Verify the Identity of the caller to protect the endpoint
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;

      // 2. Delete the user from Firebase Auth using Admin SDK
      await admin.auth().deleteUser(uid);

      console.log(`[Admin] Successfully deleted Auth user record for UID: ${uid}`);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin] Delete account error:", e);
      res.status(500).json({ error: e.message || "Failed to delete account auth" });
    }
  });

  // AI Processing Endpoint
  app.post("/api/ai/process", async (req, res) => {
    try {
      const { transcript, currentLanguage, categories, cities, context, bookings = [], requests = [], settings = {} } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("[AI Server] GEMINI_API_KEY is missing on server");
        return res.status(500).json({ error: "AI Service unconfigured on server" });
      }

      console.log(`[AI Server] Processing transcript: "${transcript}" in language: ${currentLanguage}`);

      const ai = new GoogleGenAI({ apiKey });

      const categoriesList = categories.map((c: any) => `ID: ${c.id} (Names: ${c.nameEn}, ${c.nameAr}, ${c.nameKu})`).join("\n");
      const citiesList = cities.join(", ");
      const historyText = context?.map((c: any) => `User: ${c.userMessage}\nAI: ${c.aiResponse}`).join("\n") || "No previous history.";
      
      const bookingsContext = bookings.map((b: any) => `- Booking ID: ${b.id}, Category: ${b.category}, Worker: ${b.workerName || 'Unknown'}, Status: ${b.status}`).join("\n");
      const requestsContext = requests.map((r: any) => `- Request ID: ${r.id}, Category: ${r.category}, Status: ${r.status}`).join("\n");

      const supportPhone = settings.supportPhone || "+964 783 271 5181";
      const supportEmail = settings.supportEmail || "support@khdmat.iq";

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
        - UNKNOWN: General questions or unclear requests.

        Rules for 'intent' and parameters:
        1. For CREATE_BOOKING: Extract 'categoryId', 'city', and 'description'.
        2. For CANCEL_REQUEST: If the user specifies which booking or request to cancel, find the 'bookingId' or 'requestId' from the provided lists.
        3. For CONTACT_WORKER: Extract 'bookingId' and the 'message' text.
        4. For NAVIGATE, 'path' should be: [home, bookings, profile, chats, search, notifications, settings].
        5. For SEARCH_WORKERS: Extract 'categoryId' and 'city'.
        6. If the user asks for support number or email, provide the ones listed above in 'responseMessage'.
        
        Return a JSON object with:
        - intent: The intent string.
        - categoryId: (optional)
        - city: (optional)
        - description: (optional)
        - path: (optional)
        - bookingId: (optional) The ID of the booking to cancel or message.
        - requestId: (optional) The ID of the quick request to cancel.
        - message: (optional) The message to send to the worker.
        - responseMessage: A natural language response for the user in ${currentLanguage}.
      `;

      const callAI = async (retryCount = 0): Promise<any> => {
          try {
              const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: "OBJECT",
                    properties: {
                      intent: { type: "STRING" },
                      categoryId: { type: "STRING" },
                      city: { type: "STRING" },
                      description: { type: "STRING" },
                      path: { type: "STRING" },
                      bookingId: { type: "STRING" },
                      requestId: { type: "STRING" },
                      message: { type: "STRING" },
                      responseMessage: { type: "STRING" }
                    },
                    required: ["intent", "responseMessage"]
                  }
                }
              });
              return JSON.parse(response.text || '{}');
          } catch (err: any) {
              const isResourceExhausted = err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429;
              if (isResourceExhausted && retryCount < 2) {
                  const delay = Math.pow(2, retryCount) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return callAI(retryCount + 1);
              }
              throw err;
          }
      };
      
      const result = await callAI();
      
      console.log("[AI Server] Result:", JSON.stringify(result));
      res.json(result);
    } catch (error: any) {
      console.error("[AI Server] Error:", error);
      res.status(500).json({ error: error.message || "AI Processing failed on server" });
    }
  });

  // Health check for debugging
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API 404 handler - MUST be after all API routes but before Vite/Static
  app.all("/api/*", (req, res) => {
    console.log(`[404] API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with robust browser cache caching headers
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));

    // Cache the index.html file in memory to avoid reading from disk on every single visitor load
    let cachedIndexHtml: string | null = null;
    try {
      const fs = require('fs');
      cachedIndexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      console.log("[Server] Production index.html successfully cached in memory.");
    } catch (err) {
      console.error("[Server] Failed to cache index.html:", err);
    }

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      if (cachedIndexHtml) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(cachedIndexHtml);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
