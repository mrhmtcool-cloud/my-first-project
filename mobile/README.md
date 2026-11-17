# Labors Near Me — Flutter Mobile App (Android + iOS)

यह app वही product है जो `web/` PWA में है — native mobile shell में।
Same REST API, same features: search, categories, provider profiles, call/WhatsApp,
favorites, reviews, Hindi/English, provider registration, dashboard.

---

## ☁️ बिना laptop के Build करें (GitHub Actions — RECOMMENDED)

1. पूरा repo GitHub पर push करें
2. **Actions → "Generate Upload Keystore" → Run workflow** — एक बार (नीचे देखें)
3. **Actions → "Build Android (APK + AAB)" → Run workflow**
   - "Backend API URL" में अपना live API डालें (जैसे `https://labors-near-me-xxxx.onrender.com`)
4. 10-15 मिनट बाद artifacts download करें:
   - `app-bundle-play-store/app-release.aab` → **Play Store upload के लिए**
   - `apk-direct-install/*.apk` → सीधे phone में install/share

Play Store पर upload करने की पूरी guide: **`docs/PLAY_STORE_GUIDE_HINDI.md`**

### Keystore (एक बार — ज़रूरी)
Play Store को signed AAB चाहिए। "Generate Upload Keystore" workflow चलाएँ,
artifact download करें, और repo secrets में 4 values डालें
(`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS=upload`, `KEY_PASSWORD`) —
पूरा steps guide के Step 2a में है। **Passwords कहीं सुरक्षित लिखें!**

---

## 💻 Laptop से Build करें (optional)

```bash
cd mobile
flutter pub get
dart run flutter_launcher_icons      # assets/icon.png → launcher icons
flutter create . --platforms android --org in.laborsnearme
flutter build apk --release --split-per-abi
flutter build appbundle --release    # Play Store के लिए
```

**API URL कैसे बदलें:** `lib/core/api_client.dart` में `defaultValue` की जगह अपना URL,
या build करते समय: `flutter build apk --dart-define=API_BASE=https://your-api.onrender.com`

---

## 📁 Structure

```
mobile/
├── pubspec.yaml            — deps: http · geolocator · url_launcher · shared_preferences
├── assets/icon.png         — app icon (launcher icons इसी से बनते हैं)
├── store-assets/           — Play Store graphics (icon 512 + feature graphic 1024x500)
├── scripts/setup_android.py — CI helper: manifest label/permissions + release signing
└── lib/
    ├── main.dart           — app entry, theme (orange brand), language/city state
    ├── models.dart         — JSON models (API contract)
    ├── core/
    │   ├── api_client.dart — REST client (1 line में API URL बदलें)
    │   ├── i18n.dart       — English/हिंदी strings
    │   └── widgets.dart    — avatar, stars, badges, category icons
    └── screens/
        ├── home_screen.dart       — shell + home (categories, city, top rated)
        ├── search_screen.dart     — search + filters + sort + GPS
        ├── detail_screen.dart     — profile + call/WhatsApp/directions + reviews
        ├── favorites_screen.dart  — saved workers
        ├── account_screen.dart    — OTP login + account hub
        ├── register_screen.dart   — provider self-registration
        └── dashboard_screen.dart  — my listings + leads + edit + open/closed
```

## 🔑 Demo logins (jab backend demo mode me ho)
- Admin: `9000000001` / OTP `123456`
- Koi bhi valid number / OTP `123456`

## Apple App Store (baad me)
1. Apple Developer account ($99/year) + Mac ya Codemagic cloud
2. `flutter build ipa` (ya Codemagic workflow) → App Store Connect me upload
3. Feature graphic/icon `store-assets/` me already hai
