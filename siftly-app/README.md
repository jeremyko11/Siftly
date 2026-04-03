# Siftly Android App

Expo-based Android app that wraps the Siftly web interface in a WebView.

## Setup

```bash
cd siftly-app
npm install
npx expo prebuild --platform android  # Generates android/ directory
```

## Configure

Edit `app.json` to set your Android package name:

```json
{
  "android": {
    "package": "com.yourname.siftly"
  }
}
```

## Build APK

```bash
# Development build (fastest)
npx expo run:android

# Or build APK with EAS
eas build -p android --profile preview
```

## First-Run Setup

1. Install the APK on your Android device
2. On first launch, enter your Siftly server URL:
   - Local: `http://<your-tailscale-ip>:3000`
   - Public: your public Siftly URL
3. Log in with your Siftly password
4. All features work through the embedded WebView

## Architecture

- **Expo SDK 52** with expo-router (file-based routing)
- **WebView** for the main Siftly interface
- **SecureStore** for persisting the Siftly URL securely
- **Bottom tabs**: Home, Search, Review, Settings

The app is essentially a secure WebView wrapper. All actual functionality lives in the Siftly web app — the mobile app just provides a native shell with persistent login.

## Files

```
siftly-app/
  app/              # Expo Router screens
    _layout.tsx     # Root layout with auth check
    setup.tsx       # First-run URL configuration
    (tabs)/         # Bottom tab navigation
      index.tsx     # Home — main WebView
      search.tsx    # AI Search WebView
      review.tsx    # Review WebView
      settings.tsx  # Settings WebView
  lib/
    storage.ts      # SecureStore wrapper
    siftly.ts      # Siftly API client
  app.json         # Expo configuration
  package.json
  README.md
```
