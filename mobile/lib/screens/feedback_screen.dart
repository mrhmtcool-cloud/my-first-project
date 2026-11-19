// feedback_screen.dart — user feedback (view + submit). Same contract as web #/feedback:
// POST /api/feedback { name?, contact?, type: user|provider|other, rating 1-5, message 5-1000 }
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});
  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _name = TextEditingController();
  final _contact = TextEditingController();
  final _msg = TextEditingController();
  String _type = 'user';
  double _rating = 5;
  bool _busy = false;

  Future<void> _submit() async {
    final msg = _msg.text.trim();
    if (msg.length < 5) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('fb_msg'))));
      return;
    }
    setState(() => _busy = true);
    try {
      await ApiClient.post('/feedback', {
        'name': _name.text.trim(),
        'contact': _contact.text.trim(),
        'type': _type,
        'rating': _rating,
        'message': msg,
      });
      if (mounted) {
        await showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('✓'),
            content: Text(t('feedback_sent')),
            actions: [
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: Text(t('done')),
              ),
            ],
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _share() async {
    await Share.share('${t('share_text')} https://labors-near-me.onrender.com');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(t('feedback_title'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(t('feedback_sub'), style: const TextStyle(color: Color(0xFF57534E))),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          decoration: InputDecoration(labelText: t('name_l')),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _contact,
          decoration: InputDecoration(labelText: '${t('phone')} / Email'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _type,
          decoration: InputDecoration(labelText: t('fb_type')),
          items: [
            DropdownMenuItem(value: 'user', child: Text(t('fb_user'))),
            DropdownMenuItem(value: 'provider', child: Text(t('fb_provider'))),
            DropdownMenuItem(value: 'other', child: Text(t('fb_other'))),
          ],
          onChanged: (v) => setState(() => _type = v ?? 'user'),
        ),
        const SizedBox(height: 12),
        Text('⭐ ${t('fb_rating')}', style: const TextStyle(fontWeight: FontWeight.w600)),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (i) => IconButton(
                onPressed: () => setState(() => _rating = (i + 1).toDouble()),
                icon: Icon(Icons.star,
                    color: i < _rating ? const Color(0xFFF59E0B) : const Color(0xFFE7E5E4),
                    size: 36),
              )),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _msg,
          maxLines: 5,
          decoration: InputDecoration(labelText: '${t('fb_msg')} *'),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(
                  width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(t('submit')),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _share,
          icon: const Icon(Icons.share),
          label: Text(t('share_app')),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }
}
