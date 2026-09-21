"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
async function loadOwnerProfile(userId) {
    return strapi.db.query('api::owner-profile.owner-profile').findOne({
        where: { user: userId },
        populate: { avatar: true },
    });
}
exports.default = {
    /** GET /api/me/profile — ข้อมูลเจ้าของ + สุนัขทั้งหมด ใช้ตอนบูตแอป */
    async profile(ctx) {
        var _a, _b, _c, _d, _e, _f, _g;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const [profile, dogs] = await Promise.all([
            loadOwnerProfile(user.id),
            strapi.db.query('api::dog.dog').findMany({
                where: { owner: user.id },
                orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
                populate: { avatar: true, coverImage: true, breed: true, owner: true },
            }),
        ]);
        const primary = (_a = dogs[0]) !== null && _a !== void 0 ? _a : null;
        ctx.body = {
            data: {
                userDocumentId: user.documentId,
                username: user.username,
                email: user.email,
                displayName: (_b = profile === null || profile === void 0 ? void 0 : profile.displayName) !== null && _b !== void 0 ? _b : user.username,
                bio: (_c = profile === null || profile === void 0 ? void 0 : profile.bio) !== null && _c !== void 0 ? _c : null,
                website: (_d = profile === null || profile === void 0 ? void 0 : profile.website) !== null && _d !== void 0 ? _d : null,
                gender: (_e = profile === null || profile === void 0 ? void 0 : profile.gender) !== null && _e !== void 0 ? _e : 'unspecified',
                isPublic: (_f = profile === null || profile === void 0 ? void 0 : profile.isPublic) !== null && _f !== void 0 ? _f : true,
                avatarUrl: (0, serializers_1.absoluteUrl)((_g = profile === null || profile === void 0 ? void 0 : profile.avatar) === null || _g === void 0 ? void 0 : _g.url),
                dogs: dogs.map((d) => (0, serializers_1.serializeDogSummary)(d)),
                primaryDog: primary
                    ? (0, serializers_1.serializeDogDetail)(primary, {
                        counts: {
                            posts: await (0, viewer_1.countDogPosts)(strapi, primary),
                            followers: await (0, viewer_1.countDogFollowers)(strapi, primary),
                            following: await (0, viewer_1.countDogFollowing)(strapi, primary),
                        },
                    })
                    : null,
            },
        };
    },
    /** PUT /api/me/profile — หน้าแก้ไขโปรไฟล์เจ้าของ */
    async updateProfile(ctx) {
        var _a, _b, _c, _d;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const data = {};
        if (body.displayName !== undefined)
            data.displayName = String(body.displayName).slice(0, 50);
        if (body.bio !== undefined)
            data.bio = String(body.bio).slice(0, 150);
        if (body.website !== undefined)
            data.website = body.website;
        if (body.gender !== undefined)
            data.gender = body.gender;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.isPublic !== undefined)
            data.isPublic = Boolean(body.isPublic);
        if (body.avatar !== undefined)
            data.avatar = body.avatar;
        const existing = await loadOwnerProfile(user.id);
        if (existing) {
            await strapi.db.query('api::owner-profile.owner-profile').update({
                where: { id: existing.id },
                data,
            });
        }
        else {
            await strapi.db.query('api::owner-profile.owner-profile').create({
                data: {
                    user: user.id,
                    displayName: (_d = data.displayName) !== null && _d !== void 0 ? _d : user.username,
                    isPublic: true,
                    ...data,
                    publishedAt: new Date(),
                },
            });
        }
        return this.profile(ctx);
    },
    /** GET /api/me/dogs */
    async dogs(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dogs = await strapi.db.query('api::dog.dog').findMany({
            where: { owner: user.id },
            orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            populate: viewer_1.DOG_SUMMARY_POPULATE,
        });
        ctx.body = { data: dogs.map(serializers_1.serializeDogSummary) };
    },
    /** POST /api/me/dogs — เพิ่มสัตว์เลี้ยงใหม่ */
    async addDog(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const nameTh = String((_d = body.nameTh) !== null && _d !== void 0 ? _d : '').trim();
        if (!nameTh)
            return ctx.badRequest('ต้องระบุชื่อน้องหมา');
        const handle = await strapi
            .service('api::dog.dog')
            .buildUniqueHandle((_f = (_e = body.handle) !== null && _e !== void 0 ? _e : body.nameEn) !== null && _f !== void 0 ? _f : nameTh);
        let breedId = null;
        if (body.breed) {
            const breed = await strapi.db.query('api::breed.breed').findOne({
                where: { $or: [{ documentId: String(body.breed) }, { slug: String(body.breed) }] },
            });
            breedId = (_g = breed === null || breed === void 0 ? void 0 : breed.id) !== null && _g !== void 0 ? _g : null;
        }
        const existingCount = await strapi.db.query('api::dog.dog').count({ where: { owner: user.id } });
        const created = await strapi.db.query('api::dog.dog').create({
            data: {
                owner: user.id,
                handle,
                nameTh,
                nameEn: (_h = body.nameEn) !== null && _h !== void 0 ? _h : null,
                breed: breedId,
                gender: body.gender === 'female' ? 'female' : 'male',
                birthDate: (_j = body.birthDate) !== null && _j !== void 0 ? _j : null,
                weight: body.weight !== undefined ? Number(body.weight) : null,
                bio: (_k = body.bio) !== null && _k !== void 0 ? _k : null,
                avatar: (_l = body.avatar) !== null && _l !== void 0 ? _l : null,
                coverImage: (_m = body.coverImage) !== null && _m !== void 0 ? _m : null,
                isPublic: body.isPublic === undefined ? true : Boolean(body.isPublic),
                isPrimary: existingCount === 0,
                publishedAt: new Date(),
            },
        });
        await strapi.service('api::dog.dog').seedDefaultsFor(created.id);
        const full = await strapi.db.query('api::dog.dog').findOne({
            where: { id: created.id },
            populate: { avatar: true, coverImage: true, breed: true, owner: true },
        });
        ctx.body = { data: (0, serializers_1.serializeDogDetail)(full, { isMine: true }) };
    },
    /** GET /api/me/saved — โพสต์ที่กด bookmark ไว้ */
    async saved(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 21, 1, 60);
        const rows = await strapi.db.query('api::saved-post.saved-post').findMany({
            where: { user: user.id },
            orderBy: { createdAt: 'desc' },
            offset: (page - 1) * pageSize,
            limit: pageSize,
            populate: { post: { populate: viewer_1.POST_POPULATE } },
        });
        const posts = rows.map((r) => r.post).filter(Boolean);
        const flags = await (0, viewer_1.buildPostFlags)(strapi, user.id, posts);
        ctx.body = {
            data: posts.map((post) => {
                var _a;
                return (0, serializers_1.serializePost)(post, {
                    likedByMe: flags.liked.has(post.id),
                    savedByMe: true,
                    isMine: ((_a = post.author) === null || _a === void 0 ? void 0 : _a.id) === user.id,
                });
            }),
            meta: { page, pageSize },
        };
    },
};
