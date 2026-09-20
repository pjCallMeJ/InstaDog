import { factories } from '@strapi/strapi';

import { clampInt } from '../../../utils/format';
import { serializeNotification } from '../../../utils/serializers';
import { DOG_SUMMARY_POPULATE, OWNER_POPULATE, requireUser } from '../../../utils/viewer';

const DAY_MS = 24 * 60 * 60 * 1000;

/** จัดกลุ่มตามช่วงเวลาแบบเดียวกับ mockup: ใหม่ / วันนี้ / สัปดาห์นี้ / เดือนนี้ */
function bucketOf(createdAt: string | Date): string {
  const age = Date.now() - new Date(createdAt).getTime();
  if (age < 2 * 60 * 60 * 1000) return 'new';
  if (age < DAY_MS) return 'today';
  if (age < 7 * DAY_MS) return 'week';
  if (age < 30 * DAY_MS) return 'month';
  return 'earlier';
}

const BUCKET_LABELS: Record<string, string> = {
  new: 'ใหม่',
  today: 'วันนี้',
  week: 'สัปดาห์นี้',
  month: 'เดือนนี้',
  earlier: 'ก่อนหน้านี้',
};

export default factories.createCoreController('api::notification.notification', () => ({
  /** GET /api/notifications?scope=you|following */
  async list(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const scope = ctx.query.scope === 'following' ? 'following' : 'you';
    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 30, 1, 60);

    const where = { recipient: user.id, scope };
    const [rows, total] = await Promise.all([
      strapi.db.query('api::notification.notification').findMany({
        where,
        orderBy: { createdAt: 'desc' },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: {
          actor: { populate: OWNER_POPULATE },
          actorDog: { populate: DOG_SUMMARY_POPULATE },
          post: { populate: { media: true } },
          comment: true,
        },
      }),
      strapi.db.query('api::notification.notification').count({ where }),
    ]);

    const order = ['new', 'today', 'week', 'month', 'earlier'];
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
      const bucket = bucketOf(row.createdAt);
      if (!grouped.has(bucket)) grouped.set(bucket, []);
      grouped.get(bucket)!.push(serializeNotification(row));
    }

    ctx.body = {
      data: order
        .filter((key) => grouped.has(key))
        .map((key) => ({ key, label: BUCKET_LABELS[key], items: grouped.get(key) })),
      meta: { scope, page, pageSize, pageCount: Math.ceil(total / pageSize), total },
    };
  },

  /** GET /api/notifications/unread-count — จุดแดงบนไอคอนกระดิ่ง */
  async unreadCount(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const count = await strapi.db.query('api::notification.notification').count({
      where: { recipient: user.id, isRead: false },
    });
    ctx.body = { count };
  },

  /** POST /api/notifications/read-all */
  async readAll(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    await strapi.db.query('api::notification.notification').updateMany({
      where: { recipient: user.id, isRead: false },
      data: { isRead: true },
    });
    ctx.body = { ok: true };
  },
}));
