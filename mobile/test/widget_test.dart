import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:instadog/core/theme/app_colors.dart';
import 'package:instadog/core/theme/app_theme.dart';

void main() {
  testWidgets('ธีมใช้โทนครีมและสีเน้นตาม design token', (tester) async {
    final theme = AppTheme.build();

    expect(theme.scaffoldBackgroundColor, AppColors.bg);
    expect(theme.colorScheme.primary, AppColors.accent1);
    expect(theme.colorScheme.secondary, AppColors.amber);
  });

  testWidgets('แอปเรนเดอร์ได้โดยไม่ throw', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.build(),
        home: const Scaffold(body: Center(child: Text('InstaDog'))),
      ),
    );

    expect(find.text('InstaDog'), findsOneWidget);
  });
}
