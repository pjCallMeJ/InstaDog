"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
exports.default = {
    /**
     * GET /api/explore/categories
     * จำนวนระเบียนที่คืนจากที่นี่ = จำนวนแท็บของ TabController บนหน้าสำรวจ
     */
    async categories(ctx) {
        const rows = await strapi.db.query('api::explore-category.explore-category').findMany({
            orderBy: { order: 'asc' },
            limit: 50,
        });
        ctx.body = {
            data: rows.map((row) => ({
                documentId: row.documentId,
                nameTh: row.nameTh,
                slug: row.slug,
                icon: row.icon,
                isDefault: Boolean(row.isDefault),
            })),
        };
    },
    /** GET /api/explore?category=<slug>&page=1 — กริดรูปของแต่ละแท็บ */
    async find(ctx) {
        var _a, _b, _c;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 21, 1, 60);
        const slug = ctx.query.category ? String(ctx.query.category) : null;
        const where = {
            visibility: 'public',
            dog: { isPublic: true },
        };
        if (slug) {
            const category = await strapi.db.query('api::explore-category.explore-category').findOne({
                where: { slug },
            });
            if (!category)
                return ctx.notFound('ไม่พบหมวดนี้');
            // หมวดเริ่มต้น ("ทั้งหมด") ไม่กรอง เพื่อให้แท็บแรกเห็นทุกโพสต์
            if (!category.isDefault)
                where.exploreCategory = category.id;
        }
        const [posts, total] = await Promise.all([
            strapi.db.query('api::post.post').findMany({
                where,
                orderBy: { likeCount: 'desc' },
                offset: (page - 1) * pageSize,
                limit: pageSize,
                populate: viewer_1.POST_POPULATE,
            }),
            strapi.db.query('api::post.post').count({ where }),
        ]);
        const flags = await (0, viewer_1.buildPostFlags)(strapi, (_c = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _c !== void 0 ? _c : null, posts);
        ctx.body = {
            data: posts.map((post) => {
                var _a;
                return (0, serializers_1.serializePost)(post, {
                    likedByMe: flags.liked.has(post.id),
                    savedByMe: flags.saved.has(post.id),
                    isMine: ((_a = post.author) === null || _a === void 0 ? void 0 : _a.id) === (viewer === null || viewer === void 0 ? void 0 : viewer.id),
                });
            }),
            meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total, category: slug },
        };
    },
    /** GET /api/search?q=&type=all|dogs|owners|hashtags|posts */
    async search(ctx) {
        var _a, _b, _c, _d, _e;
        const viewer = (_b = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
        const q = String((_c = ctx.query.q) !== null && _c !== void 0 ? _c : '').trim();
        const type = String((_d = ctx.query.type) !== null && _d !== void 0 ? _d : 'all');
        if (!q) {
            ctx.body = { data: { dogs: [], owners: [], hashtags: [], posts: [] }, meta: { q } };
            return;
        }
        const wants = (key) => type === 'all' || type === key;
        const contains = { $containsi: q };
        const [dogs, owners, hashtags, posts] = await Promise.all([
            wants('dogs')
                ? strapi.db.query('api::dog.dog').findMany({
                    where: {
                        isPublic: true,
                        $or: [{ nameTh: contains }, { nameEn: contains }, { handle: contains }],
                    },
                    limit: 20,
                    populate: viewer_1.DOG_SUMMARY_POPULATE,
                })
                : Promise.resolve([]),
            wants('owners')
                ? strapi.db.query('api::owner-profile.owner-profile').findMany({
                    where: { isPublic: true, displayName: contains },
                    limit: 20,
                    populate: { avatar: true, user: true },
                })
                : Promise.resolve([]),
            wants('hashtags')
                ? strapi.db.query('api::hashtag.hashtag').findMany({
                    where: { name: contains },
                    orderBy: { postCount: 'desc' },
                    limit: 20,
                })
                : Promise.resolve([]),
            wants('posts')
                ? strapi.db.query('api::post.post').findMany({
                    where: { visibility: 'public', caption: contains },
                    orderBy: { createdAt: 'desc' },
                    limit: 21,
                    populate: viewer_1.POST_POPULATE,
                })
                : Promise.resolve([]),
        ]);
        const flags = await (0, viewer_1.buildPostFlags)(strapi, (_e = viewer === null || viewer === void 0 ? void 0 : viewer.id) !== null && _e !== void 0 ? _e : null, posts);
        ctx.body = {
            data: {
                dogs: dogs.map(serializers_1.serializeDogSummary),
                owners: owners.map((p) => {
                    var _a, _b, _c, _d, _e;
                    return ({
                        userDocumentId: (_b = (_a = p.user) === null || _a === void 0 ? void 0 : _a.documentId) !== null && _b !== void 0 ? _b : null,
                        username: (_d = (_c = p.user) === null || _c === void 0 ? void 0 : _c.username) !== null && _d !== void 0 ? _d : null,
                        displayName: p.displayName,
                        avatarUrl: (0, serializers_1.absoluteUrl)((_e = p.avatar) === null || _e === void 0 ? void 0 : _e.url),
                    });
                }),
                hashtags: hashtags.map((h) => ({
                    documentId: h.documentId,
                    name: h.name,
                    postCount: h.postCount,
                })),
                posts: posts.map((post) => (0, serializers_1.serializePost)(post, {
                    likedByMe: flags.liked.has(post.id),
                    savedByMe: flags.saved.has(post.id),
                })),
            },
            meta: { q, type },
        };
    },
};
