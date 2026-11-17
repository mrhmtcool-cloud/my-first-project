// favorites_screen.dart — saved providers (requires login).
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../models.dart';
import 'detail_screen.dart';

class FavoritesBody extends StatefulWidget {
  const FavoritesBody({super.key});
  @override
  State<FavoritesBody> createState() => _FavoritesBodyState();
}

class _FavoritesBodyState extends State<FavoritesBody> {
  List<ProviderModel> favs = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (ApiClient.token == null) {
      if (mounted) setState(() => loading = false);
      return;
    }
    try {
      final list = await ApiClient.get('/favorites');
      favs = (list as List)
          .map((j) => ProviderModel.fromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
    } catch (_) {
      favs = [];
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : ApiClient.token == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(t('login'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFF78716C))),
                  ),
                )
              : favs.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(t('no_fav'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF78716C))),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(14),
                        children: [
                          Text(t('favorites'),
                              style: const TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 10),
                          ...favs.map((p) => Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.all(12),
                                  leading: monogramAvatar(p.name, p.categoryId),
                                  title: Text(p.businessName,
                                      style:
                                          const TextStyle(fontWeight: FontWeight.w700)),
                                  subtitle: starsRow(p.ratingAvg, p.ratingCount),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                          builder: (_) =>
                                              DetailScreen(providerId: p.id))),
                                ),
                              )),
                        ],
                      ),
                    ),
    );
  }
}
