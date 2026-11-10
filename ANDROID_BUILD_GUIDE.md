# Android Studio AAB Build Guide (KHDMAT)

Follow these steps to generate your Android App Bundle (AAB) successfully without errors.

## 1. Prerequisites
- **Android Studio:** Jellyfish or newer recommended.
- **Java:** JDK 17 or 21 (required for Android SDK 35).
- **Node.js:** v18 or newer.

## 2. Prepare the Code
In your terminal, run the following command to build the web app and sync it with the Android project:

```bash
npm run build:android
```

This command cleans the old build, creates a fresh `dist/` folder, and copies it into the `android/` directory.

## 3. Open in Android Studio
1. Launch Android Studio.
2. Select **Open** and choose the `android` folder from your project root.
3. Wait for the **Gradle Sync** to finish. If you see a prompt to upgrade Gradle, you can click "OK" or "Skip" (it is already pre-configured for version 8.7).

## 4. Generate the AAB (App Bundle)
1. Go to the top menu: **Build > Generate Signed Bundle / APK...**
2. Select **Android App Bundle** and click **Next**.
3. **Key store path:**
   - If you have an existing `.jks` key, select it.
   - If not, click **Create new...** to create a release key. Save it safely.
4. Fill in the passwords and aliases.
5. Click **Next**.
6. Select **release** as the build variant.
7. Click **Finish**.

Your `.aab` file will be generated in `android/app/release/`.

## Common Fixes
- **Clean Project:** If you see weird errors, go to `Build > Clean Project` then `Build > Rebuild Project`.
- **Sync Errors:** Click the "elephant" icon (Sync Project with Gradle Files) in the top right toolbar.
- **Min SDK:** The project is set to Min SDK 24 (Android 7.0) to ensure wide compatibility.
- **Target SDK:** Set to 35 (latest) to comply with Google Play requirements.
