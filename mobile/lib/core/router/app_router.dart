import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/activity/presentation/activity_care_screen.dart';
import '../../features/auth/presentation/change_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/bark/presentation/bark_screen.dart';
import '../../features/create/presentation/create_post_screen.dart';
import '../../features/profile/presentation/dog_profile_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/search/presentation/search_screen.dart';
import '../../features/shell/presentation/home_shell.dart';
import '../providers.dart';

/// แปลง Riverpod state เป็น Listenable ให้ go_router รู้ว่าต้อง redirect ใหม่
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(this._ref) {
    _ref.listen<AuthState>(authProvider, (_, _) => notifyListeners());
  }

  final Ref _ref;
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthListenable(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/feed',
    refreshListenable: refresh,
    redirect: (context, state) {
      final signedIn = ref.read(authProvider).isSignedIn;
      final path = state.matchedLocation;
      final onAuthPage = path == '/login' || path == '/register';

      if (!signedIn && !onAuthPage) return '/login';
      if (signedIn && onAuthPage) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),

      // แท็บทั้งห้าของ Bottom Nav อยู่ใน shell เดียวกัน เพื่อคงสถานะเมื่อสลับแท็บ
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/feed', builder: (context, state) => const FeedTabPage())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/explore', builder: (context, state) => const ExploreTabPage())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/create', builder: (context, state) => const CreateTabPage())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/notifications', builder: (context, state) => const NotificationsTabPage()),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/profile', builder: (context, state) => const ProfileTabPage())],
          ),
        ],
      ),

      // เข้าจากไอคอนบน Header ของหน้าแรก
      GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
      GoRoute(path: '/activity', builder: (context, state) => const ActivityCareScreen()),
      GoRoute(path: '/bark', builder: (context, state) => const BarkScreen()),

      GoRoute(
        path: '/create-post',
        builder: (context, state) => const CreatePostScreen(),
      ),
      GoRoute(
        path: '/dogs/:handle',
        builder: (context, state) => DogProfileScreen(handle: state.pathParameters['handle']!),
      ),
      GoRoute(path: '/profile/edit', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/settings/password', builder: (context, state) => const ChangePasswordScreen()),
    ],
  );
});
