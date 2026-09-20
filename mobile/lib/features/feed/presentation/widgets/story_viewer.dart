import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/models.dart';
import '../../../../core/providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/state_views.dart';

/// ดูสตอรี่เต็มจอพร้อม progress bar ด้านบน แตะซ้าย/ขวาเพื่อเลื่อน
class StoryViewer extends ConsumerStatefulWidget {
  const StoryViewer({super.key, required this.group});

  final StoryGroup group;

  static Future<void> show(BuildContext context, StoryGroup group) {
    return Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (context, _, _) => StoryViewer(group: group),
      ),
    );
  }

  @override
  ConsumerState<StoryViewer> createState() => _StoryViewerState();
}

class _StoryViewerState extends ConsumerState<StoryViewer> with SingleTickerProviderStateMixin {
  static const _duration = Duration(seconds: 5);

  late final AnimationController _progress;
  final _replyController = TextEditingController();
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _progress = AnimationController(vsync: this, duration: _duration)
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed) _next();
      });
    _start();
  }

  @override
  void dispose() {
    _progress.dispose();
    _replyController.dispose();
    super.dispose();
  }

  void _start() {
    _progress.forward(from: 0);
    final story = widget.group.items[_index];
    if (!story.isSeen) {
      // ทำเครื่องหมายว่าดูแล้วแบบ fire-and-forget ไม่ให้บล็อกการเล่น
      unawaited(ref.read(repositoryProvider).markStorySeen(story.documentId).catchError((_) {}));
    }
  }

  void _next() {
    if (_index >= widget.group.items.length - 1) {
      Navigator.of(context).maybePop();
      return;
    }
    setState(() => _index += 1);
    _start();
  }

  void _previous() {
    if (_index == 0) {
      _progress.forward(from: 0);
      return;
    }
    setState(() => _index -= 1);
    _start();
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty) return;

    _replyController.clear();
    FocusScope.of(context).unfocus();
    try {
      await ref.read(repositoryProvider).replyToStory(widget.group.items[_index].documentId, text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('ส่งข้อความแล้ว')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final story = widget.group.items[_index];
    final width = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          RemoteImage(url: story.imageUrl, fit: BoxFit.contain),

          // แตะครึ่งซ้าย = ย้อนกลับ ครึ่งขวา = ถัดไป
          Row(
            children: [
              Expanded(child: GestureDetector(onTap: _previous, behavior: HitTestBehavior.opaque)),
              Expanded(child: GestureDetector(onTap: _next, behavior: HitTestBehavior.opaque)),
            ],
          ),

          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Row(
                    children: List.generate(widget.group.items.length, (i) {
                      return Expanded(
                        child: Container(
                          height: 2.5,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: Colors.white24,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: AnimatedBuilder(
                            animation: _progress,
                            builder: (context, _) {
                              final value = i < _index
                                  ? 1.0
                                  : i == _index
                                      ? _progress.value
                                      : 0.0;
                              return FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: value,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: Row(
                    children: [
                      Avatar(url: widget.group.dog.avatarUrl, size: 32),
                      const SizedBox(width: 10),
                      Text(
                        widget.group.dog.nameTh,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        story.timeAgo,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white),
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (story.caption != null && story.caption!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    child: Text(
                      story.caption!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                    ),
                  ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    14,
                    8,
                    14,
                    14 + MediaQuery.of(context).viewInsets.bottom,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          width: width,
                          child: TextField(
                            controller: _replyController,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            onSubmitted: (_) => _sendReply(),
                            decoration: InputDecoration(
                              hintText: 'ตอบกลับสตอรี่...',
                              hintStyle: const TextStyle(color: Colors.white54, fontSize: 14),
                              filled: true,
                              fillColor: Colors.white12,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(999),
                                borderSide: const BorderSide(color: Colors.white24),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(999),
                                borderSide: const BorderSide(color: Colors.white24),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(999),
                                borderSide: const BorderSide(color: AppColors.amber),
                              ),
                            ),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.favorite_rounded, color: AppColors.like),
                        onPressed: () {
                          _replyController.text = '❤️';
                          _sendReply();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
