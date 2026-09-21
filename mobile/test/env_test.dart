import 'package:flutter_test/flutter_test.dart';
import 'package:instadog/core/config/env.dart';

void main() {
  test('เติม http และพอร์ต 1337 ให้ที่อยู่เซิร์ฟเวอร์', () {
    expect(Env.normalizeBaseUrl('10.137.82.197'), 'http://10.137.82.197:1337');
    expect(Env.normalizeBaseUrl('http://10.137.82.197'), 'http://10.137.82.197:1337');
    expect(Env.normalizeBaseUrl('http://10.137.82.197:1337/api'), 'http://10.137.82.197:1337');
    expect(Env.normalizeBaseUrl('http://152.42.181.47'), 'http://152.42.181.47');
    expect(Env.normalizeBaseUrl('https://instadog.cyfrex.co.th'), 'https://instadog.cyfrex.co.th');
    expect(Env.normalizeBaseUrl('https://instadog.cyfrex.co.th/api'), 'https://instadog.cyfrex.co.th');
    expect(Env.normalizeBaseUrl('http://152.42.181.47/api'), 'http://152.42.181.47');
  });
}
