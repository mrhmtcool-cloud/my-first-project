/**
 * server.js — Entry point. Bind 0.0.0.0 so the live preview proxy can reach it.
 *   node src/server.js   (or: npm start)
 */
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Labors Near Me — API + PWA running at http://0.0.0.0:${PORT}`);
  console.log(`   Health: /api/health · Admin: /#/admin (phone 9000000001, OTP 123456)`);
});
