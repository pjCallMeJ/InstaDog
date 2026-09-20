import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../shared/widgets/state_views.dart';
import 'widgets/comments_sheet.dart';
import 'widgets/feed_header.dart';
import 'widgets/post_card.dart';
import 'widgets/story_bar.dart';
import 'widgets/story_viewer.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  List<Post>? _posts;
  StoryFeed? _stories;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final repo = ref.read(repositoryProvider);
      final results = await Future.wait([repo.feed(), repo.stories()]);
      if (!mounted) return;
      setState(() {
        _posts = results[0] as List<Post>;
        _stories = results[1] as StoryFeed;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  /// สลับหัวใจแบบ optimistic แล้วย้อนกลับถ้า API ล้มเหลว
  Future<void> _toggleLike(Post post) async {
    final index = _posts!.indexWhere((p) => p.documentId == post.documentId);
    if (index < 0) return;

    final original = _posts![index];
    final optimisticCount = original.likedByMe ? original.likeCount - 1 : original.likeCount + 1;
    setState(() {
      _posts![index] = original.copyWith(
        likedByMe: !original.likedByMe,
        likeCount: optimisticCount < 0 ? 0 : optimisticCount,
        likeCountText: _compact(optimisticCount < 0 ? 0 : optimisticCount),
      );
    });

    try {
      final result = await ref.read(repositoryProvider).toggleLike(post.documentId);
      if (!mounted) return;
      setState(() {
        _posts![index] = _posts![index].copyWith(
          likedByMe: result.liked,
          likeCount: result.likeCount,
          likeCountText: _compact(result.likeCount),
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _posts![index] = original);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _toggleSave(Post post) async {
    final index = _posts!.indexWhere((p) => p.documentId == post.documentId);
    if (index < 0) return;

    final original = _posts![index];
    setState(() => _posts![index] = original.copyWith(savedByMe: !original.savedByMe));

    try {
      final saved = await ref.read(repositoryProvider).toggleSave(post.documentId);
      if (!mounted) return;
      setState(() => _posts![index] = _posts![index].copyWith(savedByMe: saved));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(saved ? 'บันทึกโพสต์แล้ว' : 'นำออกจากรายการบันทึกแล้ว')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _posts![index] = original);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _openComments(Post post) async {
    final newCount = await CommentsSheet.show(context, post.documentId);
    if (newCount == null || !mounted) return;

    final index = _posts!.indexWhere((p) => p.documentId == post.documentId);
    if (index < 0) return;
    setState(() {
      _posts![index] = _posts![index].copyWith(
        commentCount: newCount,
        commentCountText: _compact(newCount),
      );
    });
  }

  Future<void> _deletePost(Post post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ลบโพสต์นี้?'),
        content: const Text('เมื่อลบแล้วจะกู้คืนไม่ได้'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('ยกเลิก')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('ลบ')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(repositoryProvider).deletePost(post.documentId);
      if (!mounted) return;
      setState(() => _posts!.removeWhere((p) => p.documentId == post.documentId));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  String _compact(int value) {
    if (value < 1000) return '$value';
    final k = value / 1000;
    return '${k % 1 == 0 ? k.toStringAsFixed(0) : k.toStringAsFixed(1)}K';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const FeedHeader(),
      body: _body(),
    );
  }

  Widget _body() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_posts == null) return const LoadingView(message: 'กำลังโหลดฟีด...');

    return RefreshIndicator(
      onRefresh: _load,
      color: const Color(0xFF6D5F57),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 20),
        itemCount: (_posts!.length) + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            if (_stories == null) return const SizedBox(height: 104);
            return Column(
              children: [
                StoryBar(
                  feed: _stories!,
                  onCreate: () => context.push('/create-post'),
                  onOpen: (group) => StoryViewer.show(context, group).then((_) => _load()),
                ),
                const Divider(),
              ],
            );
          }

          final post = _posts![index - 1];
          return PostCard(
            post: post,
            onToggleLike: () => _toggleLike(post),
            onToggleSave: () => _toggleSave(post),
            onOpenComments: () => _openComments(post),
            onOpenDog: () => context.push('/dogs/${post.dog?.handle ?? ''}'),
            onDelete: post.isMine ? () => _deletePost(post) : null,
          );
        },
      ),
    );
  }
}
