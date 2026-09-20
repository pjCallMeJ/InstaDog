import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';

/// แก้ไขได้ทั้งข้อมูลเจ้าของและข้อมูลน้องหมาตัวหลักในหน้าเดียว
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _displayName = TextEditingController();
  final _ownerBio = TextEditingController();
  final _dogNameTh = TextEditingController();
  final _dogNameEn = TextEditingController();
  final _dogBio = TextEditingController();
  final _weight = TextEditingController();

  bool _initialised = false;
  bool _isPublic = true;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_displayName, _ownerBio, _dogNameTh, _dogNameEn, _dogBio, _weight]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save(String? dogHandle) async {
    setState(() => _saving = true);
    try {
      final repo = ref.read(repositoryProvider);

      await repo.updateMyProfile(
        displayName: _displayName.text.trim(),
        bio: _ownerBio.text.trim(),
        isPublic: _isPublic,
      );

      if (dogHandle != null) {
        await repo.updateDog(
          dogHandle,
          nameTh: _dogNameTh.text.trim(),
          nameEn: _dogNameEn.text.trim(),
          bio: _dogBio.text.trim(),
          weight: double.tryParse(_weight.text.trim()),
        );
      }

      ref.invalidate(meProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('บันทึกโปรไฟล์เรียบร้อย')),
      );
      context.pop();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(meProfileProvider);

    return Scaffold(
      appBar: AppBar(
        leading: TextButton(
          onPressed: context.pop,
          child: const Text('ยกเลิก', style: TextStyle(fontSize: 14)),
        ),
        leadingWidth: 72,
        title: const Text('แก้ไขโปรไฟล์'),
        actions: [
          TextButton(
            onPressed: _saving ? null : () => _save(me.value?.primaryDog?.handle),
            child: _saving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('บันทึก', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          ),
        ],
      ),
      body: me.when(
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          message: '$error',
          onRetry: () => ref.invalidate(meProfileProvider),
        ),
        data: (profile) {
          if (!_initialised) {
            _displayName.text = profile.displayName;
            _ownerBio.text = profile.bio ?? '';
            _isPublic = profile.isPublic;
            _dogNameTh.text = profile.primaryDog?.nameTh ?? '';
            _dogNameEn.text = profile.primaryDog?.nameEn ?? '';
            _initialised = true;
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            children: [
              Center(
                child: Column(
                  children: [
                    Avatar(url: profile.avatarUrl, size: 84),
                    TextButton(
                      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('การเปลี่ยนรูปโปรไฟล์จะมาในรุ่นถัดไป')),
                      ),
                      child: const Text('เปลี่ยนรูปโปรไฟล์'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              const _Label('ข้อมูลเจ้าของ'),
              TextField(
                controller: _displayName,
                decoration: const InputDecoration(hintText: 'ชื่อที่แสดง'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _ownerBio,
                maxLines: 3,
                maxLength: 150,
                decoration: const InputDecoration(hintText: 'แนะนำตัวสั้น ๆ'),
              ),
              SwitchListTile(
                value: _isPublic,
                onChanged: (value) => setState(() => _isPublic = value),
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppColors.accent1,
                title: const Text('โปรไฟล์สาธารณะ', style: TextStyle(fontSize: 14)),
                subtitle: Text(
                  _isPublic ? 'ทุกคนเห็นโพสต์ของคุณได้' : 'เฉพาะผู้ติดตามที่อนุมัติแล้ว',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ),

              const SizedBox(height: 14),
              const _Label('ข้อมูลน้องหมา'),
              TextField(
                controller: _dogNameTh,
                decoration: const InputDecoration(hintText: 'ชื่อ (ไทย)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _dogNameEn,
                decoration: const InputDecoration(hintText: 'ชื่อ (อังกฤษ)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _weight,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(hintText: 'น้ำหนัก (กก.)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _dogBio,
                maxLines: 3,
                maxLength: 200,
                decoration: const InputDecoration(hintText: 'แนะนำน้องหมา'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 6),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
