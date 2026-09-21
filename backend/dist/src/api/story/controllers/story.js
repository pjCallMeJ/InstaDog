"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
const DAY_MS = 24 * 60 * 60 * 1000;
exports.default = strapi_1.factories.createCoreController('api::story.story', () => ({
    /**
     * GET /api/stories
     * คืนแถบสตอรี่ของหน้าแรก จัดกลุ่มหนึ่งวงต่อหนึ่งสุนัข พร้อม hasUnseen สำหรับวงแหวนไล่สี
     */
    async ring(ctx) {
        var _a, _b;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const stories = await strapi.db.query('api::story.story').findMany({
            where: { expiresAt: { $gt: new Date() } },
            orderBy: { createdAt: 'asc' },
            limit: 200,
            populate: {
                media: true,
                dog: { populate: viewer_1.DOG_SUMMARY_POPULATE },
            },
        });
        const seen = await strapi.db.query('api::story-view.story-view').findMany({
            where: { user: user.id, story: { id: { $in: stories.map((s) => s.id) } } },
            populate: { story: true },
        });
        const seenIds = new Set(seen.map((v) => { var _a; return (_a = v.story) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean));
        const groups = new Map();
        for (const story of stories) {
            if (!story.dog)
                continue;
            if (!groups.has(story.dog.id)) {
                groups.set(story.dog.id, {
                    dog: (0, serializers_1.serializeDogSummary)(story.dog),
                    hasUnseen: false,
                    items: [],
                });
            }
            const group = groups.get(story.dog.id);
            const isSeen = seenIds.has(story.id);
            if (!isSeen)
                group.hasUnseen = true;
            group.items.push({
                documentId: story.documentId,
                imageUrl: (0, serializers_1.absoluteUrl)((_a = story.media) === null || _a === void 0 ? void 0 : _a.url),
                caption: (_b = story.caption) !== null && _b !== void 0 ? _b : null,
                timeAgo: (0, format_1.timeAgoTh)(story.createdAt),
                isSeen,
            });
        }
        const myDog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        ctx.body = {
            // ช่องแรกของแถบคือปุ่ม "สร้างสตอรี่"
            self: myDog ? (0, serializers_1.serializeDogSummary)(myDog) : null,
            data: [...groups.values()].sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen)),
        };
    },
    /** POST /api/stories */
    async publish(ctx) {
        var _a, _b, _c, _d, _e;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        if (!body.media)
            return ctx.badRequest('ต้องแนบรูปสตอรี่');
        const dog = body.dog
            ? await strapi.db.query('api::dog.dog').findOne({
                where: { documentId: String(body.dog), owner: user.id },
            })
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        if (!dog)
            return ctx.badRequest('ไม่พบสุนัขของคุณ');
        const created = await strapi.db.query('api::story.story').create({
            data: {
                dog: dog.id,
                author: user.id,
                media: body.media,
                caption: (_d = body.caption) !== null && _d !== void 0 ? _d : null,
                expiresAt: new Date(Date.now() + DAY_MS),
                publishedAt: new Date(),
            },
            populate: { media: true },
        });
        ctx.body = {
            data: {
                documentId: created.documentId,
                imageUrl: (0, serializers_1.absoluteUrl)((_e = created.media) === null || _e === void 0 ? void 0 : _e.url),
                caption: created.caption,
                timeAgo: 'เมื่อสักครู่',
            },
        };
    },
    /** POST /api/stories/:id/view */
    async markViewed(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const story = await strapi.db.query('api::story.story').findOne({
            where: { documentId: ctx.params.id },
        });
        if (!story)
            return ctx.notFound('ไม่พบสตอรี่');
        const existing = await strapi.db.query('api::story-view.story-view').findOne({
            where: { user: user.id, story: story.id },
        });
        if (!existing) {
            await strapi.db.query('api::story-view.story-view').create({
                data: { user: user.id, story: story.id, viewedAt: new Date(), publishedAt: new Date() },
            });
        }
        ctx.body = { viewed: true };
    },
    /** POST /api/stories/:id/reply — ตอบกลับสตอรี่ (กล่องพิมพ์ในโหมดเต็มจอ) */
    async reply(ctx) {
        var _a, _b, _c, _d, _e;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text)
            return ctx.badRequest('ข้อความว่างไม่ได้');
        const story = await strapi.db.query('api::story.story').findOne({
            where: { documentId: ctx.params.id },
            populate: { author: true, dog: true },
        });
        if (!story)
            return ctx.notFound('ไม่พบสตอรี่');
        const actorDog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        await (0, viewer_1.createNotification)(strapi, {
            recipientId: (_d = story.author) === null || _d === void 0 ? void 0 : _d.id,
            actorId: user.id,
            actorDogId: (_e = actorDog === null || actorDog === void 0 ? void 0 : actorDog.id) !== null && _e !== void 0 ? _e : null,
            type: 'story_reply',
            scope: 'you',
            message: `ตอบกลับสตอรี่: ${text.slice(0, 60)}`,
        });
        ctx.body = { sent: true };
    },
}));
