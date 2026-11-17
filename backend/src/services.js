/**
 * services.js — Production integration adapters with SAFE DEMO FALLBACKS.
 *
 * Each adapter works out-of-the-box in demo mode (no keys needed) and switches
 * to the real provider the moment the matching env var is set — no code changes:
 *
 *   SMS/OTP   : MSG91        → set MSG91_AUTHKEY + MSG91_SENDER_ID (DLT-registered)
 *   Push      : Firebase FCM → set FCM_SERVER_KEY
 *   Photos/KYC: Cloudinary   → set CLOUDINARY_URL
 *
 * This is the exact swap-point promised in docs/ARCHITECTURE.md §1.6–1.8.
 */
const crypto = require('crypto');

/* ───────────────────────── SMS / OTP ───────────────────────── */
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '';
const MSG91_SENDER = process.env.MSG91_SENDER_ID || 'LABORS';

/**
 * Send the login OTP. Demo mode returns the code for on-screen display;
 * production sends a DLT template SMS and the code NEVER leaves the server.
 * @returns {{mode:'demo'|'sent'}}
 */
async function sendOtpSms(phone, code) {
  if (!MSG91_AUTHKEY) {
    console.log(`[sms:demo] +91${phone} → OTP ${code}`);
    return { mode: 'demo' };
  }
  // MSG91 Flow API (DLT-compliant template variable = OTP)
  const body = new URLSearchParams({
    template_id: process.env.MSG91_TEMPLATE_ID || '',
    recipients: JSON.stringify([{ mobiles: '91' + phone, VAR1: code }]),
  });
  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: MSG91_AUTHKEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('sms_failed:' + res.status);
  return { mode: 'sent' };
}

/** Production OTP is random; demo keeps 123456 so testers never get stuck. */
function generateOtp() {
  return MSG91_AUTHKEY ? String(crypto.randomInt(100000, 1000000)) : '123456';
}

/* ───────────────────────── PUSH (FCM) ───────────────────────── */
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';

/**
 * Send a push notification (new lead / verification status).
 * Demo mode logs instead — set FCM_SERVER_KEY for real delivery (Phase 2 phones).
 */
async function sendPush(fcmToken, payload) {
  if (!fcmToken) return { mode: 'skipped' };
  const message = {
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
  };
  if (!FCM_SERVER_KEY) {
    console.log(`[push:demo] ${fcmToken.slice(0, 12)}… →`, message.notification.title, '|', message.notification.body);
    return { mode: 'demo' };
  }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: 'key=' + FCM_SERVER_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: fcmToken, notification: message.notification, data: message.data }),
  });
  return { mode: res.ok ? 'sent' : 'failed' };
}

/** Bilingual "new lead" push — the notification providers care about most. */
function newLeadPush(lead) {
  return {
    title: 'नई लीड! 🔔',
    body: lead.type === 'whatsapp' ? 'किसी ने व्हाट्सएप किया — अभी देखें'
      : lead.type === 'call' ? 'किसी ने कॉल किया — अभी देखें'
      : 'किसी ने रास्ता पूछा',
    data: { type: 'new_lead', leadId: String(lead.id), leadType: lead.type, providerId: String(lead.providerId) },
  };
}

/** Bilingual verification-status push. */
function verifyPush(status) {
  return status === 'verified'
    ? { title: '✅ आपकी लिस्टिंग लाइव है!', body: 'Labors Near Me पर आप खोज में दिख रहे हैं। नई लीड्स के लिए तैयार रहें।', data: { type: 'verified' } }
    : { title: 'लिस्टिंग अपडेट', body: 'आपकी लिस्टिंग की स्थिति बदली गई है — डैशबोर्ड देखें।', data: { type: 'status', status } };
}

/* ───────────────────────── MEDIA (Cloudinary) ───────────────────────── */
const CLOUDINARY_URL = process.env.CLOUDINARY_URL || '';

/**
 * Upload a photo (data-URL from the MVP client) to Cloudinary when configured.
 * Falls back to keeping the compressed data-URL (demo mode — single-node store).
 * @returns {Promise<string|null>} public image URL
 */
async function uploadPhoto(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  if (!CLOUDINARY_URL) return dataUrl.slice(0, 400000); // demo: inline
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', process.env.CLOUDINARY_PRESET || 'labors_unsigned');
  form.append('folder', 'labors-near-me/providers');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_URL.split('@')[1]}/image/upload`, {
    method: 'POST', body: form,
  });
  if (!res.ok) return dataUrl.slice(0, 400000); // never block onboarding on media
  const json = await res.json();
  return json.secure_url || dataUrl.slice(0, 400000);
}

module.exports = {
  sendOtpSms, generateOtp,
  sendPush, newLeadPush, verifyPush,
  uploadPhoto,
  smsDemo: !MSG91_AUTHKEY,
};
