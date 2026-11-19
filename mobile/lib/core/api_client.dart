// api_client.dart — thin REST client. SAME endpoint contract as web/js/api.js
// (docs/ARCHITECTURE.md §6).
//
// ▶ HOW TO POINT THE APP AT YOUR SERVER (1 line!):
//   Replace the defaultValue below with your deployed API URL (e.g. Render),
//   OR pass --dart-define=API_BASE=https://your-api.onrender.com at build time.
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://labors-near-me.onrender.com', // ← live backend (Render)
  );
  static String? token;       // set after OTP login
  static String? userName;    // cached display name

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static Future<void> saveSession(String tok, String name) async {
    token = tok;
    userName = name;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lnm_token', tok);
    await prefs.setString('lnm_user_name', name);
  }

  static Future<void> clearSession() async {
    token = null;
    userName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('lnm_token');
    await prefs.remove('lnm_user_name');
  }

  static Future<dynamic> get(String path, [Map<String, String>? query]) async {
    final uri = Uri.parse('$apiBase/api$path').replace(queryParameters: query);
    final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .post(Uri.parse('$apiBase/api$path'), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .put(Uri.parse('$apiBase/api$path'), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http
        .delete(Uri.parse('$apiBase/api$path'), headers: _headers)
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static dynamic _decode(http.Response res) {
    dynamic json;
    try {
      json = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      json = {};
    }
    if (res.statusCode >= 400) {
      if (res.statusCode == 401) clearSession();
      throw ApiException(json is Map ? (json['error'] ?? 'error') : 'error', res.statusCode,
          hint: json is Map ? json['hint'] : null);
    }
    return json;
  }
}

class ApiException implements Exception {
  ApiException(this.code, this.status, {this.hint});
  final String code;
  final int status;
  final String? hint;
  @override
  String toString() => 'ApiException($code)';
}
