"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
const bark_rules_1 = require("../services/bark-rules");
function serializeMessage(message) {
    var _a, _b;
    return {
        documentId: message.documentId,
        sender: message.sender,
        text: (_a = message.text) !== null && _a !== void 0 ? _a : '',
        isEmergency: Boolean(message.isEmergency),
        payload: (_b = message.payload) !== null && _b !== void 0 ? _b : null,
        createdAt: message.createdAt,
    };
}
/** หนึ่งห้องแชทต่อหนึ่งสุนัข สร้างให้อัตโนมัติพร้อมข้อความต้อนรับ */
async function ensureThread(userId, dog) {
    var _a, _b;
    let thread = await strapi.db.query('api::chat-thread.chat-thread').findOne({
        where: { user: userId, dog: (_a = dog === null || dog === void 0 ? void 0 : dog.id) !== null && _a !== void 0 ? _a : null },
    });
    if (!thread) {
        thread = await strapi.db.query('api::chat-thread.chat-thread').create({
            data: { user: userId, dog: (_b = dog === null || dog === void 0 ? void 0 : dog.id) !== null && _b !== void 0 ? _b : null, title: 'Vet AI 2.0', publishedAt: new Date() },
        });
        await strapi.db.query('api::chat-message.chat-message').create({
            data: {
                thread: thread.id,
                sender: 'ai',
                text: `สวัสดีค่ะ ฉันคือ AI Bark ผู้ช่วยดูแล${(dog === null || dog === void 0 ? void 0 : dog.nameTh) ? ` ${dog.nameTh}` : 'น้องหมา'}\n\n` +
                    `ถามได้ทั้งเรื่องอาหารและปริมาณที่เหมาะสม การดูแลขน การฝึกพฤติกรรม ` +
                    `หรือถ้าน้องเผลอกินของที่ไม่ควรกิน พิมพ์บอกได้ทันที ฉันจะบอกขั้นตอนฉุกเฉินให้`,
                isEmergency: false,
                publishedAt: new Date(),
            },
        });
    }
    return thread;
}
exports.default = {
    /** GET /api/bark/thread — ประวัติแชททั้งหมดของแท็บ "แชทปรึกษา" */
    async thread(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = ctx.query.dog
            ? await (0, viewer_1.findDogByRef)(strapi, String(ctx.query.dog))
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
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
                dog: (0, serializers_1.serializeDogSummary)(dog),
                quickPrompts: bark_rules_1.QUICK_PROMPTS,
                messages: messages.map(serializeMessage),
            },
        };
    },
    /** POST /api/bark/messages — ส่งข้อความแล้วได้คำตอบกลับในครั้งเดียว */
    async sendMessage(ctx) {
        var _a, _b, _c;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text)
            return ctx.badRequest('ข้อความว่างไม่ได้');
        const dog = body.dog
            ? await (0, viewer_1.findDogByRef)(strapi, String(body.dog))
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
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
        const reply = (0, bark_rules_1.buildReply)(text, { nameTh: dog === null || dog === void 0 ? void 0 : dog.nameTh, weight: dog === null || dog === void 0 ? void 0 : dog.weight });
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
    async groomingStyles(ctx) {
        const rows = await strapi.db.query('api::grooming-style.grooming-style').findMany({
            orderBy: { order: 'asc' },
            limit: 30,
            populate: { image: true },
        });
        ctx.body = {
            data: rows.map((s) => {
                var _a;
                return ({
                    documentId: s.documentId,
                    name: s.name,
                    description: s.description,
                    imageUrl: (0, serializers_1.absoluteUrl)((_a = s.image) === null || _a === void 0 ? void 0 : _a.url),
                    durationMinutes: s.durationMinutes,
                    priceThb: s.priceThb,
                });
            }),
        };
    },
    /** POST /api/bark/grooming-bookings — จองร้านกรูมมิ่ง */
    async createBooking(ctx) {
        var _a, _b, _c, _d, _e, _f;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        if (!body.style)
            return ctx.badRequest('ต้องเลือกทรงขน');
        const style = await strapi.db.query('api::grooming-style.grooming-style').findOne({
            where: { documentId: String(body.style) },
        });
        if (!style)
            return ctx.notFound('ไม่พบทรงขนนี้');
        const dog = body.dog
            ? await (0, viewer_1.findDogByRef)(strapi, String(body.dog))
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        if (!dog)
            return ctx.badRequest('ไม่พบสุนัขของคุณ');
        const created = await strapi.db.query('api::grooming-booking.grooming-booking').create({
            data: {
                dog: dog.id,
                user: user.id,
                style: style.id,
                salonName: (_d = body.salonName) !== null && _d !== void 0 ? _d : 'InstaDog Grooming Studio',
                scheduledAt: (_e = body.scheduledAt) !== null && _e !== void 0 ? _e : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                status: 'pending',
                note: (_f = body.note) !== null && _f !== void 0 ? _f : null,
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
    async nutritionPlan(ctx) {
        var _a, _b, _c, _d, _e;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = ctx.params.ref
            ? await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref)
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        let plan = await strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({
            where: { dog: dog.id },
        });
        if (!plan) {
            await strapi.service('api::dog.dog').seedDefaultsFor(dog.id);
            plan = await strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({
                where: { dog: dog.id },
            });
        }
        const perMeal = Math.round(Number((_a = plan.dryFoodGram) !== null && _a !== void 0 ? _a : 0) / Math.max(1, Number((_b = plan.mealsPerDay) !== null && _b !== void 0 ? _b : 1)));
        ctx.body = {
            data: {
                dog: (0, serializers_1.serializeDogSummary)(dog),
                dailyKcal: plan.dailyKcal,
                dryFoodGram: plan.dryFoodGram,
                mealsPerDay: plan.mealsPerDay,
                gramPerMeal: perMeal,
                proteinPct: plan.proteinPct,
                fatPct: plan.fatPct,
                carbPct: Math.max(0, 100 - Number((_c = plan.proteinPct) !== null && _c !== void 0 ? _c : 0) - Number((_d = plan.fatPct) !== null && _d !== void 0 ? _d : 0)),
                forbiddenFoods: (_e = plan.forbiddenFoods) !== null && _e !== void 0 ? _e : [],
            },
        };
    },
};
