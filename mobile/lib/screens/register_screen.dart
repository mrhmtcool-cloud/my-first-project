// register_screen.dart — provider self-registration (goes to admin verification queue).
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../main.dart';
import '../models.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _business = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _area = TextEditingController();
  final _address = TextEditingController();
  final _pincode = TextEditingController();
  final _about = TextEditingController();
  final _skills = TextEditingController();
  final _price = TextEditingController();
  final _kyc = TextEditingController();
  final _customService = TextEditingController();

  List<CategoryModel> cats = [];
  List<CityModel> cities = [];
  List<Map<String, dynamic>> states = [];
  String? categoryId;
  String? subcategory;
  String? cityId;
  String? stateName;
  String? districtName;
  bool busy = false;

  List<String> get _districts {
    for (final s in states) {
      if (s['state'] == stateName) return List<String>.from(s['districts'] ?? []);
    }
    return [];
  }

  @override
  void initState() {
    super.initState();
    cityId = cityNotifier.value;
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/categories'),
        ApiClient.get('/cities'),
        ApiClient.get('/states'),
      ]);
      cats = (results[0] as List).map((c) => CategoryModel.fromJson(c)).toList();
      cities = (results[1] as List).map((c) => CityModel.fromJson(c)).toList();
      states = ((results[2] as List)).map((s) => {
            'state': (s['state'] ?? '').toString(),
            'districts': s['districts'] ?? [],
          }).toList();
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    setState(() => busy = true);
    try {
      final r = await ApiClient.post('/providers/register', {
        'name': _name.text.trim(),
        'businessName': _business.text.trim().isEmpty ? _name.text.trim() : _business.text.trim(),
        'categoryId': categoryId,
        'subcategory': subcategory,
        'customService': _customService.text.trim(),
        'phone': _phone.text.trim(),
        'whatsapp': _whatsapp.text.trim().isEmpty ? _phone.text.trim() : _whatsapp.text.trim(),
        'cityId': cityId,
        'state': stateName ?? '',
        'district': districtName ?? '',
        'area': _area.text.trim(),
        'address': _address.text.trim(),
        'pincode': _pincode.text.trim(),
        'about': _about.text.trim(),
        'skills': _skills.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
        'priceHint': _price.text.trim(),
        'kycName': _kyc.text.trim(),
      });
      if (mounted) {
        await showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('✓'),
            content: Text((r as Map)['message'] ?? t('reg_note')),
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
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final subs = cats.where((c) => c.id == categoryId).toList();
    final subList = subs.isEmpty ? <Subcategory>[] : subs.first.subcategories;
    return Scaffold(
      appBar: AppBar(title: Text(t('reg_title'))),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text(t('reg_note'),
              style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          TextFormField(
            controller: _name,
            decoration: InputDecoration(labelText: '${t('name_l')} *'),
            validator: (v) => (v == null || v.trim().isEmpty) ? t('name_l') : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _business,
            decoration: InputDecoration(labelText: t('business_name')),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: categoryId,
            decoration: InputDecoration(labelText: '${t('select_category')} *'),
            items: cats
                .map((c) => DropdownMenuItem(
                    value: c.id,
                    child: Text(locName(c.nameEn, c.nameHi),
                        overflow: TextOverflow.ellipsis)))
                .toList(),
            onChanged: (v) => setState(() {
              categoryId = v;
              subcategory = null;
            }),
            validator: (v) => v == null ? t('select_category') : null,
          ),
          const SizedBox(height: 12),
          if (subList.isNotEmpty) ...[
            DropdownButtonFormField<String>(
              value: subcategory,
              decoration: InputDecoration(labelText: t('select_category')),
              items: subList
                  .map((s) => DropdownMenuItem(
                      value: s.id, child: Text(locName(s.nameEn, s.nameHi))))
                  .toList(),
              onChanged: (v) => setState(() => subcategory = v),
            ),
            const SizedBox(height: 12),
          ],
          // 'Others' category → provider apni service ka naam khud likhta hai
          if (cats.where((c) => c.id == categoryId && c.customAllowed).isNotEmpty) ...[
            TextFormField(
              controller: _customService,
              maxLength: 60,
              decoration: InputDecoration(
                  labelText: '${t('custom_service')} *',
                  hintText: t('custom_service_hint'),
                  counterText: ''),
              validator: (v) {
                final isCustom = cats.where((c) => c.id == categoryId && c.customAllowed).isNotEmpty;
                return (isCustom && (v == null || v.trim().isEmpty)) ? t('custom_service') : null;
              },
            ),
            const SizedBox(height: 12),
          ],
          Row(children: [
            Expanded(
              child: TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(labelText: '${t('phone')} *', counterText: ''),
                validator: (v) =>
                    (v == null || v.replaceAll(RegExp(r'\D'), '').length != 10) ? t('phone') : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _whatsapp,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(labelText: t('whatsapp_l'), counterText: ''),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: cityId,
            decoration: InputDecoration(labelText: '${t('select_city')} *'),
            items: cities
                .map((c) => DropdownMenuItem(
                    value: c.id, child: Text(locName(c.nameEn, c.nameHi))))
                .toList(),
            onChanged: (v) => setState(() => cityId = v),
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
          const SizedBox(height: 12),
          TextFormField(
            controller: _area,
            decoration: InputDecoration(labelText: t('area')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _address,
            decoration: InputDecoration(labelText: t('address_l2')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _pincode,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: t('pincode')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _about,
            maxLines: 3,
            decoration: InputDecoration(labelText: t('about_l'), hintText: t('about_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _skills,
            decoration: InputDecoration(labelText: t('skills_l'), hintText: t('skills_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _price,
            decoration: InputDecoration(labelText: t('price_l'), hintText: t('price_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _kyc,
            decoration: InputDecoration(labelText: t('kyc_name')),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: busy ? null : _submit,
            child: busy
                ? const SizedBox(
                    width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(t('submit')),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}
