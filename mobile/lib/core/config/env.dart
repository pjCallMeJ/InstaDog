import 'package:flutter/foundation.dart';

class Env {
  const Env._();

  /// ตั้งค่าตอนรันด้วย --dart-define=API_BASE_URL=...
  /// มือถือจริงค่าเริ่มต้นชี้ LAN ของเครื่องพัฒนา — ไม่ต้องเสียบ USB
  /// Emulator ใช้ --dart-define=API_BASE_URL=http://10.0.2.2:1337
  static const String compiledApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kIsWeb ? 'http://localhost:1337' : 'http://10.137.82.197:1337',
  );

  static String _apiBaseUrl = compiledApiBaseUrl;

  static String get apiBaseUrl => _apiBaseUrl;

  static String get apiRoot => '$apiBaseUrl/api';

  /// รับแค่ IP, host:port หรือ URL เต็ม แล้วเติม http + พอร์ต 1337 ให้
  static String normalizeBaseUrl(String raw) {
    var value = raw.trim();
    if (value.isEmpty) return compiledApiBaseUrl;
    if (!value.contains('://')) {
      value = 'http://$value';
    }

    final uri = Uri.tryParse(value);
    if (uri == null || uri.host.isEmpty) return compiledApiBaseUrl;

    var path = uri.path;
    if (path.endsWith('/')) path = path.substring(0, path.length - 1);
    if (path == '/api') path = '';

    return Uri(
      scheme: uri.scheme.isEmpty ? 'http' : uri.scheme,
      host: uri.host,
      port: uri.hasPort ? uri.port : 1337,
      path: path,
    ).toString();
  }

  static void applyBaseUrl(String raw) {
    _apiBaseUrl = normalizeBaseUrl(raw);
  }

  /// Strapi ส่งรูปเป็น http://localhost:1337/uploads/... ซึ่งบนมือถือคือตัวเครื่องเอง
  /// แปลงโฮสต์ให้ตรงกับ API_BASE_URL เพื่อให้รูปวิ่งผ่าน LAN IP
  static String? resolveMediaUrl(String? url) {
    if (url == null || url.isEmpty) return url;
    final parsed = Uri.tryParse(url);
    if (parsed == null || parsed.host.isEmpty) return url;
    const loopback = {'localhost', '127.0.0.1', '10.0.2.2'};
    if (!loopback.contains(parsed.host)) return url;

    final api = Uri.parse(apiBaseUrl);
    return parsed
        .replace(
          scheme: api.scheme,
          host: api.host,
          port: api.hasPort ? api.port : null,
        )
        .toString();
  }
}
