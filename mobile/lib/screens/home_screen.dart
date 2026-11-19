// home_screen.dart — app shell: bottom navigation (Home · Search · Favorites · Account)
// + Home body: city picker, search box, category grid, top-rated, popular chips.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../main.dart';
import '../models.dart';
import 'account_screen.dart';
import 'detail_screen.dart';
import 'favorites_screen.dart';
import 'search_screen.dart';

/// Search tab input — Home taps a category / types a query → Search tab runs it.
final ValueNotifier<Map<String, String>> searchParams =
    ValueNotifier<Map<String, String>>(<String, String>{});

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          HomeBody(onOpenSearch: (params) {
            searchParams.value = params;
            setState(() => _tab = 1);
          }),
          const SearchBody(),
          const FavoritesBody(),
          const AccountBody(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFFB45309),
        unselectedItemColor: const Color(0xFF57534E),
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.home), label: t('app_name')),
          BottomNavigationBarItem(icon: const Icon(Icons.search), label: t('search_l')),
          BottomNavigationBarItem(icon: const Icon(Icons.favorite), label: t('favorites')),
          BottomNavigationBarItem(icon: const Icon(Icons.person), label: t('account')),
        ],
      ),
    );
  }
}

class HomeBody extends StatefulWidget {
  const HomeBody({super.key, required this.onOpenSearch});
  final void Function(Map<String, String>) onOpenSearch;
  @override
  State<HomeBody> createState() => _HomeBodyState();
}

class _HomeBodyState extends State<HomeBody> {
  List<CategoryModel> cats = [];
  List<CityModel> cities = [];
  List<ProviderModel> topRated = [];
  List<String> popular = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/categories'),
        ApiClient.get('/cities'),
        ApiClient.get('/providers/nearby', {'sort': 'rating', 'limit': '6'}),
        ApiClient.get('/searches/popular'),
      ]);
      cats = (results[0] as List).map((c) => CategoryModel.fromJson(c)).toList();
      cities = (results[1] as List).map((c) => CityModel.fromJson(c)).toList();
      topRated = ((results[2] as Map)['results'] as List)
          .map((p) => ProviderModel.fromJson(p))
          .toList();
      popular = List<String>.from(results[3] as List);
    } catch (_) {
      // offline / server down — keep empty lists, UI still renders
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _pickCity() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.7,
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(t('select_city'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ),
            Expanded(
              child: ListView(
                children: cities
                    .map((c) => ListTile(
                          leading: const Icon(Icons.location_city),
                          title: Text(locName(c.nameEn, c.nameHi)),
                          subtitle: Text(c.state, style: const TextStyle(fontSize: 12)),
                          onTap: () => Navigator.pop(ctx, c.id),
                        ))
                    .toList(),
              ),
            ),
          ]),
        ),
      ),
    );
    if (selected != null) {
      cityNotifier.value = selected;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('lnm_city', selected);
      if (mounted) setState(() {});
    }
  }

  void _toggleLang() {
    langNotifier.value = langNotifier.value == 'hi' ? 'en' : 'hi';
    SharedPreferences.getInstance()
        .then((p) => p.setString('lnm_lang', langNotifier.value));
  }

  String get _cityLabel {
    final c = cities.where((x) => x.id == cityNotifier.value).toList();
    return c.isEmpty ? cityNotifier.value : locName(c.first.nameEn, c.first.nameHi);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(children: [
        // ── Brand header ────────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
                colors: [Color(0xFFFB923C), Color(0xFFF97316), Color(0xFFEA580C)],
                begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset('assets/icon.png', width: 36, height: 36,
                    errorBuilder: (_, __, ___) =>
                        const Icon(Icons.location_pin, color: Colors.white, size: 32)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(t('app_name'),
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800, fontSize: 19)),
              ),
              // city chip
              ActionChip(
                onPressed: _pickCity,
                backgroundColor: Colors.white24,
                label: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.location_on, color: Colors.white, size: 16),
                  const SizedBox(width: 4),
                  Text(_cityLabel,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ]),
              ),
              const SizedBox(width: 6),
              // language toggle
              GestureDetector(
                onTap: _toggleLang,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      border: Border.all(color: Colors.white70),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text(langNotifier.value == 'hi' ? 'EN' : 'हि',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
              ),
            ]),
            const SizedBox(height: 14),
            // search box
            GestureDetector(
              onTap: () => widget.onOpenSearch(const {}),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  const Icon(Icons.search, color: Color(0xFF78716C)),
                  const SizedBox(width: 8),
                  Text(t('search_hint'), style: const TextStyle(color: Color(0xFF78716C))),
                ]),
              ),
            ),
          ]),
        ),
        // ── Body ────────────────────────────────────────────────────────
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.all(14), children: [
              Text(t('categories'),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              if (loading)
                const Center(
                    child: Padding(
                        padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
              GridView.count(
                crossAxisCount: 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                children: cats
                    .map((c) => GestureDetector(
                          onTap: () => widget
                              .onOpenSearch({'category': c.id, 'categoryName': locName(c.nameEn, c.nameHi)}),
                          child: Column(children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                  color: kCatImages.containsKey(c.id)
                                      ? catColor(c.id)
                                      : catColor(c.id).withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(14)),
                              alignment: Alignment.center,
                              child: catIconWidget(c.id, c.icon,
                                  size: kCatImages.containsKey(c.id) ? 34 : 28),
                            ),
                            const SizedBox(height: 4),
                            Text(locName(c.nameEn, c.nameHi),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                          ]),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 18),
              Row(children: [
                Expanded(
                    child: Text(t('top_rated'),
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
                TextButton(
                    onPressed: () => widget.onOpenSearch({'sort': 'rating'}),
                    child: Text(t('see_all'))),
              ]),
              ...topRated.map((p) => _workerCard(p)),
              const SizedBox(height: 10),
              if (popular.isNotEmpty) ...[
                Text(t('popular'),
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: popular
                      .map((q) => ActionChip(
                            label: Text(q),
                            onPressed: () => widget.onOpenSearch({'q': q}),
                          ))
                      .toList(),
                ),
              ],
              const SizedBox(height: 24),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _workerCard(ProviderModel p) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: monogramAvatar(p.name, p.categoryId, photo: p.photo),
          title: Text(p.businessName, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${locName(p.categoryNameEn, p.categoryNameHi)} · ${p.distanceText}',
                style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 2),
            starsRow(p.ratingAvg, p.ratingCount),
          ]),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
              context, MaterialPageRoute(builder: (_) => DetailScreen(providerId: p.id))),
        ),
      );
}
