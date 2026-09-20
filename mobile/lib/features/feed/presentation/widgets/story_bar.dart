import 'package:flutter/material.dart';

import '../../../../core/models/models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/state_views.dart';

/// แถบสตอรี่วงกลมบนหัวฟีด ช่องแรกคือ "สร้างสตอรี่" ตาม mockup
class StoryBar extends StatelessWidget {
  const StoryBar({
    super.key,
    required this.feed,
    required this.onCreate,
    required this.onOpen,
  });

  final StoryFeed feed;
  final VoidCallback onCreate;
  final void Function(StoryGroup group) onOpen;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 104,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        itemCount: feed.groups.length + 1,
        separatorBuilder: (context, index) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _StoryCircle(
              label: 'สร้างสตอรี่',
              imageUrl: feed.self?.avatarUrl,
              showAddBadge: true,
              hasUnseen: false,
              onTap: onCreate,
            );
          }

          final group = feed.groups[index - 1];
          return _StoryCircle(
            label: group.dog.nameTh,
            imageUrl: group.dog.avatarUrl,
            hasUnseen: group.hasUnseen,
            onTap: () => onOpen(group),
          );
        },
      ),
    );
  }
}

class _StoryCircle extends StatelessWidget {
  const _StoryCircle({
    required this.label,
    required this.imageUrl,
    required this.hasUnseen,
    required this.onTap,
    this.showAddBadge = false,
  });

  final String label;
  final String? imageUrl;
  final bool hasUnseen;
  final VoidCallback onTap;
  final bool showAddBadge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 66,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 62,
                  height: 62,
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    // วงแหวนไล่สีเฉพาะสตอรี่ที่ยังไม่ดู
                    gradient: hasUnseen ? AppColors.storyRing : null,
                    border: hasUnseen ? null : Border.all(color: AppColors.divider, width: 2),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(color: AppColors.bg, shape: BoxShape.circle),
                    child: ClipOval(child: RemoteImage(url: imageUrl)),
                  ),
                ),
                if (showAddBadge)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: AppColors.accent1,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.bg, width: 2),
                      ),
                      child: const Icon(Icons.add_rounded, size: 12, color: Colors.white),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
