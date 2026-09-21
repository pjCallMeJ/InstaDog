import 'package:flutter/foundation.dart';

class Env {
  const Env._();

  /// ตั้งค่าตอนรันด้วย --dart-define=API_BASE_URL=...
  /// มือถือจริงค่าเริ่มต้นชี้เซิร์ฟเวอร์ production — ไม่ต้องอยู่ Wi‑Fi เดียวกับคอม
  /// Emulator ใช้ --dart-define=API_BASE_URL=http://10.0.2.2:1337
  static const String compiledApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kIsWeb ? 'http://localhost:1337' : 'https://instadog.cyfrex.co.th',
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

    final scheme = uri.scheme.isEmpty ? 'http' : uri.scheme;
    final int? port;
    if (uri.hasPort) {
      port = uri.port;
    } else if (_isPrivateHost(uri.host)) {
      port = 1337;
    } else {
      port = null;
    }

    return Uri(
      scheme: scheme,
      host: uri.host,
      port: port,
      path: path,
    ).toString();
  }

  static void applyBaseUrl(String raw) {
    _apiBaseUrl = normalizeBaseUrl(raw);
  }

  static bool _isPrivateHost(String host) {
    if (host == 'localhost' || host == '127.0.0.1' || host == '10.0.2.2') {
      return true;
    }
    if (host.startsWith('10.')) return true;
    if (host.startsWith('192.168.')) return true;
    if (host.startsWith('172.')) {
      final second = int.tryParse(host.split('.').elementAtOrNull(1) ?? '');
      if (second != null && second >= 16 && second <= 31) return true;
    }
    return false;
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
