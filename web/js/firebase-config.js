/**
 * firebase-config.js — Firebase Auth settings (REAL Phone OTP + Google login).
 *
 * ▶ DEMO MODE (abhi): neeche sab EMPTY hai — app demo OTP (123456) se chalta hai.
 * ▶ REAL MODE: docs/FIREBASE_SETUP_HINDI.md follow karke Firebase Console se
 *   ye 4 values copy karke yahan paste karo — Google + real OTP turant chalu!
 *   (Web API key secret nahi hoti — par phir bhi repo me mat chhodo, config file
 *    alag rakhna better hai.)
 */
window.LNM_FIREBASE = {
  apiKey: '',            // Web API Key (Firebase Console → General)
  authDomain: '',        // e.g. labors-near-me.firebaseapp.com
  projectId: '',         // e.g. labors-near-me
  appId: '',             // e.g. 1:1234567890:web:abcdef
};
