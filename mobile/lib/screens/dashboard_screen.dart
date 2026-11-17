// dashboard_screen.dart — provider dashboard: my listings (status, availability
// toggle, edit profile), leads feed (who called / WhatsApp'd me).
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<MyListing> listings = [];
  List<LeadModel> leads = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/me/providers'),
        ApiClient.get('/me/leads'),
      ]);
      listings = (results[0] as List).map((j) => MyListing.fromJson(j)).toList();
      leads = (results[1] as List).map((j) => LeadModel.fromJson(j)).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _toggleOpen(MyListing l) async {
    try {
      final r = await ApiClient.post('/providers/${l.id}/availability', {'open': !l.manualOpen});
      setState(() => l.manualOpen = (r as Map)['manualOpen'] ?? !l.manualOpen);
    } catch (_) {}
  }

  Future<void> _edit(MyListing l) async {
    final name = TextEditingController(text: l.name);
    final business = TextEditingController(text: l.businessName);
    final phone = TextEditingController(text: l.phone);
    final price = TextEditingController();
    final about = TextEditingController();
    // fetch full profile for edit (PUT accepts partial body)
    try {
      final d = await ApiClient.get('/providers/${l.id}?preview=1') as Map<String, dynamic>;
      price.text = d['priceHint'] ?? '';
      about.text = d['about'] ?? '';
    } catch (_) {}
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('edit_profile')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: t('name_l'))),
            const SizedBox(height: 10),
            TextField(
                controller: business,
                decoration: InputDecoration(labelText: t('business_name'))),
            const SizedBox(height: 10),
            TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: t('phone'))),
            const SizedBox(height: 10),
            TextField(controller: price, decoration: InputDecoration(labelText: t('price_l'))),
            const SizedBox(height: 10),
            TextField(
                controller: about,
                maxLines: 2,
                decoration: InputDecoration(labelText: t('about_l'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('back'))),
          FilledButton(
            onPressed: () async {
              try {
                await ApiClient.put('/providers/${l.id}', {
                  'name': name.text.trim(),
                  'businessName': business.text.trim(),
                  'phone': phone.text.trim(),
                  'priceHint': price.text.trim(),
                  'about': about.text.trim(),
                });
              } catch (_) {}
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(SnackBar(content: Text(t('saved_ok'))));
              }
              _load();
            },
            child: Text(t('save_changes')),
          ),
        ],
      ),
    );
  }

  String _timeAgo(String iso) {
    try {
      final d = DateTime.now().difference(DateTime.parse(iso).toLocal());
      if (d.inMinutes < 60) return '${d.inMinutes}m';
      if (d.inHours < 24) return '${d.inHours}h';
      return '${d.inDays}d';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('dashboard')),
          bottom: TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: t('my_listings')),
              Tab(text: t('leads')),
            ],
          ),
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(children: [
                // ── My listings ─────────────────────────────────────────
                listings.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(t('no_listings'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFF78716C))),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(14),
                          children: listings
                              .map((l) => Card(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14)),
                                    child: Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(children: [
                                            monogramAvatar(l.name, l.categoryId, size: 46),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(l.businessName,
                                                      style: const TextStyle(
                                                          fontWeight: FontWeight.w800)),
                                                  const SizedBox(height: 4),
                                                  Row(children: [
                                                    statusBadge(l.verified),
                                                    const SizedBox(width: 8),
                                                    starsRow(l.ratingAvg, l.ratingCount),
                                                  ]),
                                                ],
                                              ),
                                            ),
                                          ]),
                                          const SizedBox(height: 10),
                                          Row(children: [
                                            Icon(
                                                l.manualOpen
                                                    ? Icons.toggle_on
                                                    : Icons.toggle_off,
                                                color: l.manualOpen
                                                    ? const Color(0xFF059669)
                                                    : const Color(0xFFA8A29E),
                                                size: 30),
                                            Text(l.manualOpen ? t('open') : t('closed'),
                                                style:
                                                    const TextStyle(fontWeight: FontWeight.w700)),
                                            const Spacer(),
                                            Text('${t('leads')}: ${l.leadCount}',
                                                style: const TextStyle(
                                                    color: Color(0xFF57534E), fontSize: 13)),
                                          ]),
                                          const SizedBox(height: 6),
                                          Row(children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () => _toggleOpen(l),
                                                icon: const Icon(Icons.schedule, size: 18),
                                                label: Text(l.manualOpen ? t('closed') : t('open')),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: FilledButton.icon(
                                                onPressed: () => _edit(l),
                                                icon: const Icon(Icons.edit, size: 18),
                                                label: Text(t('edit_profile')),
                                              ),
                                            ),
                                          ]),
                                        ],
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ),
                      ),
                // ── Leads feed ──────────────────────────────────────────
                leads.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(t('no_leads'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFF78716C))),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(14),
                          itemCount: leads.length,
                          itemBuilder: (_, i) {
                            final l = leads[i];
                            final icon = l.type == 'whatsapp'
                                ? Icons.chat
                                : l.type == 'directions'
                                    ? Icons.directions
                                    : Icons.call;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFFFEF3C7),
                                  child: Icon(icon, color: const Color(0xFFB45309)),
                                ),
                                title: Text('${t('lead_from')}: ${l.userName}',
                                    style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text(l.type),
                                trailing: Text(_timeAgo(l.createdAt),
                                    style: const TextStyle(
                                        color: Color(0xFFA8A29E), fontSize: 12)),
                              ),
                            );
                          },
                        ),
                      ),
              ]),
      ),
    );
  }
}
