import 'package:flutter/foundation.dart';

class Env {
  const Env._();

  /// ตั้งค่าตอนรันด้วย --dart-define=API_BASE_URL=...
  /// Android emulator ใช้ 10.0.2.2 — มือถือจริงใช้ adb reverse แล้วชี้ 127.0.0.1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kIsWeb ? 'http://localhost:1337' : 'http://10.0.2.2:1337',
  );

  static String get apiRoot => '$apiBaseUrl/api';

  /// Strapi ส่งรูปเป็น http://localhost:1337/uploads/... ซึ่งบนมือถือคือตัวเครื่องเอง
  /// แปลงโฮสต์ให้ตรงกับ API_BASE_URL เพื่อให้รูปวิ่งผ่าน adb reverse หรือ LAN IP
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
