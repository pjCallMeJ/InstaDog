"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
exports.default = {
    /** GET /api/feed — ไทม์ไลน์หลักของหน้าแรก */
    async find(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 10, 1, 50);
        const where = {
            visibility: 'public',
            dog: { isPublic: true },
        };
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
        const flags = await (0, viewer_1.buildPostFlags)(strapi, user.id, posts);
        ctx.body = {
            data: posts.map((post) => {
                var _a;
                return (0, serializers_1.serializePost)(post, {
                    likedByMe: flags.liked.has(post.id),
                    savedByMe: flags.saved.has(post.id),
                    isFollowing: post.dog ? flags.followedDogs.has(post.dog.id) : false,
                    isMine: ((_a = post.author) === null || _a === void 0 ? void 0 : _a.id) === user.id,
                });
            }),
            meta: {
                page,
                pageSize,
                pageCount: Math.ceil(total / pageSize),
                total,
            },
        };
    },
};
