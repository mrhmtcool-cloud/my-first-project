// about_screen.dart — About Us (web #/about jaisa).
import 'package:flutter/material.dart';
import '../core/i18n.dart';
import 'contact_screen.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isHi = langNotifier.value == 'hi';
    return Scaffold(
      appBar: AppBar(title: Text(t('about_us'))),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        Text(
          isHi
              ? 'Labors Near Me — भारत के हर शहर में काम करने वाले भरोसेमंद लोगों को ढूँढने का आसान तरीका। 🇮🇳'
              : 'Labors Near Me — Bharat ke har sheher me kaam karne wale bharosemand logon ko dhoondhne ka aasaan tareeka. 🇮🇳',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Text(
          isHi
              ? 'इलेक्ट्रीशियन, प्लंबर, दर्जी, डॉक्टर, ड्राइवर — जो चाहिए, अपने आस-पास GPS से या शहर/राज्य चुनकर। सीधा कॉल, WhatsApp, रास्ता। कोई कमीशन नहीं, कोई बीच का आदमी नहीं।'
              : 'Electrician, plumber, tailor, doctor, driver — jo chahiye, apne aas-paas GPS se ya city/state chun kar. Seedha call, WhatsApp, directions. Koi commission nahi, koi beech ka aadmi nahi.',
          style: const TextStyle(color: Color(0xFF57534E), height: 1.6),
        ),
        const SizedBox(height: 16),
        _point('🎯', isHi ? 'हाइपरलोकल खोज — दूरी के हिसाब से' : 'Hyperlocal search — distance ke hisaab se'),
        _point('✅', isHi ? 'सत्यापित प्रोवाइडर + असली रिव्यू' : 'Verified providers + asli reviews'),
        _point('📱', isHi ? 'कम डेटा — 2G/3G पर भी तेज़' : 'Low bandwidth — 2G/3G par bhi tez'),
        _point('🗣️', isHi ? 'हिंदी + अंग्रेज़ी' : 'Hindi + English'),
        _point('🆓', isHi ? 'प्रोवाइडर के लिए लिस्टिंग बिल्कुल FREE' : 'Providers ke liye listing bilkul FREE'),
        const SizedBox(height: 20),
        Text(
          isHi ? 'वर्जन 1.1 · भारत में ❤️ से बनाया गया' : 'Version 1.1 · Made in India with ❤️',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () => Navigator.push(
              context, MaterialPageRoute(builder: (_) => const ContactScreen())),
          child: Text(t('contact_us')),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget _point(String emoji, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 15, height: 1.4))),
        ]),
      );
}
