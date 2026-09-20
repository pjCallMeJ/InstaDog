import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';

/// สมัครสมาชิกพร้อม Quick Add น้องหมาตัวแรก ยิงไป /api/auth/register-with-dog ครั้งเดียว
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _displayName = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _dogNameTh = TextEditingController();
  final _dogNameEn = TextEditingController();
  final _weight = TextEditingController();

  String _gender = 'male';
  String? _breedSlug;
  bool _accepted = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_displayName, _username, _email, _password, _confirm, _dogNameTh, _dogNameEn, _weight]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    if (!_formKey.currentState!.validate()) return;
    if (_password.text != _confirm.text) {
      setState(() => _error = 'รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (!_accepted) {
      setState(() => _error = 'ต้องยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวก่อน');
      return;
    }

    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).register(
            username: _username.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            displayName: _displayName.text.trim(),
            dogNameTh: _dogNameTh.text.trim(),
            dogNameEn: _dogNameEn.text.trim(),
            breedSlug: _breedSlug,
            gender: _gender,
            weight: double.tryParse(_weight.text.trim()),
          );
      if (mounted) context.go('/profile');
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final breeds = ref.watch(breedsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/login'),
        ),
        title: const Text('สมัครสมาชิก'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.amberSoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'MVP Fast Pass — ไม่ต้องยืนยันอีเมล',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Color(0xFF8C6A32), fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 22),

                _SectionTitle('ข้อมูลเจ้าของ'),
                TextFormField(
                  controller: _displayName,
                  decoration: const InputDecoration(hintText: 'ชื่อที่แสดง เช่น คุณขวัญ'),
                  validator: _required('กรอกชื่อที่แสดง'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _username,
                  decoration: const InputDecoration(hintText: 'ชื่อผู้ใช้ (ภาษาอังกฤษ)'),
                  validator: (value) {
                    if (value == null || value.trim().length < 3) return 'ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(hintText: 'อีเมล'),
                  validator: (value) {
                    if (value == null || !value.contains('@')) return 'อีเมลไม่ถูกต้อง';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: 'รหัสผ่าน (อย่างน้อย 6 ตัว)'),
                  validator: (value) {
                    if (value == null || value.length < 6) return 'รหัสผ่านอย่างน้อย 6 ตัวอักษร';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _confirm,
                  obscureText: true,
                  decoration: const InputDecoration(hintText: 'ยืนยันรหัสผ่าน'),
                  validator: _required('ยืนยันรหัสผ่าน'),
                ),

                const SizedBox(height: 26),
                _SectionTitle('เพิ่มน้องหมาตัวแรก'),
                TextFormField(
                  controller: _dogNameTh,
                  decoration: const InputDecoration(hintText: 'ชื่อน้องหมา (ไทย) เช่น บรูนี่'),
                  validator: _required('กรอกชื่อน้องหมา'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _dogNameEn,
                  decoration: const InputDecoration(hintText: 'ชื่อน้องหมา (อังกฤษ)'),
                ),
                const SizedBox(height: 10),
                breeds.when(
                  data: (list) => DropdownButtonFormField<String>(
                    initialValue: _breedSlug,
                    isExpanded: true,
                    decoration: const InputDecoration(hintText: 'สายพันธุ์'),
                    items: list
                        .map((b) => DropdownMenuItem(value: b.slug, child: Text(b.nameTh)))
                        .toList(),
                    onChanged: (value) => setState(() => _breedSlug = value),
                  ),
                  loading: () => const LinearProgressIndicator(minHeight: 2),
                  error: (_, _) => const SizedBox.shrink(),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _gender,
                        decoration: const InputDecoration(),
                        items: const [
                          DropdownMenuItem(value: 'male', child: Text('เพศผู้')),
                          DropdownMenuItem(value: 'female', child: Text('เพศเมีย')),
                        ],
                        onChanged: (value) => setState(() => _gender = value ?? 'male'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _weight,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(hintText: 'น้ำหนัก (กก.)'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _accepted,
                      onChanged: (value) => setState(() => _accepted = value ?? false),
                      visualDensity: VisualDensity.compact,
                      side: const BorderSide(color: AppColors.accent3),
                    ),
                    const Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(top: 10),
                        child: Text(
                          'ยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว',
                          style: TextStyle(fontSize: 13, height: 1.4),
                        ),
                      ),
                    ),
                  ],
                ),

                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.dangerSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: AppColors.danger, fontSize: 13),
                    ),
                  ),
                ],

                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                        )
                      : const Text('สร้างบัญชีและเริ่มใช้งาน'),
                ),
                const SizedBox(height: 10),
                Text(
                  'สมัครแล้วระบบจะสร้างตารางดูแลและแผนโภชนาการให้น้องหมาอัตโนมัติ',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? Function(String?) _required(String message) =>
      (value) => (value == null || value.trim().isEmpty) ? message : null;
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
