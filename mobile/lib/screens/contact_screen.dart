// contact_screen.dart — Contact Us: info + message form.
// Web jaisa: POST /api/reports { targetType:'user', targetId:'platform', reason:'CONTACT: ...' }
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});
  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _name = TextEditingController();
  final _msg = TextEditingController();
  bool _busy = false;

  Future<void> _send() async {
    final msg = _msg.text.trim();
    if (msg.length < 5) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('contact_msg'))));
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiClient.post('/reports', {
        'targetType': 'user',
        'targetId': 'platform',
        'reason': 'CONTACT: ${_name.text.trim()} — ${msg.substring(0, msg.length > 200 ? 200 : msg.length)}',
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('sent_ok'))));
        _name.clear();
        _msg.clear();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _open(String url) async {
    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isHi = langNotifier.value == 'hi';
    return Scaffold(
      appBar: AppBar(title: Text(t('contact_us'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Column(children: [
            ListTile(
              leading: const Icon(Icons.mail, color: Color(0xFFF97316)),
              title: const Text('laborsnearme@gmail.com'),
              subtitle: Text(isHi ? 'ईमेल करें' : 'Email us'),
              onTap: () => _open('mailto:laborsnearme@gmail.com'),
            ),
            ListTile(
              leading: const Icon(Icons.chat, color: Color(0xFF25D366)),
              title: const Text('+91 90000 00001'),
              subtitle: Text(isHi ? 'व्हाट्सएप हेल्पलाइन' : 'WhatsApp helpline'),
              onTap: () => _open('https://wa.me/919000000001'),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        Text(isHi ? 'संदेश भेजें' : 'Send a message',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 12),
        TextField(
          controller: _name,
          decoration: InputDecoration(labelText: t('name_l')),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _msg,
          maxLines: 5,
          decoration: InputDecoration(labelText: '${t('contact_msg')} *'),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _busy ? null : _send,
          child: _busy
              ? const SizedBox(
                  width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(t('send')),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }
}
