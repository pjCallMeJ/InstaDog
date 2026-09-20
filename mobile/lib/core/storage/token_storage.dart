import 'package:shared_preferences/shared_preferences.dart';

/// ที่เก็บ JWT
///
/// บนมือถือควรย้ายไป flutter_secure_storage ก่อนขึ้น production
/// รอบนี้เป้าหมายคือรันบน Chrome จึงใช้ shared_preferences ซึ่งทำงานได้ทุกแพลตฟอร์ม
class TokenStorage {
  static const _tokenKey = 'instadog.jwt';

  String? _cached;

  String? get token => _cached;

  bool get hasToken => (_cached ?? '').isNotEmpty;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _cached = prefs.getString(_tokenKey);
  }

  Future<void> save(String token) async {
    _cached = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clear() async {
    _cached = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
