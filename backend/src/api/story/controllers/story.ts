import { factories } from '@strapi/strapi';

import { timeAgoTh } from '../../../utils/format';
import { absoluteUrl, serializeDogSummary } from '../../../utils/serializers';
import {
  DOG_SUMMARY_POPULATE,
  createNotification,
  getPrimaryDog,
  requireUser,
} from '../../../utils/viewer';

const DAY_MS = 24 * 60 * 60 * 1000;

export default factories.createCoreController('api::story.story', () => ({
  /**
   * GET /api/stories
   * คืนแถบสตอรี่ของหน้าแรก จัดกลุ่มหนึ่งวงต่อหนึ่งสุนัข พร้อม hasUnseen สำหรับวงแหวนไล่สี
   */
  async ring(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const stories = await strapi.db.query('api::story.story').findMany({
      where: { expiresAt: { $gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      limit: 200,
      populate: {
        media: true,
        dog: { populate: DOG_SUMMARY_POPULATE },
      },
    });

    const seen = await strapi.db.query('api::story-view.story-view').findMany({
      where: { user: user.id, story: { id: { $in: stories.map((s: any) => s.id) } } },
      populate: { story: true },
    });
    const seenIds = new Set(seen.map((v: any) => v.story?.id).filter(Boolean));

    const groups = new Map<number, any>();
    for (const story of stories) {
      if (!story.dog) continue;
      if (!groups.has(story.dog.id)) {
        groups.set(story.dog.id, {
          dog: serializeDogSummary(story.dog),
          hasUnseen: false,
          items: [],
        });
      }
      const group = groups.get(story.dog.id);
      const isSeen = seenIds.has(story.id);
      if (!isSeen) group.hasUnseen = true;
      group.items.push({
        documentId: story.documentId,
        imageUrl: absoluteUrl(story.media?.url),
        caption: story.caption ?? null,
        timeAgo: timeAgoTh(story.createdAt),
        isSeen,
      });
    }

    const myDog = await getPrimaryDog(strapi, user.id);
    ctx.body = {
      // ช่องแรกของแถบคือปุ่ม "สร้างสตอรี่"
      self: myDog ? serializeDogSummary(myDog) : null,
      data: [...groups.values()].sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen)),
    };
  },

  /** POST /api/stories */
  async publish(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    if (!body.media) return ctx.badRequest('ต้องแนบรูปสตอรี่');

    const dog = body.dog
      ? await strapi.db.query('api::dog.dog').findOne({
          where: { documentId: String(body.dog), owner: user.id },
        })
      : await getPrimaryDog(strapi, user.id);
    if (!dog) return ctx.badRequest('ไม่พบสุนัขของคุณ');

    const created = await strapi.db.query('api::story.story').create({
      data: {
        dog: dog.id,
        author: user.id,
        media: body.media,
        caption: body.caption ?? null,
        expiresAt: new Date(Date.now() + DAY_MS),
        publishedAt: new Date(),
      },
      populate: { media: true },
    });

    ctx.body = {
      data: {
        documentId: created.documentId,
        imageUrl: absoluteUrl(created.media?.url),
        caption: created.caption,
        timeAgo: 'เมื่อสักครู่',
      },
    };
  },

  /** POST /api/stories/:id/view */
  async markViewed(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const story = await strapi.db.query('api::story.story').findOne({
      where: { documentId: ctx.params.id },
    });
    if (!story) return ctx.notFound('ไม่พบสตอรี่');

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
  async reply(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return ctx.badRequest('ข้อความว่างไม่ได้');

    const story = await strapi.db.query('api::story.story').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true, dog: true },
    });
    if (!story) return ctx.notFound('ไม่พบสตอรี่');

    const actorDog = await getPrimaryDog(strapi, user.id);
    await createNotification(strapi, {
      recipientId: story.author?.id,
      actorId: user.id,
      actorDogId: actorDog?.id ?? null,
      type: 'story_reply',
      scope: 'you',
      message: `ตอบกลับสตอรี่: ${text.slice(0, 60)}`,
    });

    ctx.body = { sent: true };
  },
}));
