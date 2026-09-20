import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';
import 'dog_profile_screen.dart';

/// แท็บโปรไฟล์ของ Bottom Nav — แสดงโปรไฟล์สุนัขตัวหลักของผู้ใช้
/// ใช้ DogProfileScreen ตัวเดียวกับหน้าโปรไฟล์คนอื่น แต่เปลี่ยนปุ่มมุมขวาเป็นเมนูตั้งค่า
class MyProfileScreen extends ConsumerWidget {
  const MyProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProfileProvider);

    return me.when(
      loading: () => const Scaffold(body: LoadingView()),
      error: (error, _) => Scaffold(
        body: ErrorView(message: '$error', onRetry: () => ref.invalidate(meProfileProvider)),
      ),
      data: (profile) {
        final handle = profile.primaryDog?.handle;
        if (handle == null) {
          return Scaffold(
            appBar: AppBar(
              automaticallyImplyLeading: false,
              title: const Text('โปรไฟล์'),
              actions: [_SettingsButton(displayName: profile.displayName)],
            ),
            body: const EmptyView(
              title: 'ยังไม่มีน้องหมาในบัญชี',
              message: 'เพิ่มน้องหมาตัวแรกเพื่อเริ่มโพสต์',
            ),
          );
        }

        return DogProfileScreen(
          key: ValueKey(handle),
          handle: handle,
          showBackButton: false,
          trailing: [_SettingsButton(displayName: profile.displayName)],
        );
      },
    );
  }
}

class _SettingsButton extends ConsumerWidget {
  const _SettingsButton({required this.displayName});

  final String displayName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<String>(
      icon: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.menu_rounded, size: 19, color: Colors.white),
      ),
      onSelected: (value) async {
        switch (value) {
          case 'edit':
            context.push('/profile/edit');
          case 'password':
            context.push('/settings/password');
          case 'saved':
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('รายการที่บันทึกไว้จะมาในรุ่นถัดไป')),
            );
          case 'logout':
            final confirmed = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('ออกจากระบบ?'),
                content: Text('คุณกำลังเข้าใช้งานในชื่อ $displayName'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('ยกเลิก'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('ออกจากระบบ'),
                  ),
                ],
              ),
            );
            if (confirmed == true) {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            }
        }
      },
      itemBuilder: (context) => const [
        PopupMenuItem(value: 'edit', child: Text('แก้ไขโปรไฟล์')),
        PopupMenuItem(value: 'password', child: Text('เปลี่ยนรหัสผ่าน')),
        PopupMenuItem(value: 'saved', child: Text('รายการที่บันทึกไว้')),
        PopupMenuItem(
          value: 'logout',
          child: Text('ออกจากระบบ', style: TextStyle(color: AppColors.danger)),
        ),
      ],
    );
  }
}
