import { absoluteUrl, serializeDogSummary } from '../../../utils/serializers';
import { findDogByRef, getPrimaryDog, requireUser } from '../../../utils/viewer';
import { QUICK_PROMPTS, buildReply } from '../services/bark-rules';

function serializeMessage(message: any) {
  return {
    documentId: message.documentId,
    sender: message.sender,
    text: message.text ?? '',
    isEmergency: Boolean(message.isEmergency),
    payload: message.payload ?? null,
    createdAt: message.createdAt,
  };
}

/** หนึ่งห้องแชทต่อหนึ่งสุนัข สร้างให้อัตโนมัติพร้อมข้อความต้อนรับ */
async function ensureThread(userId: number, dog: any) {
  let thread = await strapi.db.query('api::chat-thread.chat-thread').findOne({
    where: { user: userId, dog: dog?.id ?? null },
  });

  if (!thread) {
    thread = await strapi.db.query('api::chat-thread.chat-thread').create({
      data: { user: userId, dog: dog?.id ?? null, title: 'Vet AI 2.0', publishedAt: new Date() },
    });

    await strapi.db.query('api::chat-message.chat-message').create({
      data: {
        thread: thread.id,
        sender: 'ai',
        text:
          `สวัสดีค่ะ ฉันคือ AI Bark ผู้ช่วยดูแล${dog?.nameTh ? ` ${dog.nameTh}` : 'น้องหมา'}\n\n` +
          `ถามได้ทั้งเรื่องอาหารและปริมาณที่เหมาะสม การดูแลขน การฝึกพฤติกรรม ` +
          `หรือถ้าน้องเผลอกินของที่ไม่ควรกิน พิมพ์บอกได้ทันที ฉันจะบอกขั้นตอนฉุกเฉินให้`,
        isEmergency: false,
        publishedAt: new Date(),
      },
    });
  }

  return thread;
}

export default {
  /** GET /api/bark/thread — ประวัติแชททั้งหมดของแท็บ "แชทปรึกษา" */
  async thread(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = ctx.query.dog
      ? await findDogByRef(strapi, String(ctx.query.dog))
      : await getPrimaryDog(strapi, user.id);

    const thread = await ensureThread(user.id, dog);
    const messages = await strapi.db.query('api::chat-message.chat-message').findMany({
      where: { thread: thread.id },
      orderBy: { createdAt: 'asc' },
      limit: 200,
    });

    ctx.body = {
      data: {
        documentId: thread.documentId,
        title: thread.title,
        dog: serializeDogSummary(dog),
        quickPrompts: QUICK_PROMPTS,
        messages: messages.map(serializeMessage),
      },
    };
  },

  /** POST /api/bark/messages — ส่งข้อความแล้วได้คำตอบกลับในครั้งเดียว */
  async sendMessage(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return ctx.badRequest('ข้อความว่างไม่ได้');

    const dog = body.dog
      ? await findDogByRef(strapi, String(body.dog))
      : await getPrimaryDog(strapi, user.id);
    const thread = await ensureThread(user.id, dog);

    const userMessage = await strapi.db.query('api::chat-message.chat-message').create({
      data: {
        thread: thread.id,
        sender: 'user',
        text: text.slice(0, 4000),
        isEmergency: false,
        publishedAt: new Date(),
      },
    });

    const reply = buildReply(text, { nameTh: dog?.nameTh, weight: dog?.weight });
    const aiMessage = await strapi.db.query('api::chat-message.chat-message').create({
      data: {
        thread: thread.id,
        sender: 'ai',
        text: reply.text,
        isEmergency: reply.isEmergency,
        payload: reply.payload,
        publishedAt: new Date(),
      },
    });

    ctx.body = {
      data: {
        userMessage: serializeMessage(userMessage),
        aiMessage: serializeMessage(aiMessage),
      },
    };
  },

  /** GET /api/bark/grooming-styles — แท็บ "AI ทรงขน" */
  async groomingStyles(ctx: any) {
    const rows = await strapi.db.query('api::grooming-style.grooming-style').findMany({
      orderBy: { order: 'asc' },
      limit: 30,
      populate: { image: true },
    });

    ctx.body = {
      data: rows.map((s: any) => ({
        documentId: s.documentId,
        name: s.name,
        description: s.description,
        imageUrl: absoluteUrl(s.image?.url),
        durationMinutes: s.durationMinutes,
        priceThb: s.priceThb,
      })),
    };
  },

  /** POST /api/bark/grooming-bookings — จองร้านกรูมมิ่ง */
  async createBooking(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    if (!body.style) return ctx.badRequest('ต้องเลือกทรงขน');

    const style = await strapi.db.query('api::grooming-style.grooming-style').findOne({
      where: { documentId: String(body.style) },
    });
    if (!style) return ctx.notFound('ไม่พบทรงขนนี้');

    const dog = body.dog
      ? await findDogByRef(strapi, String(body.dog))
      : await getPrimaryDog(strapi, user.id);
    if (!dog) return ctx.badRequest('ไม่พบสุนัขของคุณ');

    const created = await strapi.db.query('api::grooming-booking.grooming-booking').create({
      data: {
        dog: dog.id,
        user: user.id,
        style: style.id,
        salonName: body.salonName ?? 'InstaDog Grooming Studio',
        scheduledAt: body.scheduledAt ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'pending',
        note: body.note ?? null,
        publishedAt: new Date(),
      },
    });

    ctx.body = {
      data: {
        documentId: created.documentId,
        styleName: style.name,
        salonName: created.salonName,
        scheduledAt: created.scheduledAt,
        status: created.status,
      },
    };
  },

  /** GET /api/dogs/:ref/nutrition-plan — แท็บ "โภชนาการ" */
  async nutritionPlan(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = ctx.params.ref
      ? await findDogByRef(strapi, ctx.params.ref)
      : await getPrimaryDog(strapi, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    let plan = await strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({
      where: { dog: dog.id },
    });
    if (!plan) {
      await strapi.service('api::dog.dog').seedDefaultsFor(dog.id);
      plan = await strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({
        where: { dog: dog.id },
      });
    }

    const perMeal = Math.round(Number(plan.dryFoodGram ?? 0) / Math.max(1, Number(plan.mealsPerDay ?? 1)));

    ctx.body = {
      data: {
        dog: serializeDogSummary(dog),
        dailyKcal: plan.dailyKcal,
        dryFoodGram: plan.dryFoodGram,
        mealsPerDay: plan.mealsPerDay,
        gramPerMeal: perMeal,
        proteinPct: plan.proteinPct,
        fatPct: plan.fatPct,
        carbPct: Math.max(0, 100 - Number(plan.proteinPct ?? 0) - Number(plan.fatPct ?? 0)),
        forbiddenFoods: plan.forbiddenFoods ?? [],
      },
    };
  },
};
