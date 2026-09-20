import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_icons.dart';
import '../../../shared/widgets/state_views.dart';

/// หน้าแจ้งเตือน สองแท็บตาม mockup: กำลังติดตาม / คุณ
/// ใช้ TabController pattern เดียวกับหน้าสำรวจ แต่จำนวนแท็บคงที่จึงประกาศตรง ๆ ได้
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TabController(length: 2, vsync: this, initialIndex: 1);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _markAllRead() async {
    try {
      await ref.read(repositoryProvider).markAllRead();
      ref.invalidate(unreadCountProvider);
      if (mounted) setState(() {});
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('แจ้งเตือน'),
        actions: [
          IconButton(
            tooltip: 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด',
            icon: const Icon(Icons.done_all_rounded, size: 20),
            onPressed: _markAllRead,
          ),
        ],
        bottom: TabBar(
          controller: _controller,
          tabs: const [
            Tab(text: 'กำลังติดตาม'),
            Tab(text: 'คุณ'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _controller,
        children: const [
          _NotificationList(scope: 'following'),
          _NotificationList(scope: 'you'),
        ],
      ),
    );
  }
}

class _NotificationList extends ConsumerStatefulWidget {
  const _NotificationList({required this.scope});

  final String scope;

  @override
  ConsumerState<_NotificationList> createState() => _NotificationListState();
}

class _NotificationListState extends ConsumerState<_NotificationList>
    with AutomaticKeepAliveClientMixin {
  List<NotificationGroup>? _groups;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final groups = await ref.read(repositoryProvider).notifications(scope: widget.scope);
      if (mounted) setState(() => _groups = groups);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_groups == null) return const LoadingView();
    if (_groups!.isEmpty) {
      return const EmptyView(
        title: 'ยังไม่มีการแจ้งเตือน',
        message: 'เมื่อมีคนถูกใจหรือคอมเมนต์ จะขึ้นที่นี่',
        icon: Icons.notifications_none_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent1,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 20),
        itemCount: _groups!.length,
        itemBuilder: (context, index) {
          final group = _groups![index];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                child: Text(
                  group.label,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              for (final item in group.items) _NotificationTile(item: item),
            ],
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});

  final AppNotification item;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: item.isRead ? Colors.transparent : AppColors.amberSoft.withValues(alpha: 0.35),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Avatar(url: item.actorDog?.avatarUrl ?? item.actor?.avatarUrl, size: 44),
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Icon(
                    notificationIcon(item.type),
                    size: 11,
                    color: item.type == 'like' ? AppColors.like : AppColors.accent1,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RichText(
                  text: TextSpan(
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(fontSize: 13.5, height: 1.45, color: AppColors.textSecondary),
                    children: [
                      TextSpan(
                        text: item.actor?.displayName ?? '',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.text),
                      ),
                      const TextSpan(text: ' '),
                      TextSpan(text: item.message),
                    ],
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  item.timeAgo,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          if (item.postThumbnailUrl != null) ...[
            const SizedBox(width: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: RemoteImage(url: item.postThumbnailUrl, width: 44, height: 44),
            ),
          ] else if (item.type == 'follow') ...[
            const SizedBox(width: 10),
            SizedBox(
              height: 32,
              child: FilledButton(
                onPressed: () {},
                style: FilledButton.styleFrom(
                  minimumSize: const Size(72, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
                child: const Text('ติดตามกลับ'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
