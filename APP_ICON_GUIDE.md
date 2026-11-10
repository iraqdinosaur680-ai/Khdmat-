# 📱 Mobile App Icon & Splash Screen Guide

To add a professional icon and splash screen to your Android app, follow these steps.

## 1. Prepare your Assets
Prepare two high-quality images:
- **Icon:** A square image (ideally **1024x1024 px**) named `icon-only.png`.
- **Splash Screen:** A large image (ideally **2732x2732 px**) named `splash.png`.

## 2. Upload to the Cloud
Upload these two files to the root directory of your project (where `package.json` is located).

- `assets/icon-only.png` (or just `icon-only.png` in root)
- `assets/splash.png` (or just `splash.png` in root)

## 3. Generate Mobile Resources
Once the files are uploaded, you can run the following command to automatically generate all the different sizes needed for Android:

```bash
npm run assets:generate
```

## 4. Where are the files stored?
The generation tool will automatically update the following folders in your Android project:
- **Icons:** `android/app/src/main/res/mipmap-*`
- **Splash Screens:** `android/app/src/main/res/drawable-*`

## 5. Build your App
After generating the assets, rebuild your Android app bundle:

```bash
npm run build:android
```

---

### Tips for a Great Icon:
- **Simplicity:** Don't put too much text or fine detail.
- **Contrast:** Ensure your logo stands out against the background.
- **Safe Area:** Keep the main part of your logo in the center 60% of the square to avoid being clipped by different phone shapes (circles, squares, squircles).
