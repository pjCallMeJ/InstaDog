import 'package:shared_preferences/shared_preferences.dart';

import '../config/env.dart';

/// ที่เก็บ JWT และที่อยู่เซิร์ฟเวอร์
///
/// บนมือถือควรย้ายไป flutter_secure_storage ก่อนขึ้น production
/// รอบนี้เป้าหมายคือรันบน Chrome จึงใช้ shared_preferences ซึ่งทำงานได้ทุกแพลตฟอร์ม
class TokenStorage {
  static const _tokenKey = 'instadog.jwt';
  static const _apiUrlKey = 'instadog.apiBaseUrl';

  String? _cached;

  String? get token => _cached;

  bool get hasToken => (_cached ?? '').isNotEmpty;

  String get apiBaseUrl => Env.apiBaseUrl;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _cached = prefs.getString(_tokenKey);
    final savedUrl = prefs.getString(_apiUrlKey);
    if (savedUrl != null && savedUrl.trim().isNotEmpty) {
      Env.applyBaseUrl(savedUrl);
    }
  }

  Future<void> save(String token) async {
    _cached = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> saveApiBaseUrl(String url) async {
    Env.applyBaseUrl(url);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiUrlKey, Env.apiBaseUrl);
  }

  Future<void> clear() async {
    _cached = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
