import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/instadog_repository.dart';
import 'models/models.dart';
import 'network/api_client.dart';
import 'storage/token_storage.dart';

/// ตั้งค่าใน main() หลังจากโหลดโทเคนจากดิสก์แล้ว
final tokenStorageProvider = Provider<TokenStorage>((ref) {
  throw UnimplementedError('ต้อง override tokenStorageProvider ใน main()');
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(ref.watch(tokenStorageProvider));
  client.onUnauthorized = () => ref.read(authProvider.notifier).handleExpiredSession();
  return client;
});

final repositoryProvider = Provider<InstadogRepository>(
  (ref) => InstadogRepository(ref.watch(apiClientProvider)),
);

// ---------------------------------------------------------------- auth state

class AuthState {
  const AuthState({required this.isSignedIn, this.sessionExpired = false});

  final bool isSignedIn;
  final bool sessionExpired;
}

class AuthNotifier extends Notifier<AuthState> {
  AuthNotifier({required bool isSignedIn}) : _initiallySignedIn = isSignedIn;

  final bool _initiallySignedIn;

  @override
  AuthState build() => AuthState(isSignedIn: _initiallySignedIn);

  Ref get _ref => ref;

  TokenStorage get _storage => _ref.read(tokenStorageProvider);

  Future<void> login(String identifier, String password) async {
    final jwt = await _ref.read(repositoryProvider).login(identifier, password);
    await _storage.save(jwt);
    state = const AuthState(isSignedIn: true);
  }

  Future<void> register({
    required String username,
    required String email,
    required String password,
    required String displayName,
    required String dogNameTh,
    String? dogNameEn,
    String? breedSlug,
    String gender = 'male',
    double? weight,
  }) async {
    final jwt = await _ref.read(repositoryProvider).registerWithDog(
          username: username,
          email: email,
          password: password,
          displayName: displayName,
          dogNameTh: dogNameTh,
          dogNameEn: dogNameEn,
          breedSlug: breedSlug,
          gender: gender,
          weight: weight,
        );
    await _storage.save(jwt);
    state = const AuthState(isSignedIn: true);
  }

  Future<void> logout() async {
    await _storage.clear();
    _ref.invalidate(meProfileProvider);
    state = const AuthState(isSignedIn: false);
  }

  /// เรียกจาก interceptor เมื่อเจอ 401 — โทเคนถูกล้างไปแล้ว
  void handleExpiredSession() {
    if (!state.isSignedIn) return;
    state = const AuthState(isSignedIn: false, sessionExpired: true);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  () => throw UnimplementedError('ต้อง override authProvider ใน main()'),
);

// ------------------------------------------------------------ shared queries

final meProfileProvider = FutureProvider<MeProfile>(
  (ref) => ref.watch(repositoryProvider).myProfile(),
);

final unreadCountProvider = FutureProvider<int>((ref) async {
  try {
    return await ref.watch(repositoryProvider).unreadCount();
  } catch (_) {
    return 0;
  }
});

final breedsProvider = FutureProvider<List<Breed>>(
  (ref) => ref.watch(repositoryProvider).breeds(),
);

/// แท็บของหน้าสำรวจมาจากที่นี่ — จำนวนหมวด = ความยาวของ TabController
final exploreCategoriesProvider = FutureProvider<List<ExploreCategory>>(
  (ref) => ref.watch(repositoryProvider).exploreCategories(),
);

/// สุนัขตัวหลัก ใช้เป็น handle เริ่มต้นของแท็บโปรไฟล์
final primaryDogHandleProvider = Provider<AsyncValue<String?>>((ref) {
  return ref.watch(meProfileProvider).whenData((me) => me.primaryDog?.handle);
});

// -------------------------------------------------------------- misc helpers

/// รองรับกรณี dev hot reload บนเว็บ ให้ log อ่านง่าย
void logDebug(String message) {
  if (kDebugMode) debugPrint('[instadog] $message');
}
