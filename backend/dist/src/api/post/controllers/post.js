"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
const caption_writer_1 = require("../services/caption-writer");
const MAX_MEDIA = 10;
async function loadPost(documentId) {
    return strapi.db.query('api::post.post').findOne({
        where: { documentId },
        populate: viewer_1.POST_POPULATE,
    });
}
exports.default = strapi_1.factories.createCoreController('api::post.post', () => ({
    /** POST /api/posts — สร้างโพสต์จาก id ของไฟล์ที่อัปโหลดไว้แล้ว */
    async create(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const mediaIds = Array.isArray(body.media) ? body.media : [];
        if (mediaIds.length < 1 || mediaIds.length > MAX_MEDIA) {
            return ctx.badRequest(`ต้องแนบรูปอย่างน้อย 1 รูป และไม่เกิน ${MAX_MEDIA} รูป`);
        }
        const files = await strapi.db.query('plugin::upload.file').findMany({
            where: { id: { $in: mediaIds } },
        });
        if (files.length !== mediaIds.length) {
            return ctx.badRequest('มีไฟล์บางรายการไม่ถูกต้อง');
        }
        if (files.some((f) => { var _a; return !String((_a = f.mime) !== null && _a !== void 0 ? _a : '').startsWith('image/'); })) {
            return ctx.badRequest('รองรับเฉพาะไฟล์รูปภาพ');
        }
        // แท็กสุนัข: ใช้ที่ส่งมา ไม่งั้นตกไปที่สุนัขตัวหลักของผู้ใช้
        let dog = null;
        if (body.dog) {
            dog = await strapi.db.query('api::dog.dog').findOne({
                where: { documentId: String(body.dog), owner: user.id },
            });
            if (!dog)
                return ctx.badRequest('ไม่พบสุนัขที่เลือก หรือไม่ใช่สุนัขของคุณ');
        }
        else {
            dog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        }
        const caption = typeof body.caption === 'string' ? body.caption.slice(0, 2200) : '';
        const explicitTags = Array.isArray(body.hashtags) ? body.hashtags : [];
        const hashtagNames = [...new Set([...(0, format_1.parseHashtags)(caption), ...explicitTags.map(String)])];
        const hashtagIds = await (0, viewer_1.upsertHashtags)(strapi, hashtagNames);
        let exploreCategoryId = null;
        if (body.exploreCategory) {
            const cat = await strapi.db.query('api::explore-category.explore-category').findOne({
                where: { $or: [{ documentId: String(body.exploreCategory) }, { slug: String(body.exploreCategory) }] },
            });
            exploreCategoryId = (_d = cat === null || cat === void 0 ? void 0 : cat.id) !== null && _d !== void 0 ? _d : null;
        }
        const created = await strapi.db.query('api::post.post').create({
            data: {
                author: user.id,
                dog: (_e = dog === null || dog === void 0 ? void 0 : dog.id) !== null && _e !== void 0 ? _e : null,
                caption,
                media: mediaIds,
                location: (_f = body.location) !== null && _f !== void 0 ? _f : null,
                latitude: (_g = body.latitude) !== null && _g !== void 0 ? _g : null,
                longitude: (_h = body.longitude) !== null && _h !== void 0 ? _h : null,
                mood: (_j = body.mood) !== null && _j !== void 0 ? _j : null,
                aiMoodSummary: (_k = body.aiMoodSummary) !== null && _k !== void 0 ? _k : null,
                visibility: ['public', 'followers', 'private'].includes(body.visibility)
                    ? body.visibility
                    : 'public',
                likeCount: 0,
                commentCount: 0,
                saveCount: 0,
                hashtags: hashtagIds,
                exploreCategory: exploreCategoryId,
                publishedAt: new Date(),
            },
        });
        const post = await loadPost(created.documentId);
        ctx.body = { data: (0, serializers_1.serializePost)(post, { isMine: true }) };
    },
    /** GET /api/posts/:id */
    async findOne(ctx) {
        var _a, _b, _c, _d;
        const user = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const post = await loadPost(ctx.params.id);
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        const flags = await (0, viewer_1.buildPostFlags)(strapi, (_c = user === null || user === void 0 ? void 0 : user.id) !== null && _c !== void 0 ? _c : null, [post]);
        ctx.body = {
            data: (0, serializers_1.serializePost)(post, {
                likedByMe: flags.liked.has(post.id),
                savedByMe: flags.saved.has(post.id),
                isFollowing: post.dog ? flags.followedDogs.has(post.dog.id) : false,
                isMine: ((_d = post.author) === null || _d === void 0 ? void 0 : _d.id) === (user === null || user === void 0 ? void 0 : user.id),
            }),
        };
    },
    /** DELETE /api/posts/:id — เฉพาะเจ้าของเท่านั้น */
    async delete(ctx) {
        var _a;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const post = await strapi.db.query('api::post.post').findOne({
            where: { documentId: ctx.params.id },
            populate: { author: true },
        });
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        if (((_a = post.author) === null || _a === void 0 ? void 0 : _a.id) !== user.id)
            return ctx.forbidden('ลบได้เฉพาะโพสต์ของตัวเอง');
        await strapi.db.query('api::like.like').deleteMany({ where: { post: post.id } });
        await strapi.db.query('api::saved-post.saved-post').deleteMany({ where: { post: post.id } });
        await strapi.db.query('api::comment.comment').deleteMany({ where: { post: post.id } });
        await strapi.db.query('api::notification.notification').deleteMany({ where: { post: post.id } });
        await strapi.db.query('api::post.post').delete({ where: { id: post.id } });
        ctx.body = { data: { documentId: ctx.params.id, deleted: true } };
    },
    /** POST /api/posts/:id/like — สลับสถานะถูกใจ */
    async toggleLike(ctx) {
        var _a, _b, _c;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const post = await strapi.db.query('api::post.post').findOne({
            where: { documentId: ctx.params.id },
            populate: { author: true, dog: true },
        });
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        const existing = await strapi.db.query('api::like.like').findOne({
            where: { user: user.id, post: post.id },
        });
        let liked;
        let likeCount = Number((_a = post.likeCount) !== null && _a !== void 0 ? _a : 0);
        if (existing) {
            await strapi.db.query('api::like.like').delete({ where: { id: existing.id } });
            likeCount = Math.max(0, likeCount - 1);
            liked = false;
        }
        else {
            await strapi.db.query('api::like.like').create({
                data: { user: user.id, post: post.id, publishedAt: new Date() },
            });
            likeCount += 1;
            liked = true;
            const actorDog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
            await (0, viewer_1.createNotification)(strapi, {
                recipientId: (_b = post.author) === null || _b === void 0 ? void 0 : _b.id,
                actorId: user.id,
                actorDogId: (_c = actorDog === null || actorDog === void 0 ? void 0 : actorDog.id) !== null && _c !== void 0 ? _c : null,
                type: 'like',
                scope: 'you',
                message: 'ถูกใจโพสต์ของคุณ',
                postId: post.id,
            });
        }
        await strapi.db.query('api::post.post').update({
            where: { id: post.id },
            data: { likeCount },
        });
        ctx.body = { liked, likeCount };
    },
    /** POST /api/posts/:id/save — สลับบันทึกรายการโปรด (ไอคอน bookmark) */
    async toggleSave(ctx) {
        var _a;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const post = await strapi.db.query('api::post.post').findOne({
            where: { documentId: ctx.params.id },
        });
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        const existing = await strapi.db.query('api::saved-post.saved-post').findOne({
            where: { user: user.id, post: post.id },
        });
        let saved;
        let saveCount = Number((_a = post.saveCount) !== null && _a !== void 0 ? _a : 0);
        if (existing) {
            await strapi.db.query('api::saved-post.saved-post').delete({ where: { id: existing.id } });
            saveCount = Math.max(0, saveCount - 1);
            saved = false;
        }
        else {
            await strapi.db.query('api::saved-post.saved-post').create({
                data: { user: user.id, post: post.id, publishedAt: new Date() },
            });
            saveCount += 1;
            saved = true;
        }
        await strapi.db.query('api::post.post').update({
            where: { id: post.id },
            data: { saveCount },
        });
        ctx.body = { saved, saveCount };
    },
    /** GET /api/posts/:id/comments */
    async listComments(ctx) {
        const post = await strapi.db.query('api::post.post').findOne({
            where: { documentId: ctx.params.id },
        });
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 20, 1, 50);
        const [comments, total] = await Promise.all([
            strapi.db.query('api::comment.comment').findMany({
                where: { post: post.id },
                orderBy: { createdAt: 'desc' },
                offset: (page - 1) * pageSize,
                limit: pageSize,
                populate: {
                    author: { populate: viewer_1.OWNER_POPULATE },
                    dog: { populate: { avatar: true, breed: true } },
                },
            }),
            strapi.db.query('api::comment.comment').count({ where: { post: post.id } }),
        ]);
        ctx.body = {
            data: comments.map(serializers_1.serializeComment),
            meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total },
        };
    },
    /** POST /api/posts/:id/comments */
    async addComment(ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text)
            return ctx.badRequest('ข้อความว่างไม่ได้');
        const post = await strapi.db.query('api::post.post').findOne({
            where: { documentId: ctx.params.id },
            populate: { author: true },
        });
        if (!post)
            return ctx.notFound('ไม่พบโพสต์');
        const dog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        const created = await strapi.db.query('api::comment.comment').create({
            data: {
                post: post.id,
                author: user.id,
                dog: (_d = dog === null || dog === void 0 ? void 0 : dog.id) !== null && _d !== void 0 ? _d : null,
                text: text.slice(0, 1000),
                publishedAt: new Date(),
            },
        });
        const commentCount = Number((_e = post.commentCount) !== null && _e !== void 0 ? _e : 0) + 1;
        await strapi.db.query('api::post.post').update({
            where: { id: post.id },
            data: { commentCount },
        });
        await (0, viewer_1.createNotification)(strapi, {
            recipientId: (_f = post.author) === null || _f === void 0 ? void 0 : _f.id,
            actorId: user.id,
            actorDogId: (_g = dog === null || dog === void 0 ? void 0 : dog.id) !== null && _g !== void 0 ? _g : null,
            type: 'comment',
            scope: 'you',
            message: `แสดงความคิดเห็น: ${text.slice(0, 60)}`,
            postId: post.id,
            commentId: created.id,
        });
        const full = await strapi.db.query('api::comment.comment').findOne({
            where: { id: created.id },
            populate: {
                author: { populate: viewer_1.OWNER_POPULATE },
                dog: { populate: { avatar: true, breed: true } },
            },
        });
        ctx.body = { data: (0, serializers_1.serializeComment)(full), commentCount };
    },
    /** POST /api/posts/caption-suggestions — ผู้ช่วยเขียนแคปชั่น */
    async suggestCaption(ctx) {
        var _a, _b, _c, _d, _e;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        let dogName = typeof body.dogName === 'string' ? body.dogName.trim() : '';
        if (!dogName && body.dog) {
            const dog = await strapi.db.query('api::dog.dog').findOne({
                where: { documentId: String(body.dog), owner: user.id },
            });
            dogName = (_d = dog === null || dog === void 0 ? void 0 : dog.nameTh) !== null && _d !== void 0 ? _d : '';
        }
        if (!dogName) {
            const primary = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
            dogName = (_e = primary === null || primary === void 0 ? void 0 : primary.nameTh) !== null && _e !== void 0 ? _e : '';
        }
        ctx.body = {
            data: {
                suggestions: (0, caption_writer_1.suggestCaptions)({
                    dogName,
                    mood: typeof body.mood === 'string' ? body.mood : null,
                    location: typeof body.location === 'string' ? body.location : null,
                    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
                }),
            },
        };
    },
}));
