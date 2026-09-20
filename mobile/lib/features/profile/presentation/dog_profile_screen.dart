import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_icons.dart';
import '../../../shared/widgets/state_views.dart';

/// หน้าโปรไฟล์สุนัขตาม mockup
/// รูปปกเต็มความกว้าง -> avatar วงกลมซ้อน -> ชื่อ/สายพันธุ์ -> ชิปสายพันธุ์+อายุ
/// -> bio -> ปุ่มติดตาม+แชร์ -> แถวสถิติ -> TabBar สามแท็บ
class DogProfileScreen extends ConsumerStatefulWidget {
  const DogProfileScreen({
    super.key,
    required this.handle,
    this.showBackButton = true,
    this.trailing,
  });

  final String handle;
  final bool showBackButton;
  final List<Widget>? trailing;

  @override
  ConsumerState<DogProfileScreen> createState() => _DogProfileScreenState();
}

class _DogProfileScreenState extends ConsumerState<DogProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  DogProfile? _profile;
  String? _error;
  bool _togglingFollow = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void didUpdateWidget(DogProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.handle != widget.handle) _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _profile = null;
    });
    try {
      final profile = await ref.read(repositoryProvider).dogProfile(widget.handle);
      if (mounted) setState(() => _profile = profile);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _toggleFollow() async {
    if (_profile == null || _togglingFollow) return;
    setState(() => _togglingFollow = true);
    try {
      await ref.read(repositoryProvider).toggleFollow(widget.handle);
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _togglingFollow = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('โปรไฟล์')),
        body: ErrorView(message: _error!, onRetry: _load),
      );
    }
    if (_profile == null) {
      return const Scaffold(body: LoadingView());
    }

    final profile = _profile!;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerScrolled) => [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            automaticallyImplyLeading: false,
            backgroundColor: AppColors.bg,
            leading: widget.showBackButton
                ? IconButton(
                    icon: const _CircleIcon(Icons.arrow_back_rounded),
                    onPressed: () => context.canPop() ? context.pop() : context.go('/feed'),
                  )
                : null,
            actions: widget.trailing ??
                [
                  IconButton(
                    icon: const _CircleIcon(Icons.more_horiz_rounded),
                    onPressed: () {},
                  ),
                ],
            flexibleSpace: FlexibleSpaceBar(
              // avatar ต้องอยู่ในขอบเขตของ SliverAppBar เพราะ sliver ที่มาก่อนถูกวาดทับ sliver ถัดไป
              // ถ้าเลื่อน avatar ลงไปอยู่ใน header ด้านล่างแล้วดันขึ้นมา จะโดนแถบนี้บังครึ่งบน
              background: Stack(
                children: [
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 46,
                    child: RemoteImage(url: profile.coverUrl ?? profile.avatarUrl),
                  ),
                  Positioned(
                    left: 16,
                    bottom: 0,
                    child: Container(
                      width: 88,
                      height: 88,
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(color: AppColors.bg, shape: BoxShape.circle),
                      child: ClipOval(child: RemoteImage(url: profile.avatarUrl)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(child: _header(profile)),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabs,
                tabs: const [
                  Tab(text: 'โพสต์'),
                  Tab(text: 'รูปภาพ'),
                  Tab(text: 'เกี่ยวกับ'),
                ],
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabs,
          children: [
            _PostsTab(handle: widget.handle),
            _PhotosTab(handle: widget.handle),
            _AboutTab(handle: widget.handle),
          ],
        ),
      ),
    );
  }

  Widget _header(DogProfile profile) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Builder(
            builder: (context) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      profile.nameTh,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text('🐾', style: TextStyle(fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  profile.breedNameTh ?? '',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13.5),
                ),
                const SizedBox(height: 14),

                // ชิปสายพันธุ์ + อายุ
                Row(
                  children: [
                    Expanded(
                      child: _InfoChip(
                        icon: Icons.pets_rounded,
                        label: 'สายพันธุ์',
                        value: profile.breedNameTh ?? '-',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _InfoChip(
                        icon: Icons.calendar_month_rounded,
                        label: 'อายุ',
                        value: profile.ageText.isEmpty ? '-' : profile.ageText,
                      ),
                    ),
                  ],
                ),

                if ((profile.bio ?? '').isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(
                    profile.bio!,
                    style: const TextStyle(fontSize: 14, height: 1.55, color: AppColors.textSecondary),
                  ),
                ],

                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: profile.isMine
                          ? OutlinedButton(
                              onPressed: () => context.push('/profile/edit'),
                              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                              child: const Text('แก้ไขโปรไฟล์'),
                            )
                          : FilledButton(
                              onPressed: _togglingFollow ? null : _toggleFollow,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(42),
                                backgroundColor:
                                    profile.isFollowing ? AppColors.surfaceAlt : AppColors.accent1,
                                foregroundColor:
                                    profile.isFollowing ? AppColors.text : Colors.white,
                              ),
                              child: Text(profile.isFollowing ? 'กำลังติดตาม' : 'ติดตาม'),
                            ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 46,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.ios_share_rounded, size: 18),
                        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('คัดลอกลิงก์โปรไฟล์ @${profile.handle} แล้ว')),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 18),
                Row(
                  children: [
                    _Stat(value: profile.counts.posts, label: 'โพสต์'),
                    _Stat(value: profile.counts.followers, label: 'ผู้ติดตาม'),
                    _Stat(value: profile.counts.following, label: 'กำลังติดตาม'),
                  ],
                ),
                const SizedBox(height: 6),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleIcon extends StatelessWidget {
  const _CircleIcon(this.icon);

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 19, color: Colors.white),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: const BoxDecoration(color: AppColors.amberSoft, shape: BoxShape.circle),
            child: Icon(icon, size: 14, color: AppColors.amber),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10.5, color: AppColors.textMuted)),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final int value;
  final String label;

  String get _compact {
    if (value < 1000) return '$value';
    final k = value / 1000;
    return '${k % 1 == 0 ? k.toStringAsFixed(0) : k.toStringAsFixed(1)}K';
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            _compact,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                ),
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

/// ตรึง TabBar ไว้ใต้ SliverAppBar ตอนเลื่อน
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this.tabBar);

  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return ColoredBox(color: AppColors.bg, child: tabBar);
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => oldDelegate.tabBar != tabBar;
}

// ----------------------------------------------------------------- แท็บย่อย

class _PostsTab extends ConsumerStatefulWidget {
  const _PostsTab({required this.handle});

  final String handle;

  @override
  ConsumerState<_PostsTab> createState() => _PostsTabState();
}

class _PostsTabState extends ConsumerState<_PostsTab> with AutomaticKeepAliveClientMixin {
  List<Post>? _posts;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final posts = await ref.read(repositoryProvider).dogPosts(widget.handle);
      if (mounted) setState(() => _posts = posts);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_posts == null) return const LoadingView();
    if (_posts!.isEmpty) {
      return const EmptyView(title: 'ยังไม่มีโพสต์', icon: Icons.photo_library_outlined);
    }

    return GridView.builder(
      padding: const EdgeInsets.all(2),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 2,
        crossAxisSpacing: 2,
      ),
      itemCount: _posts!.length,
      itemBuilder: (context, index) => RemoteImage(url: _posts![index].coverUrl),
    );
  }
}

class _PhotosTab extends ConsumerStatefulWidget {
  const _PhotosTab({required this.handle});

  final String handle;

  @override
  ConsumerState<_PhotosTab> createState() => _PhotosTabState();
}

class _PhotosTabState extends ConsumerState<_PhotosTab> with AutomaticKeepAliveClientMixin {
  List<PhotoTile>? _photos;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final photos = await ref.read(repositoryProvider).dogPhotos(widget.handle);
      if (mounted) setState(() => _photos = photos);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_photos == null) return const LoadingView();
    if (_photos!.isEmpty) {
      return const EmptyView(title: 'ยังไม่มีรูปภาพ', icon: Icons.image_outlined);
    }

    return GridView.builder(
      padding: const EdgeInsets.all(2),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 2,
        crossAxisSpacing: 2,
      ),
      itemCount: _photos!.length,
      itemBuilder: (context, index) => RemoteImage(url: _photos![index].url),
    );
  }
}

class _AboutTab extends ConsumerStatefulWidget {
  const _AboutTab({required this.handle});

  final String handle;

  @override
  ConsumerState<_AboutTab> createState() => _AboutTabState();
}

class _AboutTabState extends ConsumerState<_AboutTab> with AutomaticKeepAliveClientMixin {
  DogAbout? _about;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final about = await ref.read(repositoryProvider).dogAbout(widget.handle);
      if (mounted) setState(() => _about = about);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_about == null) return const LoadingView();

    final about = _about!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        if (about.bio.isNotEmpty) ...[
          Text(
            about.bio,
            style: const TextStyle(fontSize: 14, height: 1.6, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 20),
        ],
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final fact in about.facts)
              SizedBox(
                width: (MediaQuery.of(context).size.width.clamp(0, 460) - 42) / 2,
                child: _InfoChip(
                  icon: iconFromName(fact.icon),
                  label: fact.label,
                  value: fact.value,
                ),
              ),
          ],
        ),
        if (about.achievements.isNotEmpty) ...[
          const SizedBox(height: 24),
          const Text('เหรียญตรา', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          for (final achievement in about.achievements)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: AppColors.amberSoft,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(iconFromName(achievement.icon), size: 16, color: AppColors.amber),
                  ),
                  const SizedBox(width: 10),
                  Text(achievement.title, style: const TextStyle(fontSize: 13.5)),
                ],
              ),
            ),
        ],
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Avatar(url: about.ownerAvatarUrl, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('เจ้าของ', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    Text(
                      about.ownerDisplayName ?? '-',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    if ((about.ownerBio ?? '').isNotEmpty)
                      Text(
                        about.ownerBio!,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'เดินเล่นไปแล้วทั้งหมด ${about.totalWalks} ครั้ง',
          style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
        ),
      ],
    );
  }
}
