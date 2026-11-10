# Khdmat (خدمات) 🛠️🇮🇶

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini_AI-8E75B2?logo=google-gemini&logoColor=white)](https://aistudio.google.com/)

**Khdmat (خدمات)** is an on-demand home & local services marketplace platform built specifically for Iraqi cities (Baghdad, Erbil, Basra, Sulaymaniyah, Najaf, Karbala, and more). It connects verified local service professionals (plumbers, electricians, cleaners, technicians, painters, carpenters) with customers in real-time, complete with multilingual voice assistance, instant booking, and cross-platform native Android support.

---

## 🌟 Key Features

- **🌐 Trilingual Support (العربية • کوردی • English)**: Full RTL support for Arabic and Sorani Kurdish, alongside English with dynamic font switching and instant locale detection.
- **🎙️ Voice AI Assistant**: Powered by **Google Gemini AI** — users can speak naturally in Iraqi Arabic, Kurdish, or English to search for technicians, request quotes, or navigate the application.
- **📍 City & Geolocation Targeting**: Tailored service catalogs across all Iraqi governorates with interactive Leaflet map selection for exact job locations.
- **⚡ Quick Urgent Requests**: Post urgent service requests in seconds with photo attachments and receive quotes directly from nearby active workers.
- **💬 Real-Time Messaging & Status**: In-app live chat between clients and service providers with Firestore real-time updates and push/local notifications.
- **📱 Native Android Ready**: Built with **Capacitor** for seamless compilation to native Android APKs with splash screens, haptics, and native auth plugins.
- **🔒 High Security & Privacy**: Production-hardened Firestore security rules, server-side secret handling, and secure account deletion.
- **🌙 Dark / Light Mode**: Polished interface with adaptive dark mode and smooth Framer Motion transitions.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 (Hooks, Context, Lazy Loading) |
| **Language** | TypeScript |
| **Build Tool & Bundler** | Vite 6 |
| **Styling** | Tailwind CSS v4, Lucide Icons, Framer Motion |
| **Backend & Dev Server** | Node.js + Express (serving Vite middleware & AI proxy) |
| **Database & Auth** | Firebase Firestore (with persistent disk cache) & Firebase Auth |
| **Mobile Platform** | Capacitor 8 (Android runtime) |
| **AI Integration** | Google Gemini SDK (`@google/genai`) |
| **Maps** | Leaflet & React-Leaflet |
| **i18n** | i18next & react-i18next with RTL layout support |

---

## 📁 Repository Structure

```text
├── android/                   # Native Android project (Capacitor)
│   ├── app/                   # Android app module, manifests, and resources
│   └── keystore.properties.example # Template for release signing (DO NOT commit keystores)
├── public/                    # Static assets & PWA files
├── src/
│   ├── components/            # Reusable UI components (ErrorBoundary, MapPicker, PullToRefresh, etc.)
│   ├── services/              # AI service (Gemini), notifications, and background helpers
│   ├── App.tsx                # Main routing, screens, and application state
│   ├── AuthContext.tsx        # Authentication & persistent user profile context
│   ├── firebase.ts            # Firebase client initialization & offline cache fallback
│   ├── i18n.ts                # Localization dictionary (AR, EN, KU)
│   ├── types.ts               # Application TypeScript interfaces
│   └── mockData.ts            # Starter categories and sample data
├── server.ts                  # Express backend proxy for Gemini AI & Firebase Admin
├── firestore.rules            # Firestore security rules
├── firebase-blueprint.json    # Firestore schema & security rules blueprint
├── firebase-applet-config.example.json # Template for Firebase credentials
├── .env.example               # Template for environment variables
└── capacitor.config.json      # Capacitor native configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or v20.x+)
- **npm** (v9+)
- *(Optional for Android build)*: **Android Studio** (Giraffe or newer) with Android SDK 34+

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/khidmat-app.git
cd khidmat-app
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy the example environment template:
```bash
cp .env.example .env
```
Open `.env` and configure:
```env
# Get a key from https://aistudio.google.com/
GEMINI_API_KEY=your_actual_gemini_api_key

# Optional backend URL for mobile testing (leave blank for local web dev)
VITE_API_URL=
```

### 5. Configure Firebase
Create a Firebase project at [Firebase Console](https://console.firebase.google.com/):
1. Enable **Authentication** (Google, Phone/Email).
2. Enable **Firestore Database** in production mode.
3. Deploy the provided `firestore.rules`.
4. Copy `firebase-applet-config.example.json` to `firebase-applet-config.json` with your project's web credentials:
```json
{
  "projectId": "your-firebase-project-id",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "authDomain": "your-firebase-project-id.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "your-firebase-project-id.firebasestorage.app",
  "messagingSenderId": "your-sender-id"
}
```

### 6. Run the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Building the Native Android APK

1. **Build Web Assets**:
   ```bash
   npm run build
   ```

2. **Sync with Capacitor Android**:
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

4. **Release Signing**:
   Copy `android/keystore.properties.example` to `android/keystore.properties` and add your signing key details before generating a release APK/AAB.

---

## 🔐 Security & Privacy Policy

- **No Secrets in Source Control**: Never commit `.env`, `keystore.properties`, or private `.jks` signing keys. The `.gitignore` is pre-configured to block them.
- **Server-Side API Proxying**: Sensitive API calls (like Google Gemini processing and Admin user management) run securely through `server.ts` without exposing private keys to client browsers.
- **Role-Based Access Control**: Firestore rules enforce strict permissions — customers, service providers, and administrators can only read and mutate authorized documents.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
