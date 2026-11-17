// account_screen.dart — login (phone OTP + demo Google) / account hub (dashboard,
// register as provider, language, logout).
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../main.dart';
import 'dashboard_screen.dart';
import 'register_screen.dart';

class AccountBody extends StatefulWidget {
  const AccountBody({super.key});
  @override
  State<AccountBody> createState() => _AccountBodyState();
}

class _AccountBodyState extends State<AccountBody> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _name = TextEditingController();
  bool _otpStage = false;
  bool _busy = false;

  Future<void> _requestOtp() async {
    final phone = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (phone.length != 10) return;
    setState(() => _busy = true);
    try {
      await ApiClient.post('/auth/request-otp', {'phone': phone});
      _otp.text = '123456'; // demo mode pre-fill (production: real SMS)
      setState(() => _otpStage = true);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('otp_sent'))));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text((e is ApiException && e.hint != null) ? e.hint! : t('error_gen'))));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      final r = await ApiClient.post('/auth/verify-otp', {
        'phone': _phone.text.replaceAll(RegExp(r'\D'), ''),
        'code': _otp.text.trim(),
        'name': _name.text.trim(),
        'cityId': cityNotifier.value,
      });
      await ApiClient.saveSession(r['token'], (r['user'] ?? {})['name'] ?? '');
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _google() async {
    setState(() => _busy = true);
    try {
      final r = await ApiClient.post(
          '/auth/google', {'name': 'Google User', 'email': 'demo.user@gmail.com'});
      await ApiClient.saveSession(r['token'], (r['user'] ?? {})['name'] ?? '');
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _logout() async {
    try {
      await ApiClient.post('/auth/logout');
    } catch (_) {}
    await ApiClient.clearSession();
    if (mounted) setState(() {});
  }

  void _toggleLang() {
    langNotifier.value = langNotifier.value == 'hi' ? 'en' : 'hi';
    SharedPreferences.getInstance()
        .then((p) => p.setString('lnm_lang', langNotifier.value));
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(padding: const EdgeInsets.all(20), children: [
        Text(t('account'),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        if (ApiClient.token == null) ...[
          // ── LOGIN FORM ───────────────────────────────────────────────
          TextField(
            controller: _name,
            decoration: InputDecoration(labelText: t('name_l'), prefixIcon: const Icon(Icons.person)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            decoration: InputDecoration(
                labelText: t('phone'),
                prefixIcon: const Icon(Icons.phone),
                counterText: '',
                helperText: t('demo_note')),
          ),
          const SizedBox(height: 12),
          if (_otpStage) ...[
            TextField(
              controller: _otp,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                  labelText: t('otp'), prefixIcon: const Icon(Icons.lock)),
            ),
            const SizedBox(height: 16),
          ],
          FilledButton(
            onPressed: _busy ? null : (_otpStage ? _verify : _requestOtp),
            child: _busy
                ? const SizedBox(
                    width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(_otpStage ? t('verify') : t('login')),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _busy ? null : _google,
            icon: const Icon(Icons.account_circle),
            label: Text(t('google_login')),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          ),
        ] else ...[
          // ── ACCOUNT HUB ──────────────────────────────────────────────
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFEF3C7),
                  child: Icon(Icons.person, color: Color(0xFFB45309))),
              title: Text(ApiClient.userName ?? t('welcome'),
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: Text(t('logged_in_as')),
            ),
          ),
          const SizedBox(height: 16),
          _menuTile(Icons.dashboard, t('dashboard'), () {
            Navigator.push(
                context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
          }),
          _menuTile(Icons.work, t('register_provider'), () {
            Navigator.push(
                context, MaterialPageRoute(builder: (_) => const RegisterScreen()));
          }),
          _menuTile(Icons.language, langNotifier.value == 'hi' ? 'English' : 'हिंदी', _toggleLang),
          _menuTile(Icons.logout, t('logout'), _logout, color: const Color(0xFFDC2626)),
        ],
        const SizedBox(height: 20),
        Center(
          child: Text('Labors Near Me · v1.0.0',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
        ),
      ]),
    );
  }

  Widget _menuTile(IconData icon, String label, VoidCallback onTap, {Color? color}) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: ListTile(
          leading: Icon(icon, color: color ?? const Color(0xFFF97316)),
          title: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: color)),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      );
}
