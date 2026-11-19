/**
 * firebase-auth.js — REAL Google + Phone OTP login via Firebase Auth (client side).
 * Demo mode: jab tak firebase-config.js me values nahi hain, sab kuch pehle jaisa
 * (OTP 123456 + demo Google). Config bharne par ye file REAL login chalu kar deti hai.
 *
 * Flow: Firebase se ID token → POST /api/auth/firebase → app ka apna session token.
 */
const LnmFirebase = (() => {
  const cfg = window.LNM_FIREBASE || {};
  const configured = !!(cfg.apiKey && cfg.projectId && cfg.appId);
  let auth = null, loaded = false;

  async function loadSdk() {
    if (loaded) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    auth = firebase.auth();
    loaded = true;
  }

  async function toAppSession(fbUser) {
    const idToken = await fbUser.getIdToken();
    return API.post('/auth/firebase', { idToken, name: fbUser.displayName || '', cityId: S.cityId });
  }

  return {
    get configured() { return configured; },

    /** Google popup login → app session {token, user}. */
    async google() {
      if (!configured) throw Object.assign(new Error('not_configured'), { data: { error: 'firebase_not_configured' } });
      await loadSdk();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await auth.signInWithPopup(provider);
      return toAppSession(cred.user);
    },

    /** Phone OTP start → returns confirmation (step 1). */
    async phoneStart(phoneE164, buttonEl) {
      if (!configured) throw Object.assign(new Error('not_configured'), { data: { error: 'firebase_not_configured' } });
      await loadSdk();
      if (!window._lnmRecaptcha) {
        window._lnmRecaptcha = new firebase.auth.RecaptchaVerifier(buttonEl || 'login-go', { size: 'invisible' });
      }
      return auth.signInWithPhoneNumber(phoneE164, window._lnmRecaptcha);
    },

    /** Phone OTP verify (step 2) → app session {token, user}. */
    async phoneVerify(confirmation, code) {
      const cred = await confirmation.confirm(code);
      return toAppSession(cred.user);
    },
  };
})();
