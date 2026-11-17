// main.dart — Labors Near Me mobile app (Android / iOS).
// Bilingual (EN/हिंदी), orange brand, works against the same REST API as the web PWA.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api_client.dart';
import 'core/i18n.dart';
import 'screens/home_screen.dart';

final ValueNotifier<String> cityNotifier = ValueNotifier<String>('indore');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  langNotifier.value = prefs.getString('lnm_lang') ?? 'en';
  cityNotifier.value = prefs.getString('lnm_city') ?? 'indore';
  ApiClient.token = prefs.getString('lnm_token');
  ApiClient.userName = prefs.getString('lnm_user_name');
  runApp(const LaborsApp());
}

class LaborsApp extends StatelessWidget {
  const LaborsApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Whole app rebuilds when the language changes.
    return ValueListenableBuilder<String>(
      valueListenable: langNotifier,
      builder: (context, _, __) => MaterialApp(
        title: 'Labors Near Me',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFFF97316),
            primary: const Color(0xFFF97316),
            secondary: const Color(0xFFF59E0B),
          ),
          scaffoldBackgroundColor: const Color(0xFFFAFAF9),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFFF97316),
            foregroundColor: Colors.white,
            elevation: 0,
            centerTitle: false,
          ),
          fontFamilyFallback: const ['Noto Sans Devanagari', 'Nirmala UI', 'sans-serif'],
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE7E5E4)),
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
