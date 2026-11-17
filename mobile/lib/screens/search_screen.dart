// search_screen.dart — search results with filters (open now, min rating) + sort.
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../main.dart';
import '../models.dart';
import 'detail_screen.dart';
import 'home_screen.dart';

class SearchBody extends StatefulWidget {
  const SearchBody({super.key});
  @override
  State<SearchBody> createState() => _SearchBodyState();
}

class _SearchBodyState extends State<SearchBody> {
  final _controller = TextEditingController();
  String category = '';
  String categoryName = '';
  String sort = 'distance';
  bool openNow = false;
  double minRating = 0;
  double? gpsLat, gpsLng;
  bool loading = false;
  List<ProviderModel> results = [];

  @override
  void initState() {
    super.initState();
    searchParams.addListener(_onParams);
    _onParams();
  }

  void _onParams() {
    final p = searchParams.value;
    if (p.containsKey('q')) _controller.text = p['q'] ?? '';
    category = p['category'] ?? category;
    categoryName = p['categoryName'] ?? categoryName;
    sort = p['sort'] ?? sort;
    _search();
  }

  @override
  void dispose() {
    searchParams.removeListener(_onParams);
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() => loading = true);
    try {
      final q = <String, String>{
        'sort': sort,
        'limit': '50',
        if (_controller.text.trim().isNotEmpty) 'q': _controller.text.trim(),
        if (category.isNotEmpty) 'category': category,
        if (openNow) 'openNow': '1',
        if (minRating > 0) 'minRating': minRating.toStringAsFixed(0),
        if (gpsLat != null) 'lat': gpsLat.toString(),
        if (gpsLng != null) 'lng': gpsLng.toString(),
        if (gpsLat == null) 'cityId': cityNotifier.value,
      };
      final d = await ApiClient.get('/providers/nearby', q);
      results = ((d as Map)['results'] as List).map((p) => ProviderModel.fromJson(p)).toList();
    } catch (_) {
      results = [];
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _useGps() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition();
      gpsLat = pos.latitude;
      gpsLng = pos.longitude;
      _search();
    } catch (_) {
      // GPS unavailable — fall back to city search silently
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  hintText: t('search_hint'),
                  prefixIcon: const Icon(Icons.search),
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
                onPressed: _search,
                style: FilledButton.styleFrom(minimumSize: const Size(64, 46)),
                child: Text(t('search_l'))),
          ]),
        ),
        // filter row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(children: [
            if (categoryName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InputChip(
                  label: Text(categoryName),
                  onDeleted: () => setState(() {
                    category = '';
                    categoryName = '';
                    _search();
                  }),
                ),
              ),
            FilterChip(
              label: Text(t('open_now')),
              selected: openNow,
              onSelected: (v) => setState(() { openNow = v; _search(); }),
            ),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: sort,
              underline: const SizedBox.shrink(),
              items: [
                DropdownMenuItem(value: 'distance', child: Text(t('sort_distance'))),
                DropdownMenuItem(value: 'rating', child: Text(t('sort_rating'))),
                DropdownMenuItem(value: 'relevance', child: Text(t('sort_relevance'))),
              ],
              onChanged: (v) => setState(() { sort = v ?? 'distance'; _search(); }),
            ),
            const SizedBox(width: 8),
            DropdownButton<double>(
              value: minRating,
              underline: const SizedBox.shrink(),
              items: [0.0, 3.0, 4.0, 4.5]
                  .map((r) => DropdownMenuItem(
                      value: r,
                      child: Text(r == 0.0 ? t('min_rating') : '★ ${r.toStringAsFixed(r == r.roundToDouble() ? 0 : 1)}+',
                          style: const TextStyle(fontSize: 13))))
                  .toList(),
              onChanged: (v) => setState(() { minRating = v ?? 0; _search(); }),
            ),
            const SizedBox(width: 8),
            ActionChip(
              avatar: const Icon(Icons.my_location, size: 18),
              label: Text(t('my_location')),
              onPressed: _useGps,
            ),
          ]),
        ),
        const SizedBox(height: 6),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : results.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(t('no_results'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF78716C))),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      itemCount: results.length,
                      itemBuilder: (_, i) => _resultCard(results[i]),
                    ),
        ),
      ]),
    );
  }

  Widget _resultCard(ProviderModel p) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: monogramAvatar(p.name, p.categoryId, photo: p.photo),
          title: Row(children: [
            Expanded(
                child: Text(p.businessName,
                    style: const TextStyle(fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
            if (p.verified == 'verified')
              const Icon(Icons.verified, color: Color(0xFF059669), size: 16),
          ]),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${locName(p.categoryNameEn, p.categoryNameHi)} · ${p.area}',
                style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Row(children: [
              starsRow(p.ratingAvg, p.ratingCount),
              const Spacer(),
              openBadge(p.isOpenNow),
              const SizedBox(width: 6),
              Text(p.distanceText,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
            ]),
          ]),
          onTap: () => Navigator.push(
              context, MaterialPageRoute(builder: (_) => DetailScreen(providerId: p.id))),
        ),
      );
}
