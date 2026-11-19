// profile_edit_screen.dart — user profile editor (web Account > My Profile jaisa).
// GET /auth/me se prefill → PUT /me/profile { name, bio, about, address, state, district, photo }
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});
  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _name = TextEditingController();
  final _bio = TextEditingController();
  final _about = TextEditingController();
  final _address = TextEditingController();
  List<Map<String, dynamic>> states = [];
  String? stateName;
  String? districtName;
  String? photo; // data:image/... or http
  bool busy = false;
  bool loading = true;

  List<String> get _districts {
    for (final s in states) {
      if (s['state'] == stateName) return List<String>.from(s['districts'] ?? []);
    }
    return [];
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/auth/me'),
        ApiClient.get('/states'),
      ]);
      final u = (results[0] as Map)['user'] ?? {};
      _name.text = (u['name'] ?? '').toString();
      _bio.text = (u['bio'] ?? '').toString();
      _about.text = (u['about'] ?? '').toString();
      _address.text = (u['address'] ?? '').toString();
      stateName = (u['state'] ?? '').toString().isEmpty ? null : (u['state'] ?? '').toString();
      districtName =
          (u['district'] ?? '').toString().isEmpty ? null : (u['district'] ?? '').toString();
      photo = u['photo'];
      states = ((results[1] as List)).map((s) => {
            'state': (s['state'] ?? '').toString(),
            'districts': s['districts'] ?? [],
          }).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _pickPhoto() async {
    try {
      final picked =
          await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 400, imageQuality: 75);
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      setState(() => photo = 'data:image/jpeg;base64,${base64Encode(bytes)}');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
  }

  Future<void> _save() async {
    setState(() => busy = true);
    try {
      await ApiClient.put('/me/profile', {
        'name': _name.text.trim(),
        'bio': _bio.text.trim(),
        'about': _about.text.trim(),
        'address': _address.text.trim(),
        'state': stateName ?? '',
        'district': districtName ?? '',
        'photo': photo,
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('saved_ok'))));
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(t('my_profile'))),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(padding: const EdgeInsets.all(16), children: [
              Center(
                child: Column(children: [
                  monogramAvatar(_name.text, '', photo: photo, size: 96),
                  const SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    TextButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.photo_camera, size: 18),
                      label: Text(photo == null ? t('add_photo') : t('change_photo')),
                    ),
                    if (photo != null)
                      TextButton.icon(
                        onPressed: () => setState(() => photo = null),
                        icon: const Icon(Icons.delete_outline, size: 18),
                        label: Text(t('remove_photo')),
                        style: TextButton.styleFrom(foregroundColor: const Color(0xFFDC2626)),
                      ),
                  ]),
                ]),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _name,
                decoration: InputDecoration(labelText: t('name_l')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _bio,
                maxLength: 200,
                decoration: InputDecoration(labelText: t('bio_l'), counterText: ''),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _about,
                maxLines: 3,
                maxLength: 500,
                decoration: InputDecoration(labelText: t('about_me'), counterText: ''),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _address,
                decoration: InputDecoration(labelText: t('address_opt')),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: stateName,
                    decoration: InputDecoration(labelText: t('state_l')),
                    items: [
                      DropdownMenuItem<String>(value: null, child: Text(t('select_state'))),
                      ...states.map((s) => DropdownMenuItem<String>(
                          value: s['state'] as String, child: Text(s['state'] as String))),
                    ],
                    onChanged: (v) => setState(() {
                      stateName = v;
                      districtName = null;
                    }),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: districtName,
                    decoration: InputDecoration(labelText: t('district_l')),
                    items: [
                      DropdownMenuItem<String>(value: null, child: Text(t('select_district'))),
                      ..._districts.map((d) =>
                          DropdownMenuItem<String>(value: d, child: Text(d, overflow: TextOverflow.ellipsis))),
                    ],
                    onChanged: (v) => setState(() => districtName = v),
                  ),
                ),
              ]),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy ? null : _save,
                child: busy
                    ? const SizedBox(
                        width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(t('save_changes')),
              ),
              const SizedBox(height: 24),
            ]),
    );
  }
}
