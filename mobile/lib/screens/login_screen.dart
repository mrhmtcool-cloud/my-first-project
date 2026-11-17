// login_screen.dart — phone OTP (demo OTP 123456 until MSG91 is configured on the API).
import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/i18n.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phone = TextEditingController();
  final otp = TextEditingController(text: '123456');
  final name = TextEditingController();
  bool step2 = false;

  Future<void> _go() async {
    try {
      if (!step2) {
        await ApiClient.post('/auth/request-otp', {'phone': phone.text});
        setState(() => step2 = true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP: 123456 (demo)')));
      } else {
        final r = await ApiClient.post('/auth/verify-otp', {
          'phone': phone.text, 'code': otp.text, 'name': name.text,
        });
        ApiClient.token = r['token'];
        Session.token = r['token'];
        Session.userName = r['user']?['name'];
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(I18n.t('login'))),
      body: ListView(padding: const EdgeInsets.all(18), children: [
        Text(I18n.t('demo_note'), style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        TextField(controller: phone, keyboardType: TextInputType.phone, maxLength: 10,
          decoration: InputDecoration(labelText: I18n.t('phone'), prefixText: '+91 ')),
        if (step2) ...[
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name / नाम')),
          const SizedBox(height: 12),
          TextField(controller: otp, keyboardType: TextInputType.number, maxLength: 6,
            decoration: InputDecoration(labelText: I18n.t('otp_ph'))),
        ],
        const SizedBox(height: 16),
        FilledButton(onPressed: _go, child: Text(step2 ? I18n.t('verify') : I18n.t('login'))),
      ]),
    );
  }
}
