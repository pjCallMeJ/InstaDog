import 'package:flutter/material.dart';

import '../../../../core/models/models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/state_views.dart';

/// การ์ดโพสต์ตาม mockup
/// หัวการ์ด: avatar + handle + เวลา + ปุ่มเมนู
/// ใต้รูป: หัวใจ + จำนวน / คอมเมนต์ + จำนวน / bookmark ชิดขวา
/// แล้วตามด้วยแคปชั่นที่ขึ้นต้นด้วย handle ตัวหนา
class PostCard extends StatelessWidget {
  const PostCard({
    super.key,
    required this.post,
    required this.onToggleLike,
    required this.onToggleSave,
    required this.onOpenComments,
    required this.onOpenDog,
    this.onDelete,
  });

  final Post post;
  final VoidCallback onToggleLike;
  final VoidCallback onToggleSave;
  final VoidCallback onOpenComments;
  final VoidCallback onOpenDog;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final handle = post.dog?.handle ?? post.author?.username ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ---- หัวการ์ด ----
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
          child: Row(
            children: [
              GestureDetector(
                onTap: onOpenDog,
                child: Avatar(url: post.dog?.avatarUrl ?? post.author?.avatarUrl, size: 36),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: onOpenDog,
                      child: Text(
                        handle,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Text(
                      post.timeAgo,
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, size: 20, color: AppColors.textSecondary),
                onSelected: (value) {
                  if (value == 'delete') onDelete?.call();
                },
                itemBuilder: (context) => [
                  if (post.isMine && onDelete != null)
                    const PopupMenuItem(
                      value: 'delete',
                      child: Text('ลบโพสต์', style: TextStyle(color: AppColors.danger)),
                    ),
                  const PopupMenuItem(value: 'report', child: Text('รายงานโพสต์')),
                ],
              ),
            ],
          ),
        ),

        // ---- รูป ----
        GestureDetector(
          onDoubleTap: post.likedByMe ? null : onToggleLike,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    RemoteImage(url: post.coverUrl),
                    if (post.mediaCountLabel != null)
                      Positioned(
                        right: 10,
                        top: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            post.mediaCountLabel!,
                            style: const TextStyle(color: Colors.white, fontSize: 11),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // ---- แถวปุ่ม ----
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
          child: Row(
            children: [
              _ActionButton(
                icon: post.likedByMe ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                color: post.likedByMe ? AppColors.like : AppColors.text,
                label: post.likeCountText,
                onTap: onToggleLike,
              ),
              const SizedBox(width: 18),
              _ActionButton(
                icon: Icons.mode_comment_outlined,
                color: AppColors.text,
                label: post.commentCountText,
                onTap: onOpenComments,
              ),
              const Spacer(),
              IconButton(
                onPressed: onToggleSave,
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: Icon(
                  post.savedByMe ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                  size: 22,
                  color: AppColors.text,
                ),
              ),
            ],
          ),
        ),

        // ---- แคปชั่น ----
        if (post.caption.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
            child: _Caption(handle: handle, caption: post.caption),
          ),

        if (post.location != null && post.location!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
            child: Row(
              children: [
                const Icon(Icons.place_outlined, size: 13, color: AppColors.textMuted),
                const SizedBox(width: 3),
                Expanded(
                  child: Text(
                    post.location!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                  ),
                ),
              ],
            ),
          ),

        if (post.commentCount > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
            child: GestureDetector(
              onTap: onOpenComments,
              child: Text(
                'ดูความคิดเห็นทั้ง ${post.commentCountText} รายการ',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ),
          ),

        const SizedBox(height: 16),
        const Divider(),
      ],
    );
  }
}

/// แคปชั่นแสดง handle ตัวหนานำหน้า และไฮไลต์แฮชแท็กเป็นสีเน้น
class _Caption extends StatelessWidget {
  const _Caption({required this.handle, required this.caption});

  final String handle;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final spans = <TextSpan>[
      TextSpan(
        text: '$handle ',
        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.text),
      ),
    ];

    for (final word in caption.split(RegExp(r'(?=\s)'))) {
      final isTag = word.trimLeft().startsWith('#');
      spans.add(
        TextSpan(
          text: word,
          style: TextStyle(
            color: isTag ? AppColors.amber : AppColors.textSecondary,
            fontWeight: isTag ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      );
    }

    return RichText(
      text: TextSpan(
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 13.5, height: 1.5),
        children: spans,
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.text,
            ),
          ),
        ],
      ),
    );
  }
}

extension on Post {
  /// ป้าย 1/3 มุมขวาบนเมื่อโพสต์มีหลายรูป
  String? get mediaCountLabel => media.length > 1 ? '1/${media.length}' : null;
}
