# 🔥 Firebase Setup Guide (Hindi) — Real Phone OTP + Google Login

> **Ye kyun?** App me asli OTP SMS aur asli Google login chalu karne ke liye.
> **Free hai** (monthly free quota bahut zyada hai normal use ke liye).
> **Time:** ~10 minute. **Koi coding nahi** — sirf copy-paste.

---

## Step 1: Firebase project banao

1. **https://console.firebase.google.com** kholein (apne Google account se)
2. **"Create a project"** (ya "Add project") click
3. Naam: **`labors-near-me`** → Continue → Continue → **Create project**
4. "Your Firebase project is ready" → **Continue**

## Step 2: Authentication ON karo

1. Left menu → **Build → Authentication** → **Get started**
2. **Sign-in method** tab → **Phone** → Enable → Save ✅
3. Wapas **Sign-in method** → **Google** → Enable → Project support email select → Save ✅

## Step 3: Web app register karo

1. Project home → **Web icon (</>)** → App nickname: `labors-web` → **Register app**
2. `firebaseConfig` object dikhega — **4 values copy karo:**

```js
apiKey: 'AIza...',            // ← ye chahiye
authDomain: 'labors-....',    // ← ye chahiye
projectId: 'labors-...',      // ← ye chahiye
appId: '1:123:web:...',       // ← ye chahiye
```

3. Inhe paste karo: **`web/js/firebase-config.js`** me (GitHub par file edit karo ya mujhe bhej do)

## Step 4: Android app register karo (Play Store app ke liye)

1. Firebase me → **Add app → Android icon**
2. Android package name: **`com.laborsnearme.labors_near_me`** ← EXACT ye
3. App nickname: `labors-android` → **Register app**
4. `google-services.json` download hoti hai — **ise safe rakho** (mujhe bhej do ya GitHub secret banayenge)
5. **SHA-1 fingerprint** add karna hoga (Google login ke liye):
   - Naya GitHub token banakar mujhe do — main Actions se SHA-1 nikal dunga
   - Ya manually: Play Console → Setup → App integrity → App signing key certificate → SHA-1 copy

## Step 5: Phone auth ke liye domain allow karo

1. **Authentication → Settings → Authorized domains** me add karo:
   - `labors-near-me.onrender.com`
   - `localhost`

## Step 6: Done! 🎉

Bas! Ab:
- **Web**: `firebase-config.js` me values → real Google + real OTP turant chalu
- **Android**: `google-services.json` + config → main app me laga dunga

---

## ⚠️ Dhyan rakhein

| Baat | Detail |
|------|--------|
| **Free quota** | Phone OTP: ~10K/month free (zyadatar apps ke liye kaafi) |
| **Billing** | Billing tab me koi card DAALNE KI ZAROORAT NAHI (Spark/free plan) |
| **Safety** | `google-services.json` aur config public repo me NA rakhein — mujhe bhejo, main secure way se lagaunga |
| **Demo mode** | Jab tak config khaali hai — app demo OTP (123456) se chalta hai, sab kuch kaam karta hai |

---

## Mujhe kya bhejna hai?

1. `firebase-config.js` ki **4 values** (apiKey, authDomain, projectId, appId)
2. `google-services.json` file
3. (Optional) SHA-1 — agar khud na nikal pao

**Ye sab mujhe de do — baaki main kar lunga!** 💪
