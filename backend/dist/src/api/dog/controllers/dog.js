"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
exports.default = strapi_1.factories.createCoreController('api::dog.dog', () => ({
    /** GET /api/dogs/:ref/profile — ส่วนหัวโปรไฟล์ทั้งหมดในครั้งเดียว */
    async profile(ctx) {
        var _a, _b, _c, _d;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const [posts, followers, following, isFollowing, achievements] = await Promise.all([
            (0, viewer_1.countDogPosts)(strapi, dog),
            (0, viewer_1.countDogFollowers)(strapi, dog),
            (0, viewer_1.countDogFollowing)(strapi, dog),
            (0, viewer_1.isFollowingDog)(strapi, (_c = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _c !== void 0 ? _c : null, dog.id),
            strapi.db.query('api::dog-achievement.dog-achievement').findMany({
                where: { dog: dog.id },
                populate: { achievement: true },
            }),
        ]);
        ctx.body = {
            data: (0, serializers_1.serializeDogDetail)(dog, {
                isMine: ((_d = dog.owner) === null || _d === void 0 ? void 0 : _d.id) === (viewer === null || viewer === void 0 ? void 0 : viewer.id),
                isFollowing,
                counts: { posts, followers, following },
                achievements: achievements
                    .map((a) => a.achievement)
                    .filter(Boolean)
                    .map((a) => ({
                    code: a.code,
                    title: a.title,
                    description: a.description,
                    icon: a.icon,
                    colorHex: a.colorHex,
                })),
            }),
        };
    },
    /** GET /api/dogs/:ref/posts — แท็บ "โพสต์" (กริดรูปแรกของแต่ละโพสต์) */
    async posts(ctx) {
        var _a, _b, _c, _d;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 18, 1, 60);
        const isOwner = ((_c = dog.owner) === null || _c === void 0 ? void 0 : _c.id) === (viewer === null || viewer === void 0 ? void 0 : viewer.id);
        if (!dog.isPublic && !isOwner) {
            ctx.body = {
                data: [],
                meta: { page, pageSize, pageCount: 0, total: 0, isPrivate: true },
            };
            return;
        }
        const where = { dog: dog.id };
        const [posts, total] = await Promise.all([
            strapi.db.query('api::post.post').findMany({
                where,
                orderBy: { createdAt: 'desc' },
                offset: (page - 1) * pageSize,
                limit: pageSize,
                populate: viewer_1.POST_POPULATE,
            }),
            strapi.db.query('api::post.post').count({ where }),
        ]);
        const flags = await (0, viewer_1.buildPostFlags)(strapi, (_d = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _d !== void 0 ? _d : null, posts);
        ctx.body = {
            data: posts.map((post) => (0, serializers_1.serializePost)(post, {
                likedByMe: flags.liked.has(post.id),
                savedByMe: flags.saved.has(post.id),
                isMine: isOwner,
            })),
            meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total, isPrivate: false },
        };
    },
    /** GET /api/dogs/:ref/photos — แท็บ "รูปภาพ" แยกเป็นรายรูป ไม่ใช่รายโพสต์ */
    async photos(ctx) {
        var _a, _b, _c;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const isOwner = ((_c = dog.owner) === null || _c === void 0 ? void 0 : _c.id) === (viewer === null || viewer === void 0 ? void 0 : viewer.id);
        if (!dog.isPublic && !isOwner) {
            ctx.body = { data: [], meta: { total: 0, isPrivate: true } };
            return;
        }
        const posts = await strapi.db.query('api::post.post').findMany({
            where: { dog: dog.id },
            orderBy: { createdAt: 'desc' },
            limit: 120,
            populate: { media: true },
        });
        const photos = posts.flatMap((post) => {
            var _a;
            return ((_a = post.media) !== null && _a !== void 0 ? _a : []).map((file) => ({
                ...(0, serializers_1.serializeMedia)(file),
                postDocumentId: post.documentId,
            }));
        });
        ctx.body = { data: photos, meta: { total: photos.length, isPrivate: false } };
    },
    /** GET /api/dogs/:ref/about — แท็บ "เกี่ยวกับ" */
    async about(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const [nutrition, achievements, totalWalks] = await Promise.all([
            strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({ where: { dog: dog.id } }),
            strapi.db.query('api::dog-achievement.dog-achievement').findMany({
                where: { dog: dog.id },
                populate: { achievement: true },
            }),
            strapi.db.query('api::walk-session.walk-session').count({
                where: { dog: dog.id, status: 'finished' },
            }),
        ]);
        ctx.body = {
            data: {
                bio: (_a = dog.bio) !== null && _a !== void 0 ? _a : '',
                facts: [
                    { label: 'สายพันธุ์', value: (_c = (_b = dog.breed) === null || _b === void 0 ? void 0 : _b.nameTh) !== null && _c !== void 0 ? _c : '-', icon: 'pets' },
                    { label: 'อายุ', value: (0, format_1.formatAgeTh)(dog.birthDate) || '-', icon: 'calendar_month' },
                    { label: 'เพศ', value: dog.gender === 'female' ? 'เพศเมีย' : 'เพศผู้', icon: 'wc' },
                    { label: 'น้ำหนัก', value: dog.weight ? `${dog.weight} กก.` : '-', icon: 'monitor_weight' },
                    { label: 'วัคซีน', value: (_d = dog.vaccineStatus) !== null && _d !== void 0 ? _d : '-', icon: 'vaccines' },
                    { label: 'ระยะสะสม', value: `${Number((_e = dog.accumulatedKm) !== null && _e !== void 0 ? _e : 0)} กม.`, icon: 'directions_walk' },
                ],
                owner: {
                    displayName: (_k = (_h = (_g = (_f = dog.owner) === null || _f === void 0 ? void 0 : _f.ownerProfile) === null || _g === void 0 ? void 0 : _g.displayName) !== null && _h !== void 0 ? _h : (_j = dog.owner) === null || _j === void 0 ? void 0 : _j.username) !== null && _k !== void 0 ? _k : null,
                    username: (_m = (_l = dog.owner) === null || _l === void 0 ? void 0 : _l.username) !== null && _m !== void 0 ? _m : null,
                    bio: (_q = (_p = (_o = dog.owner) === null || _o === void 0 ? void 0 : _o.ownerProfile) === null || _p === void 0 ? void 0 : _p.bio) !== null && _q !== void 0 ? _q : null,
                    avatarUrl: (0, serializers_1.absoluteUrl)((_t = (_s = (_r = dog.owner) === null || _r === void 0 ? void 0 : _r.ownerProfile) === null || _s === void 0 ? void 0 : _s.avatar) === null || _t === void 0 ? void 0 : _t.url),
                },
                nutrition: nutrition
                    ? {
                        dailyKcal: nutrition.dailyKcal,
                        dryFoodGram: nutrition.dryFoodGram,
                        mealsPerDay: nutrition.mealsPerDay,
                    }
                    : null,
                achievements: achievements
                    .map((a) => a.achievement)
                    .filter(Boolean)
                    .map((a) => ({ code: a.code, title: a.title, icon: a.icon, colorHex: a.colorHex })),
                totalWalks,
            },
        };
    },
    /** POST /api/dogs/:ref/follow — สลับติดตาม */
    async toggleFollow(ctx) {
        var _a, _b, _c;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        if (((_a = dog.owner) === null || _a === void 0 ? void 0 : _a.id) === user.id)
            return ctx.badRequest('ติดตามสุนัขของตัวเองไม่ได้');
        const existing = await strapi.db.query('api::follow.follow').findOne({
            where: { follower: user.id, dog: dog.id },
        });
        let following;
        if (existing) {
            await strapi.db.query('api::follow.follow').delete({ where: { id: existing.id } });
            following = false;
        }
        else {
            await strapi.db.query('api::follow.follow').create({
                data: {
                    follower: user.id,
                    dog: dog.id,
                    status: dog.isPublic ? 'accepted' : 'pending',
                    publishedAt: new Date(),
                },
            });
            following = dog.isPublic;
            const actorDog = await (0, viewer_1.getPrimaryDog)(strapi, user.id);
            await (0, viewer_1.createNotification)(strapi, {
                recipientId: (_b = dog.owner) === null || _b === void 0 ? void 0 : _b.id,
                actorId: user.id,
                actorDogId: (_c = actorDog === null || actorDog === void 0 ? void 0 : actorDog.id) !== null && _c !== void 0 ? _c : null,
                type: dog.isPublic ? 'follow' : 'follow_request',
                scope: 'you',
                message: dog.isPublic
                    ? `เริ่มติดตาม ${dog.nameTh}`
                    : `ขอติดตาม ${dog.nameTh}`,
            });
        }
        const followersCount = await (0, viewer_1.countDogFollowers)(strapi, dog);
        ctx.body = { following, followersCount };
    },
    /** GET /api/dogs/:ref/followers */
    async followers(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 20, 1, 50);
        const rows = await strapi.db.query('api::follow.follow').findMany({
            where: { dog: dog.id, status: 'accepted' },
            orderBy: { createdAt: 'desc' },
            offset: (page - 1) * pageSize,
            limit: pageSize,
            populate: {
                follower: { populate: { ...viewer_1.OWNER_POPULATE, dogs: { populate: viewer_1.DOG_SUMMARY_POPULATE } } },
            },
        });
        const data = [];
        for (const row of rows) {
            const follower = row.follower;
            if (!follower)
                continue;
            const theirDog = (_d = (_c = follower.dogs) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : null;
            data.push({
                userDocumentId: follower.documentId,
                username: follower.username,
                displayName: (_f = (_e = follower.ownerProfile) === null || _e === void 0 ? void 0 : _e.displayName) !== null && _f !== void 0 ? _f : follower.username,
                avatarUrl: (0, serializers_1.absoluteUrl)((_h = (_g = follower.ownerProfile) === null || _g === void 0 ? void 0 : _g.avatar) === null || _h === void 0 ? void 0 : _h.url),
                dog: (0, serializers_1.serializeDogSummary)(theirDog),
                isFollowedByMe: theirDog
                    ? await (0, viewer_1.isFollowingDog)(strapi, (_j = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _j !== void 0 ? _j : null, theirDog.id)
                    : false,
            });
        }
        ctx.body = { data, meta: { page, pageSize } };
    },
    /** GET /api/dogs/:ref/following — สุนัขที่เจ้าของของโปรไฟล์นี้ติดตามอยู่ */
    async following(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const dog = await (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 20, 1, 50);
        const rows = await strapi.db.query('api::follow.follow').findMany({
            where: { follower: (_d = (_c = dog.owner) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : -1, status: 'accepted' },
            orderBy: { createdAt: 'desc' },
            offset: (page - 1) * pageSize,
            limit: pageSize,
            populate: { dog: { populate: { ...viewer_1.DOG_SUMMARY_POPULATE, owner: { populate: viewer_1.OWNER_POPULATE } } } },
        });
        const data = [];
        for (const row of rows) {
            if (!row.dog)
                continue;
            data.push({
                ...(0, serializers_1.serializeDogSummary)(row.dog),
                ownerDisplayName: (_j = (_g = (_f = (_e = row.dog.owner) === null || _e === void 0 ? void 0 : _e.ownerProfile) === null || _f === void 0 ? void 0 : _f.displayName) !== null && _g !== void 0 ? _g : (_h = row.dog.owner) === null || _h === void 0 ? void 0 : _h.username) !== null && _j !== void 0 ? _j : null,
                isFollowedByMe: await (0, viewer_1.isFollowingDog)(strapi, (_k = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _k !== void 0 ? _k : null, row.dog.id),
            });
        }
        ctx.body = { data, meta: { page, pageSize } };
    },
    /** PUT /api/dogs/:ref — แก้ไขโปรไฟล์สุนัขของตัวเอง */
    async update(ctx) {
        var _a, _b, _c, _d, _e, _f;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await (0, viewer_1.findDogByRef)(strapi, (_a = ctx.params.id) !== null && _a !== void 0 ? _a : ctx.params.ref);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        if (((_b = dog.owner) === null || _b === void 0 ? void 0 : _b.id) !== user.id)
            return ctx.forbidden('แก้ไขได้เฉพาะสุนัขของตัวเอง');
        const body = (_e = (_d = (_c = ctx.request.body) === null || _c === void 0 ? void 0 : _c.data) !== null && _d !== void 0 ? _d : ctx.request.body) !== null && _e !== void 0 ? _e : {};
        const data = {};
        for (const key of ['nameTh', 'nameEn', 'bio', 'vaccineStatus', 'gender', 'birthDate']) {
            if (body[key] !== undefined)
                data[key] = body[key];
        }
        if (body.weight !== undefined)
            data.weight = Number(body.weight);
        if (body.isPublic !== undefined)
            data.isPublic = Boolean(body.isPublic);
        if (body.avatar !== undefined)
            data.avatar = body.avatar;
        if (body.coverImage !== undefined)
            data.coverImage = body.coverImage;
        if (body.breed !== undefined) {
            const breed = await strapi.db.query('api::breed.breed').findOne({
                where: { $or: [{ documentId: String(body.breed) }, { slug: String(body.breed) }] },
            });
            data.breed = (_f = breed === null || breed === void 0 ? void 0 : breed.id) !== null && _f !== void 0 ? _f : null;
        }
        await strapi.db.query('api::dog.dog').update({ where: { id: dog.id }, data });
        const updated = await (0, viewer_1.findDogByRef)(strapi, dog.documentId);
        ctx.body = { data: (0, serializers_1.serializeDogDetail)(updated, { isMine: true }) };
    },
}));
