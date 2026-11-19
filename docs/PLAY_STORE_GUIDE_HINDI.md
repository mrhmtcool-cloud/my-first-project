# Play Store पर App कैसे डालें — पूरी Guide (हिंदी में)

> **कुल समय: ~2-3 घंटे (पहली बार) · खर्च: $25 (एक बार, Google Play Developer account)**
> Laptop की ज़रूरत नहीं — सब कुछ phone/browser + GitHub cloud से होगा।

---

## Step 0 — पहले ये तैयार रखें ✅

| चीज़ | कहाँ से मिलेगी |
|---|---|
| Google account (Gmail) | आपके पास होगा |
| $25 (लगभग ₹2,100) | Debit/Credit card या net banking |
| ये पूरा project (ZIP) | `labors-near-me.zip` |
| Bank/PAN details | Play Console payment + tax info के लिए |

---

## Step 1 — Backend को Internet पर डालें (30 मिनट) 🌐

App को चलने के लिए एक **live server (API)** चाहिए — बिना इसके app खाली दिखेगा।

1. **https://github.com** पर जाएँ → New Repository → नाम `labors-near-me` → Create
2. ZIP unzip करें → सारी files GitHub पर upload करें (web interface: "Add file → Upload files")
3. **https://render.com** पर free account बनाएँ (GitHub से login)
4. **New + → Blueprint** → अपना `labors-near-me` repo चुनें → **Apply**
5. 3 मिनट में link मिलेगा: `https://labors-near-me-xxxx.onrender.com`
6. Test: उस link पर `/api/health` खोलें → `{"ok":true}` दिखना चाहिए ✅

> ⚠️ **यह URL लिखकर रखें** — आगे हर जगह यही लगेगा।
> (चाहें तो बाद में custom domain लगा सकते हैं — जैसे `api.laborsnearme.in`)

---

## Step 2 — GitHub पर App Build करें (20 मिनट) 🔨

**Laptop नहीं चाहिए — GitHub Actions cloud में build होगा!**

### 2a. सबसे पहले Keystore बनाएँ (app का digital signature — एक बार)
1. GitHub पर अपने repo → **Actions** tab → बाएँ "Generate Upload Keystore" → **Run workflow**
2. दो passwords चुनें और **कहीं लिखकर रखें** (भूल गए तो app कभी update नहीं हो सकेगा!)
3. Run होने दें (1 मिनट) → हरा होने पर नीचे **upload-keystore** artifact download करें
4. `keystore.b64` file Notepad में खोलें → सारा text copy करें
5. Repo → **Settings → Secrets and variables → Actions → New repository secret** — 4 secrets जोड़ें:

| Name | Value |
|---|---|
| `KEYSTORE_BASE64` | keystore.b64 का पूरा text |
| `KEYSTORE_PASSWORD` | आपका password |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | आपका key password |

### 2b. अब App build करें
1. **Actions** tab → "Build Android (APK + AAB)" → **Run workflow**
2. "Backend API URL" बॉक्स में **Step 1 वाला URL** डालें (जैसे `https://labors-near-me-xxxx.onrender.com`)
3. **Run** दबाएँ → 10-15 मिनट लगेंगे ☕
4. हरा होने पर नीचे Artifacts में दो files मिलेंगी:
   - **app-bundle-play-store** → इसमें `app-release.aab` है ← **यही Play Store में जाएगा**
   - **apk-direct-install** → APK, जो सीधे phone में install/share हो सकता है

> 💡 APK download करके अपने phone में install करके पहले **खुद test कर लें** — सब सही लगे तभी Play Store पर डालें।

---

## Step 3 — Google Play Developer Account बनाएँ (30 मिनट) 💳

1. **https://play.google.com/console** खोलें → Google account से login
2. **$25 one-time fee** pay करें (card / net banking)
3. अपनी जानकारी भरें: नाम, पता, email, phone
4. बैंक और PAN details (पैसे कमाने के लिए — अभी ज़रूरी नहीं, बाद में भी दे सकते हैं)

---

## Step 4 — App Listing बनाएँ (45 मिनट) 📝

1. Console में **Create app** दबाएँ:
   - App name: **Labors Near Me**
   - Default language: **Hindi (India)** या English
   - App or Game: **App**
   - Free or Paid: **Free**
   - Declarations ☑️ (सब सही है — gambling नहीं, ads नहीं)

### 4a. App access / Ads
- "App access" → **All functionality available without restrictions**
- "Ads" → **No, my app does not contain ads**

### 4b. Store listing (दुकान की सजावट)
- **App name:** `Labors Near Me - Find Workers`
- **Short description (80 char):**
  `Electrician, tailor, plumber, mason — trusted workers near you. Call in one tap.`
- **Full description** (Hindi+English mix चलेगा):
```
Labors Near Me — अपने पास के भरोसेमंद कामगार खोजें!

Electrician, tailor (दर्जी), plumber, raj mistri (mason), bhandara/catering,
AC repair, carpenter, painter, driver, mobile repair, beautician, cook, mali —
सब एक app में।

★ Features:
• GPS से नज़दीकी कामगार खोजें या शहर चुनें
• Category icons से तुरंत खोज — 16 categories
• एक tap में Call या WhatsApp
• Map पर देखें, directions पाएँ
• असली reviews और ratings
• Hindi और English दोनों में
• अपनी सेवा FREE में लिस्ट करें (24 घंटे में verify)
• कम internet पर भी तेज़ चलता है

Apni dukaan/service list karein aur paayein naye customers!
```
- **App icon:** `mobile/store-assets/app-icon-512.png` upload करें
- **Feature graphic (1024x500):** `mobile/store-assets/feature-graphic-1024x500.png` upload करें
- **Screenshots:** कम से कम 2 (8-10 best). बनाने का आसान तरीका:
  - APK अपने phone में install करें → 4-5 screens के screenshots लें
    (Home + categories, Search results, Provider profile, Hindi mode, Dashboard)
  - Phone screenshots सीधे upload कर दें — Play Console उन्हें accept कर लेगा

### 4c. Categorization
- App category: **Business** या **Tools**
- Tags: services, local, workers

### 4d. Contact details
- Email डालें (ज़रूरी है)
- Website: आपका Render URL डाल सकते हैं (optional)
- Phone (optional)

---

## Step 5 — Privacy Policy (ज़रूरी है!) 🔒

Play Store बिना privacy policy के app accept नहीं करता।

1. इसी repo में `docs/privacy-policy.html` तैयार है
2. उसे **GitHub Pages** पर free host करें:
   - Repo → Settings → Pages → Source: "Deploy from a branch"
   - Branch: `main`, Folder: `/docs` → Save
   - 2 मिनट में link मिलेगा: `https://आपका-username.github.io/labors-near-me/privacy-policy.html`
3. वही link Play Console → App content → Privacy policy में डालें

---

## Step 6 — App Content Forms (30 मिनट) 📋

Console के "App content" सेक्शन में सब भरें:

1. **Privacy policy** → Step 5 वाला link
2. **App access** → All functionality available
3. **Ads** → No
4. **Content rating** → सवालों के जवाब:
   - Violence: No · Sexual content: No · Language: No · Gambling: No
   - Rating मिलेगी: **3+ / Everyone** ✅
5. **Target audience** → Age 18+ (workers/services platform) — या "Everyone"
6. **News app** → No
7. **COVID-19** → No
8. **Data safety** → ये भरें (हमारा app क्या collect करता है):
   - Data collected: **Location (approximate)**, **Phone number**, **Name**
   - Purpose: App functionality, Account management
   - Data shared with third parties: **No**
   - Encrypted in transit: **Yes**
   - Can users request deletion: **Yes** (email से)
9. **Financial features** → No

---

## Step 7 — AAB Upload करें (15 मिनट) 🚀

1. Console → **Testing → Internal testing** (सबसे पहले यहाँ डालना आसान है)
2. **Create new release**
3. Step 2 वाला **`app-release.aab`** upload करें
4. Release name: `1.0.0` · Notes (optional):
```
First release: search, categories, provider profiles, call/WhatsApp,
Hindi/English, favorites, reviews, provider registration & dashboard.
```
5. **Review release** → **Start release to Internal testing**

> Internal testing में आप + आपके 100 testers पहले try कर सकते हैं।
> सब सही लगे तो **Production** में "Promote release" दबाएँ।

---

## Step 8 — Review और Live! 🎉

1. पहली बार review में **1-7 दिन** लगते हैं
2. Google email करेगा — कोई दिक्कत हो तो वो बताएँगे (आम मुद्दे: privacy policy link, screenshots)
3. Approve होते ही app **Play Store पर LIVE**! 🥳
4. अपना link share करें: `https://play.google.com/store/apps/details?id=com.laborsnearme.labors_near_me`

---

## आगे क्या? (Optional upgrades)

| काम | कैसे |
|---|---|
| Real OTP SMS (demo बंद) | MSG91 account → Render में `MSG91_AUTHKEY` env var |
| ज़्यादा cities/providers | Admin panel → Bulk CSV upload |
| Apple App Store | Mac या Codemagic cloud से iOS build + $99/year Apple account |
| App update कैसे | `pubspec.yaml` में version बढ़ाएँ (जैसे `1.0.1+2`) → फिर से Actions में build → Play Console में नया release |
| Ratings बढ़ाना | App में "rate us" prompt बाद में जोड़ें |

---

## ❌ आम गलतियाँ (इनसे बचें)

1. **AAB की जगह APK upload** — Play Store को AAB चाहिए (हमारा workflow दोनों बनाता है)
2. **Privacy policy नहीं** — सबसे आम rejection
3. **Screenshots नहीं** — कम से कम 2 लगें
4. **Keystore/passwords खोना** — app कभी update नहीं हो पाएगा! Google Drive पर backup रखें
5. **Demo API URL** — app में `YOUR-API-URL` वाला placeholder रह गया तो app खाली दिखेगा
6. **बिना test के upload** — पहले APK अपने phone में install करके देखें

---

कहीं अटकें तो screenshot लेकर पूछें — मैं हर step में मदद करूँगा! 💪
