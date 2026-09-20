import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/models/models.dart';
import '../../../../core/providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/state_views.dart';

/// กริดรูปของแท็บหนึ่งหมวด โหลดข้อมูลของตัวเองเมื่อถูกสร้างครั้งแรก
class ExploreGrid extends ConsumerStatefulWidget {
  const ExploreGrid({super.key, required this.categorySlug});

  final String categorySlug;

  @override
  ConsumerState<ExploreGrid> createState() => _ExploreGridState();
}

class _ExploreGridState extends ConsumerState<ExploreGrid>
    with AutomaticKeepAliveClientMixin {
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
    setState(() => _error = null);
    try {
      final posts = await ref.read(repositoryProvider).explore(widget.categorySlug);
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
      return const EmptyView(
        title: 'ยังไม่มีโพสต์ในหมวดนี้',
        message: 'ลองเลือกหมวดอื่น หรือเป็นคนแรกที่โพสต์เลย',
        icon: Icons.photo_library_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent1,
      child: GridView.builder(
        padding: const EdgeInsets.all(2),
        physics: const AlwaysScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          mainAxisSpacing: 2,
          crossAxisSpacing: 2,
        ),
        itemCount: _posts!.length,
        itemBuilder: (context, index) {
          final post = _posts![index];
          return GestureDetector(
            onTap: () => context.push('/dogs/${post.dog?.handle ?? ''}'),
            child: Stack(
              fit: StackFit.expand,
              children: [
                RemoteImage(url: post.coverUrl),
                if (post.media.length > 1)
                  const Positioned(
                    right: 5,
                    top: 5,
                    child: Icon(Icons.collections_rounded, size: 15, color: Colors.white),
                  ),
                Positioned(
                  left: 5,
                  bottom: 5,
                  child: Row(
                    children: [
                      const Icon(Icons.favorite_rounded, size: 12, color: Colors.white),
                      const SizedBox(width: 3),
                      Text(
                        post.likeCountText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          shadows: [Shadow(blurRadius: 3, color: Colors.black54)],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
