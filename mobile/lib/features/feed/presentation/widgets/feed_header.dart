import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/providers.dart';
import '../../../../core/theme/app_colors.dart';

/// Header ของหน้าแรกตาม mockup: โลโก้ซ้าย ไอคอนขวา
/// กิจกรรมและ AI Bark เข้าจากที่นี่ เพราะ Bottom Nav มีแค่ห้าแท็บ
class FeedHeader extends ConsumerWidget implements PreferredSizeWidget {
  const FeedHeader({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadCountProvider).value ?? 0;

    return AppBar(
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      centerTitle: false,
      title: Row(
        children: [
          const Text('🐾', style: TextStyle(fontSize: 20)),
          const SizedBox(width: 6),
          Text(
            'InstaDog',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  letterSpacing: -0.4,
                ),
          ),
        ],
      ),
      actions: [
        _HeaderIcon(
          icon: Icons.directions_walk_rounded,
          tooltip: 'กิจกรรมและการดูแล',
          onTap: () => context.push('/activity'),
        ),
        _HeaderIcon(
          icon: Icons.auto_awesome_rounded,
          tooltip: 'AI Bark',
          onTap: () => context.push('/bark'),
        ),
        _HeaderIcon(
          icon: Icons.search_rounded,
          tooltip: 'ค้นหา',
          onTap: () => context.push('/search'),
        ),
        _HeaderIcon(
          icon: Icons.notifications_none_rounded,
          tooltip: 'แจ้งเตือน',
          badgeCount: unread,
          onTap: () => context.go('/notifications'),
        ),
        const SizedBox(width: 6),
      ],
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.badgeCount = 0,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onTap,
      visualDensity: VisualDensity.compact,
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(icon, size: 23, color: AppColors.text),
          if (badgeCount > 0)
            Positioned(
              right: -3,
              top: -2,
              child: Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: AppColors.like, shape: BoxShape.circle),
              ),
            ),
        ],
      ),
    );
  }
}
