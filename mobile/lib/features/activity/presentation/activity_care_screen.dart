import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_icons.dart';
import '../../../shared/widgets/state_views.dart';

const _categories = [
  ('food', 'อาหาร'),
  ('walk', 'เดินเล่น'),
  ('groom', 'ดูแลขน'),
  ('health', 'สุขภาพ'),
];

class ActivityCareScreen extends ConsumerStatefulWidget {
  const ActivityCareScreen({super.key});

  @override
  ConsumerState<ActivityCareScreen> createState() => _ActivityCareScreenState();
}

class _ActivityCareScreenState extends ConsumerState<ActivityCareScreen> {
  final _note = TextEditingController();

  TodayActivity? _today;
  List<DayActivity>? _week;
  List<CareRoutine>? _routines;
  List<WalkLog> _walks = const [];
  CareInsight? _insight;
  String? _error;
  bool _savingNote = false;

  // ตัวจับเวลาเดินเล่นอยู่ฝั่งแอป ค่อยส่งยอดรวมให้เซิร์ฟเวอร์ตอนกดหยุด
  Timer? _timer;
  String? _walkId;
  int _elapsedSec = 0;

  bool get _walking => _walkId != null;
  int get _liveSteps => (_elapsedSec * 1.6).round();
  double get _liveKm => double.parse((_liveSteps * 0.00065).toStringAsFixed(2));
  int get _liveCalories => (_liveSteps * 0.045).round();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _note.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final repo = ref.read(repositoryProvider);
      final results = await Future.wait([
        repo.todayActivity(),
        repo.weekActivity(),
        repo.careRoutines(),
        repo.careInsight(),
        repo.walkHistory(),
      ]);
      if (!mounted) return;
      final today = results[0] as TodayActivity;
      setState(() {
        _today = today;
        _week = results[1] as List<DayActivity>;
        _routines = results[2] as List<CareRoutine>;
        _insight = results[3] as CareInsight;
        _walks = results[4] as List<WalkLog>;
        if (_note.text != today.note) _note.text = today.note;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _toggleWalk() async {
    final repo = ref.read(repositoryProvider);

    if (_walking) {
      _timer?.cancel();
      final id = _walkId!;
      final duration = _elapsedSec;
      setState(() {
        _walkId = null;
        _elapsedSec = 0;
      });

      final note = await _askNote(
        title: 'โน้ตการเดินเล่น',
        hint: 'เช่น น้องตื่นเต้นตอนเจอเพื่อนหมา',
      );

      try {
        await repo.stopWalk(
          id,
          durationSec: duration,
          steps: (duration * 1.6).round(),
          distanceKm: double.parse(((duration * 1.6) * 0.00065).toStringAsFixed(2)),
          calories: ((duration * 1.6) * 0.045).round(),
          note: note,
        );
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('บันทึกการเดินเล่นเรียบร้อย')),
          );
        }
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
        }
      }
      return;
    }

    try {
      final id = await repo.startWalk();
      if (!mounted) return;
      setState(() {
        _walkId = id;
        _elapsedSec = 0;
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsedSec += 1);
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _saveNote() async {
    setState(() => _savingNote = true);
    try {
      await ref.read(repositoryProvider).saveTodayNote(_note.text.trim());
      if (!mounted) return;
      setState(() {
        final today = _today;
        if (today != null) {
          _today = TodayActivity(
            steps: today.steps,
            stepGoal: today.stepGoal,
            progress: today.progress,
            distanceKm: today.distanceKm,
            calories: today.calories,
            note: _note.text.trim(),
            activeWalkId: today.activeWalkId,
          );
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('บันทึกโน้ตวันนี้แล้ว')),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _savingNote = false);
    }
  }

  Future<void> _toggleRoutine(CareRoutine routine) async {
    final index = _routines!.indexWhere((r) => r.documentId == routine.documentId);
    if (index < 0) return;

    final original = _routines![index];
    setState(() => _routines![index] = original.copyWith(isCompleted: !original.isCompleted));

    try {
      final completed = await ref.read(repositoryProvider).toggleCareRoutine(routine.documentId);
      if (!mounted) return;
      setState(() => _routines![index] = _routines![index].copyWith(isCompleted: completed));
      final insight = await ref.read(repositoryProvider).careInsight();
      if (mounted) setState(() => _insight = insight);
    } catch (error) {
      if (!mounted) return;
      setState(() => _routines![index] = original);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  Future<void> _addRoutine() async {
    final draft = await _routineForm();
    if (draft == null) return;
    try {
      final created = await ref.read(repositoryProvider).createCareRoutine(
            title: draft.title,
            scheduledTime: draft.scheduledTime,
            category: draft.category,
          );
      if (!mounted) return;
      setState(() => _routines = [...?_routines, created]);
      final insight = await ref.read(repositoryProvider).careInsight();
      if (mounted) setState(() => _insight = insight);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _editRoutine(CareRoutine routine) async {
    final draft = await _routineForm(existing: routine);
    if (draft == null) return;
    final index = _routines!.indexWhere((r) => r.documentId == routine.documentId);
    if (index < 0) return;
    try {
      final updated = await ref.read(repositoryProvider).updateCareRoutine(
            routine.documentId,
            title: draft.title,
            scheduledTime: draft.scheduledTime,
            category: draft.category,
          );
      if (!mounted) return;
      setState(() {
        _routines![index] = updated.copyWith(isCompleted: _routines![index].isCompleted);
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _deleteRoutine(CareRoutine routine) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ลบรายการดูแล?'),
        content: Text('ต้องการลบ “${routine.title}” ออกจากตารางวันนี้'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('ยกเลิก')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.like),
            child: const Text('ลบ'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(repositoryProvider).deleteCareRoutine(routine.documentId);
      if (!mounted) return;
      setState(() => _routines = _routines!.where((r) => r.documentId != routine.documentId).toList());
      final insight = await ref.read(repositoryProvider).careInsight();
      if (mounted) setState(() => _insight = insight);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<String?> _askNote({required String title, String hint = ''}) async {
    if (!mounted) return null;
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 500,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, ''), child: const Text('ข้าม')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('บันทึก'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<({String title, String scheduledTime, String category})?> _routineForm({
    CareRoutine? existing,
  }) async {
    final title = TextEditingController(text: existing?.title ?? '');
    final time = TextEditingController(text: existing?.scheduledTime ?? '');
    var category = existing?.category ?? 'health';

    final result = await showDialog<({String title, String scheduledTime, String category})>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: Text(existing == null ? 'เพิ่มรายการดูแล' : 'แก้ไขรายการดูแล'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: title,
                    maxLength: 80,
                    decoration: const InputDecoration(
                      labelText: 'ชื่องาน',
                      hintText: 'เช่น อาหารเช้า + วิตามิน',
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: time,
                    decoration: InputDecoration(
                      labelText: 'เวลา',
                      hintText: '07:30 น.',
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.schedule_rounded),
                        onPressed: () async {
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: TimeOfDay.now(),
                          );
                          if (picked == null) return;
                          time.text =
                              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')} น.';
                          setDialogState(() {});
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text('หมวด', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    children: [
                      for (final item in _categories)
                        ChoiceChip(
                          label: Text(item.$2, style: const TextStyle(fontSize: 12)),
                          selected: category == item.$1,
                          showCheckmark: false,
                          selectedColor: AppColors.amber,
                          labelStyle: TextStyle(
                            color: category == item.$1 ? Colors.white : AppColors.textSecondary,
                          ),
                          onSelected: (_) => setDialogState(() => category = item.$1),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('ยกเลิก')),
              FilledButton(
                onPressed: () {
                  final name = title.text.trim();
                  if (name.isEmpty) return;
                  Navigator.pop(context, (
                    title: name,
                    scheduledTime: time.text.trim(),
                    category: category,
                  ));
                },
                child: Text(existing == null ? 'เพิ่ม' : 'บันทึก'),
              ),
            ],
          );
        },
      ),
    );
    title.dispose();
    time.dispose();
    return result;
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _formatWalkWhen(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null || iso.isEmpty) return '';
    final d = dt.day.toString().padLeft(2, '0');
    final mo = dt.month.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    return '$d/$mo $h:$mi';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/feed'),
        ),
        title: const Text('กิจกรรมและการดูแล'),
      ),
      body: _body(),
    );
  }

  Widget _body() {
    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_today == null || _week == null || _routines == null) return const LoadingView();

    final today = _today!;
    final steps = _walking ? today.steps + _liveSteps : today.steps;
    final distance = _walking ? today.distanceKm + _liveKm : today.distanceKm;
    final calories = _walking ? today.calories + _liveCalories : today.calories;
    final progress = (steps / today.stepGoal).clamp(0.0, 1.0);

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.accent1,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          // ---- วงแหวนเป้าหมายวันนี้ ----
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                SizedBox(
                  width: 168,
                  height: 168,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 168,
                        height: 168,
                        child: CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 12,
                          strokeCap: StrokeCap.round,
                          backgroundColor: AppColors.surfaceAlt,
                          valueColor: const AlwaysStoppedAnimation(AppColors.amber),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$steps',
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 32,
                                ),
                          ),
                          Text(
                            'จาก ${today.stepGoal} ก้าว',
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    _Metric(label: 'ระยะทาง', value: '${distance.toStringAsFixed(2)} กม.'),
                    _Metric(label: 'แคลอรี', value: '$calories kcal'),
                    _Metric(
                      label: 'เวลาเดิน',
                      value: _walking ? _formatDuration(_elapsedSec) : '--:--',
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _toggleWalk,
                  style: FilledButton.styleFrom(
                    backgroundColor: _walking ? AppColors.like : AppColors.accent1,
                  ),
                  icon: Icon(_walking ? Icons.stop_rounded : Icons.play_arrow_rounded),
                  label: Text(_walking ? 'หยุดบันทึกการเดินเล่น' : 'เริ่มบันทึกการเดินเล่น'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),
          const _SectionTitle('โน้ตวันนี้'),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _note,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    hintText: 'จดอาการ อารมณ์ หรือสิ่งที่สังเกตวันนี้',
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _savingNote ? null : _saveNote,
                    child: _savingNote
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('บันทึกโน้ต'),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),
          const _SectionTitle('แนวโน้มสัปดาห์นี้'),
          Container(
            height: 160,
            padding: const EdgeInsets.fromLTRB(14, 18, 14, 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: _WeekChart(days: _week!),
          ),

          if (_insight != null) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.amberSoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.auto_awesome_rounded, size: 20, color: AppColors.amber),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _insight!.title,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _insight!.message,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: Color(0xFF6B5533),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 18),
          _SectionTitle(
            'ตารางดูแลวันนี้',
            trailing: '${_routines!.where((r) => r.isCompleted).length}/${_routines!.length}',
            action: IconButton(
              tooltip: 'เพิ่มรายการ',
              onPressed: _addRoutine,
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.add_rounded),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: _routines!.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
                    child: Column(
                      children: [
                        const Text(
                          'ยังไม่มีรายการดูแล',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                        TextButton.icon(
                          onPressed: _addRoutine,
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('เพิ่มรายการแรก'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      for (var i = 0; i < _routines!.length; i++) ...[
                        if (i > 0) const Divider(height: 1, indent: 56),
                        _RoutineTile(
                          routine: _routines![i],
                          onToggle: () => _toggleRoutine(_routines![i]),
                          onEdit: () => _editRoutine(_routines![i]),
                          onDelete: () => _deleteRoutine(_routines![i]),
                        ),
                      ],
                    ],
                  ),
          ),

          const SizedBox(height: 18),
          const _SectionTitle('ประวัติการเดินเล่น'),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: _walks.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 22),
                    child: Text(
                      'ยังไม่มีบันทึกการเดินเล่น',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  )
                : Column(
                    children: [
                      for (var i = 0; i < _walks.length; i++) ...[
                        if (i > 0) const Divider(height: 1, indent: 56),
                        _WalkTile(
                          walk: _walks[i],
                          when: _formatWalkWhen(_walks[i].startedAt),
                          duration: _formatDuration(_walks[i].durationSec),
                        ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

/// กราฟแท่ง 7 วัน วาดเองเพราะต้องการแค่แท่งกับป้ายวัน
class _WeekChart extends StatelessWidget {
  const _WeekChart({required this.days});

  final List<DayActivity> days;

  @override
  Widget build(BuildContext context) {
    final maxSteps = days.fold<int>(1, (max, d) => math.max(max, d.steps));

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (final day in days)
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  day.steps >= 1000 ? '${(day.steps / 1000).toStringAsFixed(1)}k' : '${day.steps}',
                  style: const TextStyle(fontSize: 9.5, color: AppColors.textMuted),
                ),
                const SizedBox(height: 4),
                Container(
                  height: (day.steps / maxSteps) * 78,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: day.steps >= day.stepGoal ? AppColors.success : AppColors.accent3,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  day.weekdayTh,
                  style: const TextStyle(fontSize: 10.5, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _RoutineTile extends StatelessWidget {
  const _RoutineTile({
    required this.routine,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
  });

  final CareRoutine routine;
  final VoidCallback onToggle;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: routine.isCompleted ? AppColors.success.withValues(alpha: 0.18) : AppColors.surfaceAlt,
                shape: BoxShape.circle,
              ),
              child: Icon(
                iconFromName(routine.icon),
                size: 16,
                color: routine.isCompleted ? AppColors.success : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    routine.title,
                    style: TextStyle(
                      fontSize: 14,
                      // ขีดฆ่าเมื่อทำเสร็จแล้ว
                      decoration: routine.isCompleted ? TextDecoration.lineThrough : null,
                      color: routine.isCompleted ? AppColors.textMuted : AppColors.text,
                    ),
                  ),
                  Text(
                    routine.scheduledTime,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            Icon(
              routine.isCompleted
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: routine.isCompleted ? AppColors.success : AppColors.accent3,
              size: 22,
            ),
            PopupMenuButton<String>(
              tooltip: 'จัดการรายการ',
              onSelected: (value) {
                if (value == 'edit') onEdit();
                if (value == 'delete') onDelete();
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('แก้ไข')),
                PopupMenuItem(value: 'delete', child: Text('ลบ')),
              ],
              icon: const Icon(Icons.more_vert_rounded, size: 20, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _WalkTile extends StatelessWidget {
  const _WalkTile({
    required this.walk,
    required this.when,
    required this.duration,
  });

  final WalkLog walk;
  final String when;
  final String duration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: const BoxDecoration(
              color: AppColors.surfaceAlt,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.directions_walk_rounded, size: 16, color: AppColors.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  when.isEmpty ? 'เดินเล่น' : when,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '$duration · ${walk.steps} ก้าว · ${walk.distanceKm.toStringAsFixed(2)} กม.',
                  style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                ),
                if (walk.note.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(walk.note, style: const TextStyle(fontSize: 13, height: 1.4)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text, {this.trailing, this.action});

  final String text;
  final String? trailing;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 2),
      child: Row(
        children: [
          Text(
            text,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const Spacer(),
          if (trailing != null)
            Text(trailing!, style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted)),
          ?action,
        ],
      ),
    );
  }
}
