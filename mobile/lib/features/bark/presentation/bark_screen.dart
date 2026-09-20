import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/state_views.dart';

/// AI Bark — สามแท็บตามสเปก: แชทปรึกษา / AI ทรงขน / โภชนาการ
class BarkScreen extends ConsumerStatefulWidget {
  const BarkScreen({super.key});

  @override
  ConsumerState<BarkScreen> createState() => _BarkScreenState();
}

class _BarkScreenState extends ConsumerState<BarkScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/feed'),
        ),
        title: const Text('AI Bark ผู้ช่วยอัจฉริยะ'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'แชทปรึกษา'),
            Tab(text: 'AI ทรงขน'),
            Tab(text: 'โภชนาการ'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [_ChatTab(), _GroomingTab(), _NutritionTab()],
      ),
    );
  }
}

// ------------------------------------------------------------------ แชทปรึกษา

class _ChatTab extends ConsumerStatefulWidget {
  const _ChatTab();

  @override
  ConsumerState<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends ConsumerState<_ChatTab> with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  final _scroll = ScrollController();

  BarkThread? _thread;
  String? _error;
  bool _sending = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final thread = await ref.read(repositoryProvider).barkThread();
      if (mounted) {
        setState(() => _thread = thread);
        _scrollToBottom();
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty || _sending) return;

    _controller.clear();
    setState(() => _sending = true);

    try {
      final result = await ref.read(repositoryProvider).sendBarkMessage(text);
      if (!mounted) return;
      setState(() {
        _thread = BarkThread(
          messages: [..._thread!.messages, result.userMessage, result.aiMessage],
          quickPrompts: _thread!.quickPrompts,
          dog: _thread!.dog,
        );
      });
      _scrollToBottom();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_thread == null) return const LoadingView();

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            itemCount: _thread!.messages.length + (_sending ? 1 : 0),
            itemBuilder: (context, index) {
              if (index >= _thread!.messages.length) return const _TypingBubble();
              return _MessageBubble(message: _thread!.messages[index]);
            },
          ),
        ),

        if (_thread!.quickPrompts.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              itemCount: _thread!.quickPrompts.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final prompt = _thread!.quickPrompts[index];
                return ActionChip(
                  label: Text(prompt, style: const TextStyle(fontSize: 12)),
                  backgroundColor: AppColors.surface,
                  side: const BorderSide(color: AppColors.border),
                  onPressed: _sending ? null : () => _send(prompt),
                );
              },
            ),
          ),

        Padding(
          padding: EdgeInsets.fromLTRB(
            14,
            8,
            8,
            12 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.add_photo_alternate_outlined, color: AppColors.textMuted),
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('กำลังเชื่อม AI Vision สำหรับวิเคราะห์รูปอาการ')),
                ),
              ),
              Expanded(
                child: TextField(
                  controller: _controller,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                  decoration: const InputDecoration(hintText: 'พิมพ์คำถามถึง AI Bark...'),
                ),
              ),
              IconButton(
                onPressed: _sending ? null : () => _send(),
                icon: const Icon(Icons.send_rounded, color: AppColors.accent1),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final BarkMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: message.isEmergency
              ? AppColors.dangerSoft
              : isUser
                  ? AppColors.accent1
                  : AppColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: isUser ? null : Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message.isEmergency)
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.warning_amber_rounded, size: 17, color: AppColors.danger),
                    SizedBox(width: 6),
                    Text(
                      'ภาวะฉุกเฉิน',
                      style: TextStyle(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            Text(
              message.text,
              style: TextStyle(
                fontSize: 13.5,
                height: 1.55,
                color: message.isEmergency
                    ? const Color(0xFF7A1D18)
                    : isUser
                        ? Colors.white
                        : AppColors.textSecondary,
              ),
            ),
            if (message.isEmergency && message.payload?['phone'] != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_hospital_rounded, size: 16, color: AppColors.danger),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${message.payload!['clinic']}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                          ),
                          Text(
                            '${message.payload!['phone']} · ${message.payload!['distanceText'] ?? ''}',
                            style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const SizedBox(
          width: 18,
          height: 12,
          child: Center(
            child: SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent2),
            ),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------ AI ทรงขน

class _GroomingTab extends ConsumerStatefulWidget {
  const _GroomingTab();

  @override
  ConsumerState<_GroomingTab> createState() => _GroomingTabState();
}

class _GroomingTabState extends ConsumerState<_GroomingTab> with AutomaticKeepAliveClientMixin {
  List<GroomingStyle>? _styles;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final styles = await ref.read(repositoryProvider).groomingStyles();
      if (mounted) setState(() => _styles = styles);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _book(GroomingStyle style) async {
    try {
      await ref.read(repositoryProvider).bookGrooming(style.documentId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('จอง "${style.name}" เรียบร้อย ทางร้านจะติดต่อกลับ')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_styles == null) return const LoadingView();

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      itemCount: _styles!.length,
      separatorBuilder: (context, index) => const SizedBox(height: 14),
      itemBuilder: (context, index) {
        final style = _styles![index];
        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(aspectRatio: 16 / 10, child: RemoteImage(url: style.imageUrl)),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      style.name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      style.description,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.55,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.schedule_rounded, size: 14, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          '${style.durationMinutes} นาที',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(width: 14),
                        const Icon(Icons.sell_outlined, size: 14, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          '${style.priceThb} บาท',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () => _book(style),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(96, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                          ),
                          child: const Text('จองคิว'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ----------------------------------------------------------------- โภชนาการ

class _NutritionTab extends ConsumerStatefulWidget {
  const _NutritionTab();

  @override
  ConsumerState<_NutritionTab> createState() => _NutritionTabState();
}

class _NutritionTabState extends ConsumerState<_NutritionTab> with AutomaticKeepAliveClientMixin {
  NutritionPlan? _plan;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final plan = await ref.read(repositoryProvider).nutritionPlan();
      if (mounted) setState(() => _plan = plan);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_error != null) return ErrorView(message: _error!, onRetry: _load);
    if (_plan == null) return const LoadingView();

    final plan = _plan!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Text(
                '${plan.dailyKcal}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      fontSize: 34,
                    ),
              ),
              const Text('kcal ต่อวัน', style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
              const SizedBox(height: 16),
              Row(
                children: [
                  _Metric(label: 'อาหารเม็ด', value: '${plan.dryFoodGram} g'),
                  _Metric(label: 'จำนวนมื้อ', value: '${plan.mealsPerDay} มื้อ'),
                  _Metric(label: 'ต่อมื้อ', value: '${plan.gramPerMeal} g'),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),
        const _SectionTitle('สัดส่วนสารอาหาร'),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              _MacroBar(label: 'โปรตีน', percent: plan.proteinPct, color: AppColors.accent1),
              const SizedBox(height: 12),
              _MacroBar(label: 'ไขมัน', percent: plan.fatPct, color: AppColors.amber),
              const SizedBox(height: 12),
              _MacroBar(label: 'คาร์โบไฮเดรตและอื่น ๆ', percent: plan.carbPct, color: AppColors.accent3),
            ],
          ),
        ),

        if (plan.forbiddenFoods.isNotEmpty) ...[
          const SizedBox(height: 18),
          const _SectionTitle('อาหารต้องห้าม'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.dangerSoft,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final food in plan.forbiddenFoods)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.block_rounded, size: 15, color: AppColors.danger),
                        const SizedBox(width: 8),
                        Text(
                          food,
                          style: const TextStyle(fontSize: 13.5, color: Color(0xFF7A1D18)),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 2),
                const Text(
                  'ถ้าน้องเผลอกินเข้าไป ให้พาพบสัตวแพทย์ทันที',
                  style: TextStyle(fontSize: 12, color: Color(0xFF7A1D18)),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({required this.label, required this.percent, required this.color});

  final String label;
  final int percent;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label, style: const TextStyle(fontSize: 13)),
            const Spacer(),
            Text('$percent%', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: percent / 100,
            minHeight: 8,
            backgroundColor: AppColors.surfaceAlt,
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ],
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 2),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
