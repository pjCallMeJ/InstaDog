"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
const DAY_MS = 24 * 60 * 60 * 1000;
/** จัดกลุ่มตามช่วงเวลาแบบเดียวกับ mockup: ใหม่ / วันนี้ / สัปดาห์นี้ / เดือนนี้ */
function bucketOf(createdAt) {
    const age = Date.now() - new Date(createdAt).getTime();
    if (age < 2 * 60 * 60 * 1000)
        return 'new';
    if (age < DAY_MS)
        return 'today';
    if (age < 7 * DAY_MS)
        return 'week';
    if (age < 30 * DAY_MS)
        return 'month';
    return 'earlier';
}
const BUCKET_LABELS = {
    new: 'ใหม่',
    today: 'วันนี้',
    week: 'สัปดาห์นี้',
    month: 'เดือนนี้',
    earlier: 'ก่อนหน้านี้',
};
exports.default = strapi_1.factories.createCoreController('api::notification.notification', () => ({
    /** GET /api/notifications?scope=you|following */
    async list(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const scope = ctx.query.scope === 'following' ? 'following' : 'you';
        const page = (0, format_1.clampInt)(ctx.query.page, 1, 1, 10000);
        const pageSize = (0, format_1.clampInt)(ctx.query.pageSize, 30, 1, 60);
        const where = { recipient: user.id, scope };
        const [rows, total] = await Promise.all([
            strapi.db.query('api::notification.notification').findMany({
                where,
                orderBy: { createdAt: 'desc' },
                offset: (page - 1) * pageSize,
                limit: pageSize,
                populate: {
                    actor: { populate: viewer_1.OWNER_POPULATE },
                    actorDog: { populate: viewer_1.DOG_SUMMARY_POPULATE },
                    post: { populate: { media: true } },
                    comment: true,
                },
            }),
            strapi.db.query('api::notification.notification').count({ where }),
        ]);
        const order = ['new', 'today', 'week', 'month', 'earlier'];
        const grouped = new Map();
        for (const row of rows) {
            const bucket = bucketOf(row.createdAt);
            if (!grouped.has(bucket))
                grouped.set(bucket, []);
            grouped.get(bucket).push((0, serializers_1.serializeNotification)(row));
        }
        ctx.body = {
            data: order
                .filter((key) => grouped.has(key))
                .map((key) => ({ key, label: BUCKET_LABELS[key], items: grouped.get(key) })),
            meta: { scope, page, pageSize, pageCount: Math.ceil(total / pageSize), total },
        };
    },
    /** GET /api/notifications/unread-count — จุดแดงบนไอคอนกระดิ่ง */
    async unreadCount(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const count = await strapi.db.query('api::notification.notification').count({
            where: { recipient: user.id, isRead: false },
        });
        ctx.body = { count };
    },
    /** POST /api/notifications/read-all */
    async readAll(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        await strapi.db.query('api::notification.notification').updateMany({
            where: { recipient: user.id, isRead: false },
            data: { isRead: true },
        });
        ctx.body = { ok: true };
    },
}));
