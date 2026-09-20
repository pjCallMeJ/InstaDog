import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_icons.dart';
import '../../../shared/widgets/state_views.dart';
import 'widgets/explore_grid.dart';

/// หน้าสำรวจ — ต้นแบบของ pattern TabController ในโปรเจกต์นี้
///
/// จำนวนแท็บไม่ได้ hard-code แต่มาจาก /api/explore/categories
/// TabController จึงต้องถูกสร้างใหม่หลังข้อมูลมาถึง และ dispose ตัวเก่าทิ้ง
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen>
    with TickerProviderStateMixin {
  TabController? _controller;
  int _controllerLength = 0;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  /// สร้าง TabController ให้ยาวเท่าจำนวนหมวดที่เพิ่งโหลดมา
  void _syncController(int length) {
    if (_controllerLength == length && _controller != null) return;

    _controller?.dispose();
    _controller = TabController(length: length, vsync: this);
    _controllerLength = length;
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(exploreCategoriesProvider);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const _SearchField(),
            Expanded(
              child: categories.when(
                loading: () => const LoadingView(),
                error: (error, _) => ErrorView(
                  message: '$error',
                  onRetry: () => ref.invalidate(exploreCategoriesProvider),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return const EmptyView(
                      title: 'ยังไม่มีหมวดให้สำรวจ',
                      icon: Icons.explore_outlined,
                    );
                  }

                  _syncController(list.length);
                  return Column(
                    children: [
                      _CategoryTabBar(controller: _controller!, categories: list),
                      Expanded(
                        child: TabBarView(
                          controller: _controller,
                          children: [
                            for (final category in list)
                              ExploreGrid(
                                key: ValueKey(category.slug),
                                categorySlug: category.slug,
                              ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// แถบชิปแคปซูลโทนอำพัน เลื่อนแนวนอนได้ ไม่ใช้เส้นขีดใต้แบบ TabBar มาตรฐาน
class _CategoryTabBar extends StatelessWidget {
  const _CategoryTabBar({required this.controller, required this.categories});

  final TabController controller;
  final List<ExploreCategory> categories;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return SizedBox(
          height: 48,
          child: TabBar(
            controller: controller,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            indicator: const BoxDecoration(),
            indicatorColor: Colors.transparent,
            dividerColor: Colors.transparent,
            overlayColor: WidgetStateProperty.all(Colors.transparent),
            labelPadding: const EdgeInsets.symmetric(horizontal: 4),
            tabs: [
              for (var i = 0; i < categories.length; i++)
                _CategoryChip(
                  category: categories[i],
                  selected: controller.index == i,
                ),
            ],
          ),
        );
      },
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.category, required this.selected});

  final ExploreCategory category;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Tab(
      height: 36,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.amber : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? AppColors.amber : AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              iconFromName(category.icon),
              size: 15,
              color: selected ? Colors.white : AppColors.textSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              category.nameTh,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? Colors.white : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
      child: GestureDetector(
        onTap: () => context.push('/search'),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Row(
            children: [
              Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
              SizedBox(width: 10),
              Text(
                'ค้นหาน้องหมา เจ้าของ หรือแฮชแท็ก',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
