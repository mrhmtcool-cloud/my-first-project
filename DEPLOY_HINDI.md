# Permanent Deploy Guide — हिंदी में

> **⚡ सबसे आसान तरीका:** `LaborsNearMe.html` file download करो → phone में Chrome से खोलो →
> पूरा app तुरंत चलेगा (बिना server, बिना internet)। नीचे वाला deploy तब करो जब
> WhatsApp पर link share करना हो या real SMS/OTP चाहिए हो।

आपका app अभी temporary link पर चल रहा है (e2b sandbox) जो 5-10 मिनट में बंद हो जाता है।
Permanent link के लिए नीचे वाले steps follow करो — 100% Free।

## Option A: Render.com (सबसे आसान, Free)

### 1. GitHub पर डालो
```bash
# ZIP को unzip करो
cd labors-near-me
git init
git add .
git commit -m "deploy"
# GitHub पर नया repo बनाओ: https://github.com/new
git remote add origin https://github.com/YOUR_USERNAME/labors-near-me.git
git push -u origin main
```

### 2. Render पर Deploy
1. https://render.com → Sign up (GitHub से login)
2. Dashboard → New + → Blueprint → अपना GitHub repo select करो
3. Render खुद `render.yaml` देख लेगा:
   - Name: labors-near-me
   - Build: `cd backend && npm install`
   - Start: `node backend/src/server.js`
4. **Apply** दबाओ → 2-3 मिनट wait करो
5. Link मिलेगा: `https://labors-near-me-xxxx.onrender.com`

Test करो: `https://.../api/health` खोलो → `{"ok":true}` आना चाहिए

### 3. Phone में Install
- वही link Chrome में खोलो
- 3 dots → Add to Home Screen → Install
- WhatsApp पर share करो — सब install कर पाएंगे

### 4. (Optional) Real OTP SMS लगाओ
1. MSG91.com पर account बनाओ (₹500 में 1000 SMS)
2. Render Dashboard → Your Service → Environment → Add:
   - `MSG91_AUTHKEY` = आपकी key
   - `MSG91_SENDER_ID` = LNMAPP
   - `MSG91_TEMPLATE_ID` = आपका template ID
3. Save → Auto redeploy → अब real SMS जाएगा

### 5. APK में Permanent API जोड़ो
```dart
// mobile/lib/core/api_client.dart
static const String apiBase = 'https://labors-near-me-xxxx.onrender.com';
```
फिर:
```bash
cd mobile
flutter create . --platforms android
flutter build apk --split-per-abi
# APK: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

## Option B: Hostinger VPS (₹199/month, Fast)
1. Hostinger से VPS लो
2. `pm2` install करो: `npm install -g pm2`
3. Code upload करो, `cd backend && npm install`
4. `pm2 start src/server.js --name lnm`
5. Nginx से `web/` serve करो + domain लगाओ

## Database Note
अभी data `backend/data/db.json` में है — redeploy पर reset हो जाता है।
Production के लिए Render पर Free PostgreSQL add करो — schema `docs/ARCHITECTURE.md` §3 में तैयार है।

## Help चाहिए?
- ZIP: `labors-near-me.zip` (516KB) — ऊपर download किया था
- Architecture: `docs/ARCHITECTURE.md`
- Mobile build: `mobile/README.md`

किसी step पर अटको तो बोलो — मैं command दे दूंगा!
