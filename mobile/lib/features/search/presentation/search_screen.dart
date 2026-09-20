import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  SearchResults? _results;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// หน่วงไว้ 350ms เพื่อไม่ยิง API ทุกตัวอักษร
  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().isEmpty) {
      setState(() {
        _results = null;
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(value.trim()));
  }

  Future<void> _search(String query) async {
    try {
      final results = await ref.read(repositoryProvider).search(query);
      if (mounted) {
        setState(() {
          _results = results;
          _error = null;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = '$error';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/explore'),
        ),
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          autofocus: true,
          onChanged: _onChanged,
          decoration: const InputDecoration(
            hintText: 'ค้นหาน้องหมา เจ้าของ หรือแฮชแท็ก',
            prefixIcon: Icon(Icons.search_rounded, size: 20),
            isDense: true,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded, size: 20),
            onPressed: () {
              _controller.clear();
              _onChanged('');
            },
          ),
        ],
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (_error != null) return ErrorView(message: _error!);
    if (_loading) return const LoadingView();
    if (_results == null) {
      return const EmptyView(
        title: 'พิมพ์เพื่อค้นหา',
        message: 'ลองพิมพ์ชื่อน้องหมา ชื่อเจ้าของ หรือแฮชแท็ก',
        icon: Icons.search_rounded,
      );
    }
    if (_results!.isEmpty) {
      return const EmptyView(
        title: 'ไม่พบผลลัพธ์',
        message: 'ลองใช้คำค้นอื่นดู',
        icon: Icons.search_off_rounded,
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (_results!.dogs.isNotEmpty) ...[
          const _SectionHeader('น้องหมา'),
          for (final dog in _results!.dogs)
            ListTile(
              leading: Avatar(url: dog.avatarUrl, size: 42),
              title: Text(dog.nameTh, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('@${dog.handle} · ${dog.breedNameTh ?? ''}'),
              onTap: () => context.push('/dogs/${dog.handle}'),
            ),
        ],
        if (_results!.owners.isNotEmpty) ...[
          const _SectionHeader('เจ้าของ'),
          for (final owner in _results!.owners)
            ListTile(
              leading: Avatar(url: owner.avatarUrl, size: 42),
              title: Text(owner.displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('@${owner.username}'),
            ),
        ],
        if (_results!.hashtags.isNotEmpty) ...[
          const _SectionHeader('แฮชแท็ก'),
          for (final tag in _results!.hashtags)
            ListTile(
              leading: Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: AppColors.amberSoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.tag_rounded, color: AppColors.amber),
              ),
              title: Text('#${tag.name}', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${tag.postCount} โพสต์'),
            ),
        ],
        if (_results!.posts.isNotEmpty) ...[
          const _SectionHeader('โพสต์'),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.all(2),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 2,
              crossAxisSpacing: 2,
            ),
            itemCount: _results!.posts.length,
            itemBuilder: (context, index) {
              final post = _results!.posts[index];
              return GestureDetector(
                onTap: () => context.push('/dogs/${post.dog?.handle ?? ''}'),
                child: RemoteImage(url: post.coverUrl),
              );
            },
          ),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
            ),
      ),
    );
  }
}
