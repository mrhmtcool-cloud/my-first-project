// detail_screen.dart — full provider profile: call / WhatsApp / directions,
// favourite, reviews list + review form (rate-after-lead flow from the web app).
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../models.dart';

class DetailScreen extends StatefulWidget {
  const DetailScreen({super.key, required this.providerId});
  final String providerId;
  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  ProviderModel? p;
  List<ReviewModel> reviews = [];
  bool fav = false;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await ApiClient.get('/providers/${widget.providerId}');
      p = ProviderModel.fromJson(d as Map<String, dynamic>);
      final rs = await ApiClient.get('/providers/${widget.providerId}/reviews');
      reviews = (rs as List).map((r) => ReviewModel.fromJson(r)).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _contact(String type) async {
    if (p == null) return;
    final provider = p!;
    // log the lead (fire & forget — provider dashboard feed)
    if (ApiClient.token != null) {
      ApiClient.post('/leads', {'providerId': provider.id, 'type': type}).catchError((_) => null);
    }
    Uri uri;
    final text = Uri.encodeComponent(
        'Namaste! I found you on Labors Near Me (${provider.businessName}).');
    switch (type) {
      case 'whatsapp':
        uri = Uri.parse('https://wa.me/91${provider.whatsapp}?text=$text');
        break;
      case 'directions':
        uri = Uri.parse(
            'https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}');
        break;
      default:
        uri = Uri.parse('tel:+91${provider.phone}');
    }
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
  }

  Future<void> _toggleFav() async {
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    try {
      if (fav) {
        await ApiClient.delete('/favorites/${widget.providerId}');
      } else {
        await ApiClient.post('/favorites/${widget.providerId}');
      }
      if (mounted) setState(() => fav = !fav);
    } catch (_) {}
  }

  Future<void> _writeReview() async {
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    double rating = 5;
    final textCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(t('write_review')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) => IconButton(
                    onPressed: () => setLocal(() => rating = (i + 1).toDouble()),
                    icon: Icon(Icons.star,
                        color: i < rating ? const Color(0xFFF59E0B) : const Color(0xFFE7E5E4),
                        size: 32),
                  )),
            ),
            TextField(
              controller: textCtrl,
              maxLines: 3,
              decoration: InputDecoration(hintText: t('write_review')),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('back'))),
            FilledButton(
              onPressed: () async {
                try {
                  await ApiClient.post('/providers/${widget.providerId}/reviews',
                      {'rating': rating, 'text': textCtrl.text});
                } catch (_) {}
                if (ctx.mounted) Navigator.pop(ctx);
                _load();
              },
              child: Text(t('submit')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading || p == null) {
      return Scaffold(
          appBar: AppBar(title: Text(t('app_name'))),
          body: const Center(child: CircularProgressIndicator()));
    }
    final w = p!;
    return Scaffold(
      appBar: AppBar(
        title: Text(w.businessName, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            onPressed: _toggleFav,
            icon: Icon(fav ? Icons.favorite : Icons.favorite_border),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // header card
        Row(children: [
          monogramAvatar(w.name, w.categoryId, photo: w.photo, size: 72),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(w.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Row(children: [
                if (w.verified == 'verified') ...[
                  const Icon(Icons.verified, color: Color(0xFF059669), size: 16),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(locName(w.categoryNameEn, w.categoryNameHi),
                      style: const TextStyle(color: Color(0xFF57534E))),
                ),
              ]),
              const SizedBox(height: 4),
              starsRow(w.ratingAvg, w.ratingCount),
            ]),
          ),
          openBadge(w.isOpenNow),
        ]),
        const SizedBox(height: 16),
        // contact buttons
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('call'),
              icon: const Icon(Icons.call),
              label: Text(t('call')),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('whatsapp'),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
              icon: const Icon(Icons.chat),
              label: Text(t('whatsapp')),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('directions'),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
              icon: const Icon(Icons.directions),
              label: Text(t('directions')),
            ),
          ),
        ]),
        const SizedBox(height: 16),
        // info tiles
        _infoTile(Icons.phone, w.phone),
        _infoTile(Icons.location_on, '${w.addressLine}${w.area.isNotEmpty ? ', ${w.area}' : ''}'),
        if (w.distanceText.isNotEmpty) _infoTile(Icons.near_me, w.distanceText),
        if (w.priceHint.isNotEmpty) _infoTile(Icons.currency_rupee, w.priceHint),
        if (w.about.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(t('about_l'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 4),
          Text(w.about, style: const TextStyle(color: Color(0xFF57534E))),
        ],
        if (w.skills.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: w.skills
                .map((s) => Chip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      backgroundColor: const Color(0xFFFEF3C7),
                    ))
                .toList(),
          ),
        ],
        const SizedBox(height: 20),
        // reviews
        Row(children: [
          Expanded(
              child: Text('${t('reviews')} (${reviews.length})',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
          TextButton.icon(
            onPressed: _writeReview,
            icon: const Icon(Icons.edit, size: 18),
            label: Text(t('write_review')),
          ),
        ]),
        ...reviews.map((r) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: monogramAvatar(r.userName, w.categoryId, size: 40),
                title: Row(children: [
                  Expanded(
                      child: Text(r.userName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                  Text('★' * r.rating.round(),
                      style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 13)),
                ]),
                subtitle: Text(r.text),
              ),
            )),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget _infoTile(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(children: [
          Icon(icon, size: 18, color: const Color(0xFFF97316)),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ]),
      );
}
