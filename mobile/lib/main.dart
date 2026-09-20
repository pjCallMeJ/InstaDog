import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // อ่านโทเคนก่อนสร้าง widget tree เพื่อให้ router รู้สถานะล็อกอินตั้งแต่เฟรมแรก
  final tokenStorage = TokenStorage();
  await tokenStorage.load();

  runApp(
    ProviderScope(
      overrides: [
        tokenStorageProvider.overrideWithValue(tokenStorage),
        authProvider.overrideWith(
          () => AuthNotifier(isSignedIn: tokenStorage.hasToken),
        ),
      ],
      child: const InstadogApp(),
    ),
  );
}

class InstadogApp extends ConsumerWidget {
  const InstadogApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'InstaDog',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) {
        // เลย์เอาต์มือถือ ตรึงความกว้างไว้กลางจอเวลารันบนเบราว์เซอร์
        return ColoredBox(
          color: const Color(0xFFE6E0D8),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Material(color: Theme.of(context).scaffoldBackgroundColor, child: child),
            ),
          ),
        );
      },
    );
  }
}
