# 📱 Labors Near Me — पूरा Handover Guide (Hindi)

> **ये file क्यों है?** ताकि conversation/agent बदलने पर भी आप (या कोई भी developer)
> इस app को पूरी तरह समझकर उसमें कुछ भी बदल सके। **ये file और ZIP हमेशा safe रखें।**

---

## 0. 👤 User के बारे में (नया chat/agent ज़रूर पढ़े!)

- **भाषा:** हमेशा **Hindi/Hinglish** में बात करें — सरल, दोस्ताना अंदाज़ में
- **तकनीकी level:** Non-developer हैं (beginner) — **छोटे-छोटे steps** में समझाएँ, jargon कम से कम, हर command साफ़ लिखें
- **लैपटॉप नहीं है** — सब कुछ phone से; cloud build (GitHub Actions) से ही APK/AAB बनाएँ, कभी laptop की सलाह न दें
- **खुद करना चाहते हैं** — instructions दें, हर step पर confirm करें; token/password वो खुद बनाते हैं (जब ज़रूरत हो tabhi maangein)
- **अब तक कर चुके हैं:** GitHub repo push ✅ Render deploy ✅ Keystore+secrets ✅ Play Store build (AAB) ✅ · v2 features (Firebase Auth, state/district, medical+others, gallery, profile, ratings, About/Contact) ✅ · v3 (Feedback, Share, user-uploaded category icons white, Chhattisgarh providers) ✅ · **mobile Flutter mirror** (feedback/about/contact/profile-edit/state-district/custom icons) ✅
- **अभी बाकी:** Aadhaar verification — backend routes ready (demo OTP 123456 + Verhoeff check) पर web/mobile UI अभी pending (user ने बाद के लिए रखा); Play Store Console upload user का launch step है
- **Cache का ध्यान रखें:** preview में पुराना UI दिखे तो `/fresh` path वाला तरीका बताएँ (Service Worker cache bug solve हो चुका है — sw.js self-destruct)
- **उनकी जीत celebrate करें** — प्रोत्साहन से काम करते हैं, confidence बढ़ता है 😊

---

## 1. ये App क्या है?

**Labors Near Me** — hyperlocal service-provider discovery app (UrbanClap/JustDial style)।
मज़दूर/कारीगर/सर्विस प्रोवाइडर ढूँढो अपने आस-पास (GPS या city चुनकर)।
3 तरह के users: **Service Seeker** (ढूँढने वाला), **Provider** (कारीगर — खुद register), **Admin**।

- ✅ Phone-OTP login (demo OTP: `123456`)
- ✅ Category search (16 categories), distance-based results, map + list view
- ✅ Click-to-call, WhatsApp, directions, ratings, favorites
- ✅ Provider dashboard (profile edit, leads, availability)
- ✅ Admin panel (categories, verification, analytics)
- ✅ Bilingual Hindi/English, low-bandwidth इंडिया के लिए बना
- ✅ **Play Store पर publish हो चुका है / होने वाला है** — App ID: `com.laborsnearme.labors_near_me`

---

## 2. आपके पास क्या-क्या होना चाहिए (Backup Checklist)

| # | चीज़ | कहाँ रखें | किसलिए |
|---|------|----------|--------|
| 1 | **labors-near-me.zip** (source code) | Google Drive | पूरा कोड — बिना इसके कुछ नहीं |
| 2 | **keystore.b64** (zip के अंदर `keystore/` में) | Google Drive + WhatsApp | app update की "चाबी" |
| 3 | **2 passwords** (KEYSTORE_PASSWORD, KEY_PASSWORD) | लिखकर Drive note में | चाबी के बिना बेकार |
| 4 | **app-release.aab** | Google Drive | Play Store update file (हर बार नई बनती है) |
| 5 | **GitHub account** (id + password) | याद / password manager | कोड + automatic build |
| 6 | **Render account** (id + password) | याद / password manager | backend server (API) |
| 7 | **Play Console** ($25 वाला Google account) | याद / password manager | app publish/update |

⚠️ **keystore वाला note किसी को न भेजें।** ZIP भी सिर्फ़ भरोसेमंद developer को ही दें।

---

## 3. Update / Bug Fix कैसे होगा? (सबसे ज़रूरी हिस्सा)

**लैपटॉप की ज़रूरत नहीं — सब cloud पर होता है।** Flow हमेशा यही है:

```
1. बदलाव बताओ        → "ये bug ठीक करो" / "ये feature जोड़ो"
2. कोड बदलो          → नया chat/developer (ZIP + GitHub token देकर)
3. GitHub पर push     → code अपलोड
4. GitHub Actions     → 10 मिनट में AUTOMATIC build (AAB + APK बनते हैं)
5. Play Console       → new release → नई AAB upload → 1-7 दिन review → LIVE
   (backend बदला हो तो → Render खुद redeploy कर देता है)
```

### नया chat/developer को क्या बोलें? (Copy-paste template)

> "मेरे पास **Labors Near Me** app का source ZIP और keystore.b64 है
> (docs/PROJECT_HANDOVER_HINDI.md अंदर है — पढ़ लो)।
> GitHub repo: https://github.com/mrhmtcool-cloud/my-first-project
> ये काम करना है: ______ (bug/feature लिखो)।
> GitHub Actions से build करके नई AAB दो।"

**बस!** कोई भी developer/agent guide पढ़कर सब समझ जाएगा।

---

## 4. Build कैसे होती है (GitHub Actions — cloud build)

1. https://github.com/mrhmtcool-cloud/my-first-project → **Actions** tab
2. **"Build Android (APK + AAB)"** → **Run workflow** → Backend API URL:
   `https://labors-near-me.onrender.com` → Run
3. 10-15 मिनट बाद नीचे **Artifacts** में:
   - `app-bundle-play-store` → **app-release.aab** (Play Store upload)
   - `apk-direct-install` → **APK** (phone में direct install/test)

> Keystore से signing automatic होती है (repo secrets में सेट हैं:
> `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS=upload`, `KEY_PASSWORD`)।
> Secrets दिखते नहीं — इसलिए अपना passwords note सँभालकर रखें!

---

## 5. Accounts / Services Map

| Service | क्या करती है | Link |
|---------|------------|------|
| **GitHub** | कोड + automatic Android build (Actions) | github.com/mrhmtcool-cloud/my-first-project |
| **Render** | Backend API server (24×7) | dashboard.render.com → `labors-near-me` |
| **Play Console** | Android app publish/update | play.google.com/console |
| **GitHub Pages** (optional) | Privacy policy page | Settings → Pages → /docs |

**Live API:** `https://labors-near-me.onrender.com` (health check: `/api/health`)
**Free tier note:** Render free server 15 min बेकार रहने पर सो जाता है — पहला request 1 मिनट लेता है। ठीक है MVP के लिए।

---

## 6. Demo / Test Logins (test data — real users अपना OTP डालते हैं)

| Role | Phone | Password/OTP |
|------|-------|--------------|
| Admin | 9000000001 | 123456 |
| User | 9000000002 | 123456 |
| कोई भी [6-9] शुरू 10-digit | — | OTP 123456 (demo) |

Web app (browser): `https://labors-near-me.onrender.com/` या ZIP में `LaborsNearMe.html` (offline standalone)।

---

## 7. Code Structure (ZIP अंदर)

```
labors-near-me/
├── backend/       → Node.js API server (Express) — सारा data logic
├── web/           → Website + PWA (पूरा frontend)
├── mobile/        → Flutter Android app (Play Store वाला)
│   └── store-assets/ → app icon + feature graphic (Play listing में लगते हैं)
├── docs/          → ये guide, Play Store guide (Hindi), architecture, privacy policy
├── .github/workflows/ → cloud build automation (Actions)
└── README.md, DEPLOY_HINDI.md → deploy instructions
keystore/          → keystore.b64 (update की चाबी — repo में कभी commit न करें!)
```

**API contract:** `docs/ARCHITECTURE.md` में पूरा backend/frontend/mobile structure + endpoints हैं।

---

## 8. सुरक्षा नियम (याद रखें)

1. **keystore.b64 + passwords** कभी सार्वजनिक न करें (na GitHub, na kisi group me)
2. GitHub token (PAT) बनाओ → काम के बाद **तुरंत delete** कर दो
3. ZIP किसी को देनी हो तो सोचकर — अंदर keystore है
4. Play Console / Render / GitHub के **passwords मज़बूत रखें** (2-step verification ON करें)

---

## 9. अक्सर पूछे सवाल

**Q: बिना लैपटॉप के update होगा?**
A: हाँ — GitHub Actions cloud पर build करता है। आपको सिर्फ़ Play Console पर AAB डालना है।

**Q: keystore खो गया तो?**
A: पुराना app update नहीं होगा कभी। नया app (नए नाम/id से) बनाना पड़ेगा। इसलिए backup checklist!

**Q: नया feature चाहिए?**
A: Section 3 का template copy करके किसी developer/agent को दो — बस।

**Q: पैसे?**
A: Play Console $25 (एक बार)। Render free tier ₹0। बाकी सब free है।
