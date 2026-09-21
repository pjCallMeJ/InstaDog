import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';

const _maxMedia = 10;

const _moods = ['สดใสขี้เล่น', 'เท่คูล', 'สายกิน', 'ง่วงนอน'];

/// ไฟล์ที่เลือกไว้ เก็บเป็น bytes เพื่อให้ทำงานได้ทั้งบนเว็บและมือถือ
class _PickedImage {
  const _PickedImage({required this.bytes, required this.name});

  final Uint8List bytes;
  final String name;
}

class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key, this.embedded = false});

  /// true เมื่อแสดงเป็นแท็บกลางของ Bottom Nav (ไม่มีปุ่มย้อนกลับ)
  final bool embedded;

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _caption = TextEditingController();
  final _location = TextEditingController();
  final _hashtag = TextEditingController();
  final _picker = ImagePicker();

  final List<_PickedImage> _images = [];
  final List<String> _hashtags = [];

  String _visibility = 'public';
  String? _mood;
  String? _dogDocumentId;
  bool _publishing = false;
  bool _suggesting = false;
  List<String> _suggestions = [];

  @override
  void initState() {
    super.initState();
    _caption.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _caption.dispose();
    _location.dispose();
    _hashtag.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    if (_images.length >= _maxMedia) return;

    try {
      final files = await _picker.pickMultiImage(imageQuality: 85);
      if (files.isEmpty) return;

      final remaining = _maxMedia - _images.length;
      for (final file in files.take(remaining)) {
        final bytes = await file.readAsBytes();
        _images.add(_PickedImage(bytes: bytes, name: file.name));
      }
      if (mounted) setState(() {});
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('เลือกรูปไม่สำเร็จ: $error')),
        );
      }
    }
  }

  void _addHashtag() {
    final raw = _hashtag.text.trim().replaceAll('#', '');
    if (raw.isEmpty || _hashtags.contains(raw)) return;
    setState(() {
      _hashtags.add(raw);
      _hashtag.clear();
    });
  }

  Future<void> _suggestCaptions() async {
    setState(() => _suggesting = true);
    try {
      final suggestions = await ref.read(repositoryProvider).suggestCaptions(
            mood: _mood,
            location: _location.text.trim(),
            dogDocumentId: _dogDocumentId,
            hashtags: _hashtags,
          );
      if (!mounted) return;
      setState(() => _suggestions = suggestions);
      if (suggestions.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ยังไม่มีคำแนะนำในตอนนี้')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _suggesting = false);
    }
  }

  Future<void> _publish() async {
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('เลือกรูปอย่างน้อย 1 รูปก่อนโพสต์')),
      );
      return;
    }

    setState(() => _publishing = true);
    try {
      final repo = ref.read(repositoryProvider);

      final files = _images
          .map((image) => MultipartFile.fromBytes(image.bytes, filename: image.name))
          .toList();
      final mediaIds = await repo.uploadImages(files);

      await repo.createPost(
        mediaIds: mediaIds,
        caption: _caption.text.trim(),
        location: _location.text.trim(),
        mood: _mood,
        visibility: _visibility,
        dogDocumentId: _dogDocumentId,
        hashtags: _hashtags,
      );

      if (!mounted) return;
      setState(() {
        _images.clear();
        _hashtags.clear();
        _caption.clear();
        _location.clear();
        _mood = null;
        _suggestions = [];
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('เผยแพร่โพสต์เรียบร้อย')),
      );
      context.go('/feed');
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _publishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(meProfileProvider);
    final dogs = me.value?.dogs ?? const <DogSummary>[];
    final selectedDog = dogs.where((d) => d.documentId == _dogDocumentId).firstOrNull ??
        (dogs.isNotEmpty ? dogs.first : null);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: widget.embedded
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.canPop() ? context.pop() : context.go('/feed'),
              ),
        title: const Text('สร้างโพสต์'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _publishing ? null : _publish,
              style: TextButton.styleFrom(
                backgroundColor: AppColors.accent1,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              child: _publishing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('โพสต์', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
        children: [
          _imagePreview(),
          const SizedBox(height: 12),

          // แถวเลือกรูปพร้อมตัวนับ 1/10 ตาม mockup
          InkWell(
            onTap: _pickImages,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: Row(
                children: [
                  const Icon(Icons.photo_camera_outlined, size: 20, color: AppColors.textSecondary),
                  const SizedBox(width: 10),
                  const Text('เลือกภาพ/วิดีโอ', style: TextStyle(fontSize: 14)),
                  const Spacer(),
                  Text(
                    '${_images.length}/$_maxMedia',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
          const Divider(),

          const SizedBox(height: 8),
          TextField(
            controller: _caption,
            maxLines: 5,
            maxLength: 300,
            decoration: const InputDecoration(
              hintText: 'เขียนแคปชั่น...',
              counterText: '',
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${_caption.text.length}/300',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ),

          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _location,
                  decoration: const InputDecoration(
                    hintText: 'เพิ่มตำแหน่งที่ตั้ง',
                    prefixIcon: Icon(Icons.place_outlined, size: 18),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _hashtag,
                  onSubmitted: (_) => _addHashtag(),
                  decoration: const InputDecoration(
                    hintText: 'เพิ่มแฮชแท็ก',
                    prefixIcon: Icon(Icons.tag_rounded, size: 18),
                    isDense: true,
                  ),
                ),
              ),
              IconButton(onPressed: _addHashtag, icon: const Icon(Icons.add_rounded)),
            ],
          ),
          if (_hashtags.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final tag in _hashtags)
                    Chip(
                      label: Text('#$tag', style: const TextStyle(fontSize: 12)),
                      backgroundColor: AppColors.amberSoft,
                      side: BorderSide.none,
                      visualDensity: VisualDensity.compact,
                      onDeleted: () => setState(() => _hashtags.remove(tag)),
                    ),
                ],
              ),
            ),

          const SizedBox(height: 16),
          const Text('อารมณ์น้องหมา', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final mood in _moods)
                ChoiceChip(
                  label: Text(mood, style: const TextStyle(fontSize: 12.5)),
                  selected: _mood == mood,
                  showCheckmark: false,
                  selectedColor: AppColors.amber,
                  backgroundColor: AppColors.surface,
                  labelStyle: TextStyle(color: _mood == mood ? Colors.white : AppColors.textSecondary),
                  side: const BorderSide(color: AppColors.border),
                  onSelected: (value) => setState(() => _mood = value ? mood : null),
                ),
            ],
          ),

          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _suggesting || _publishing ? null : _suggestCaptions,
              icon: _suggesting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome_rounded, size: 18),
              label: Text(_suggesting ? 'กำลังคิดแคปชั่น...' : 'AI ช่วยเขียนแคปชั่น'),
            ),
          ),
          if (_suggestions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                children: [
                  for (final suggestion in _suggestions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () {
                          _caption.text = suggestion;
                          setState(() {});
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.amberSoft,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(suggestion, style: const TextStyle(fontSize: 13, height: 1.4)),
                        ),
                      ),
                    ),
                ],
              ),
            ),

          const SizedBox(height: 16),
          const Divider(),

          // แถวสาธารณะ และ แท็กสุนัข ตาม mockup
          _SettingRow(
            icon: Icons.public_rounded,
            title: _visibility == 'public' ? 'สาธารณะ' : 'เฉพาะผู้ติดตาม',
            onTap: () => setState(
              () => _visibility = _visibility == 'public' ? 'followers' : 'public',
            ),
          ),
          const Divider(),
          _SettingRow(
            icon: Icons.pets_rounded,
            title: 'แท็กสุนัข',
            subtitle: selectedDog?.nameTh ?? 'เลือกจากโปรไฟล์สัตว์เลี้ยง',
            onTap: dogs.isEmpty ? null : () => _pickDog(dogs),
          ),
          const Divider(),
        ],
      ),
    );
  }

  Widget _imagePreview() {
    if (_images.isEmpty) {
      return GestureDetector(
        onTap: _pickImages,
        child: Container(
          height: 220,
          decoration: BoxDecoration(
            color: AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_photo_alternate_outlined, size: 34, color: AppColors.accent2),
              SizedBox(height: 10),
              Text('แตะเพื่อเลือกรูปน้องหมา', style: TextStyle(color: AppColors.textMuted)),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 230,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _images.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final image = _images[index];
          return Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.memory(
                  image.bytes,
                  width: 230,
                  height: 230,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                right: 8,
                top: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _images.removeAt(index)),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded, size: 16, color: Colors.white),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _pickDog(List<DogSummary> dogs) async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 14),
            const Text('เลือกน้องหมา', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            for (final dog in dogs)
              ListTile(
                leading: Avatar(url: dog.avatarUrl, size: 40),
                title: Text(dog.nameTh),
                subtitle: Text('@${dog.handle}'),
                onTap: () => Navigator.pop(context, dog.documentId),
              ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );

    if (selected != null && mounted) setState(() => _dogDocumentId = selected);
  }
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppColors.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14)),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                    ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
