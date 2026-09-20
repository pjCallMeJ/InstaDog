import 'package:flutter/material.dart';

/// โทนสีจาก mockup ของ InstaDog — ครีมอุ่นตัดกับน้ำตาลเทา
class AppColors {
  const AppColors._();

  static const bg = Color(0xFFF4F0EA);
  static const surface = Color(0xFFFFFDF9);
  static const surfaceAlt = Color(0xFFEFE8E0);

  static const text = Color(0xFF302B29);
  static const textSecondary = Color(0xFF5F5651);
  static const textMuted = Color(0xFF857A74);

  static const accent1 = Color(0xFF6D5F57); // ปุ่มหลัก เช่น "ติดตาม"
  static const accent2 = Color(0xFFA28F82);
  static const accent3 = Color(0xFFC5B3A4);

  /// ใช้กับชิปและแท็บบนหน้าสำรวจ
  static const amber = Color(0xFFC89B5C);
  static const amberSoft = Color(0xFFF2E3CE);

  static const border = Color(0x244C413C);
  static const divider = Color(0xFFE8DFD7);

  static const like = Color(0xFFD1584F);
  static const success = Color(0xFF6E8F5E);
  static const danger = Color(0xFFBA1A1A);
  static const dangerSoft = Color(0xFFFFDAD6);

  /// วงแหวนไล่สีของสตอรี่ที่ยังไม่ดู
  static const storyRing = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFC89B5C), Color(0xFFA28F82), Color(0xFF6D5F57)],
  );
}
