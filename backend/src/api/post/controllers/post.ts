import { factories } from '@strapi/strapi';

import { clampInt, parseHashtags } from '../../../utils/format';
import { serializeComment, serializePost } from '../../../utils/serializers';
import {
  OWNER_POPULATE,
  POST_POPULATE,
  buildPostFlags,
  createNotification,
  getPrimaryDog,
  isFollowingDog,
  requireUser,
  upsertHashtags,
} from '../../../utils/viewer';
import { suggestCaptions } from '../services/caption-writer';

const MAX_MEDIA = 10;

async function loadPost(documentId: string) {
  return strapi.db.query('api::post.post').findOne({
    where: { documentId },
    populate: POST_POPULATE,
  });
}

export default factories.createCoreController('api::post.post', () => ({
  /** POST /api/posts — สร้างโพสต์จาก id ของไฟล์ที่อัปโหลดไว้แล้ว */
  async create(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const mediaIds: number[] = Array.isArray(body.media) ? body.media : [];

    if (mediaIds.length < 1 || mediaIds.length > MAX_MEDIA) {
      return ctx.badRequest(`ต้องแนบรูปอย่างน้อย 1 รูป และไม่เกิน ${MAX_MEDIA} รูป`);
    }

    const files = await strapi.db.query('plugin::upload.file').findMany({
      where: { id: { $in: mediaIds } },
    });
    if (files.length !== mediaIds.length) {
      return ctx.badRequest('มีไฟล์บางรายการไม่ถูกต้อง');
    }
    if (files.some((f: any) => !String(f.mime ?? '').startsWith('image/'))) {
      return ctx.badRequest('รองรับเฉพาะไฟล์รูปภาพ');
    }

    // แท็กสุนัข: ใช้ที่ส่งมา ไม่งั้นตกไปที่สุนัขตัวหลักของผู้ใช้
    let dog = null;
    if (body.dog) {
      dog = await strapi.db.query('api::dog.dog').findOne({
        where: { documentId: String(body.dog), owner: user.id },
      });
      if (!dog) return ctx.badRequest('ไม่พบสุนัขที่เลือก หรือไม่ใช่สุนัขของคุณ');
    } else {
      dog = await getPrimaryDog(strapi, user.id);
    }

    const caption = typeof body.caption === 'string' ? body.caption.slice(0, 2200) : '';
    const explicitTags: string[] = Array.isArray(body.hashtags) ? body.hashtags : [];
    const hashtagNames = [...new Set([...parseHashtags(caption), ...explicitTags.map(String)])];
    const hashtagIds = await upsertHashtags(strapi, hashtagNames);

    let exploreCategoryId: number | null = null;
    if (body.exploreCategory) {
      const cat = await strapi.db.query('api::explore-category.explore-category').findOne({
        where: { $or: [{ documentId: String(body.exploreCategory) }, { slug: String(body.exploreCategory) }] },
      });
      exploreCategoryId = cat?.id ?? null;
    }

    const created = await strapi.db.query('api::post.post').create({
      data: {
        author: user.id,
        dog: dog?.id ?? null,
        caption,
        media: mediaIds,
        location: body.location ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        mood: body.mood ?? null,
        aiMoodSummary: body.aiMoodSummary ?? null,
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
    ctx.body = { data: serializePost(post, { isMine: true }) };
  },

  /** GET /api/posts/:id */
  async findOne(ctx: any) {
    const user = ctx.state?.user ?? null;
    const post = await loadPost(ctx.params.id);
    if (!post) return ctx.notFound('ไม่พบโพสต์');

    const flags = await buildPostFlags(strapi, user?.id ?? null, [post]);
    ctx.body = {
      data: serializePost(post, {
        likedByMe: flags.liked.has(post.id),
        savedByMe: flags.saved.has(post.id),
        isFollowing: post.dog ? flags.followedDogs.has(post.dog.id) : false,
        isMine: post.author?.id === user?.id,
      }),
    };
  },

  /** DELETE /api/posts/:id — เฉพาะเจ้าของเท่านั้น */
  async delete(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const post = await strapi.db.query('api::post.post').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });
    if (!post) return ctx.notFound('ไม่พบโพสต์');
    if (post.author?.id !== user.id) return ctx.forbidden('ลบได้เฉพาะโพสต์ของตัวเอง');

    await strapi.db.query('api::like.like').deleteMany({ where: { post: post.id } });
    await strapi.db.query('api::saved-post.saved-post').deleteMany({ where: { post: post.id } });
    await strapi.db.query('api::comment.comment').deleteMany({ where: { post: post.id } });
    await strapi.db.query('api::notification.notification').deleteMany({ where: { post: post.id } });
    await strapi.db.query('api::post.post').delete({ where: { id: post.id } });

    ctx.body = { data: { documentId: ctx.params.id, deleted: true } };
  },

  /** POST /api/posts/:id/like — สลับสถานะถูกใจ */
  async toggleLike(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const post = await strapi.db.query('api::post.post').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true, dog: true },
    });
    if (!post) return ctx.notFound('ไม่พบโพสต์');

    const existing = await strapi.db.query('api::like.like').findOne({
      where: { user: user.id, post: post.id },
    });

    let liked: boolean;
    let likeCount = Number(post.likeCount ?? 0);

    if (existing) {
      await strapi.db.query('api::like.like').delete({ where: { id: existing.id } });
      likeCount = Math.max(0, likeCount - 1);
      liked = false;
    } else {
      await strapi.db.query('api::like.like').create({
        data: { user: user.id, post: post.id, publishedAt: new Date() },
      });
      likeCount += 1;
      liked = true;

      const actorDog = await getPrimaryDog(strapi, user.id);
      await createNotification(strapi, {
        recipientId: post.author?.id,
        actorId: user.id,
        actorDogId: actorDog?.id ?? null,
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
  async toggleSave(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const post = await strapi.db.query('api::post.post').findOne({
      where: { documentId: ctx.params.id },
    });
    if (!post) return ctx.notFound('ไม่พบโพสต์');

    const existing = await strapi.db.query('api::saved-post.saved-post').findOne({
      where: { user: user.id, post: post.id },
    });

    let saved: boolean;
    let saveCount = Number(post.saveCount ?? 0);

    if (existing) {
      await strapi.db.query('api::saved-post.saved-post').delete({ where: { id: existing.id } });
      saveCount = Math.max(0, saveCount - 1);
      saved = false;
    } else {
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
  async listComments(ctx: any) {
    const post = await strapi.db.query('api::post.post').findOne({
      where: { documentId: ctx.params.id },
    });
    if (!post) return ctx.notFound('ไม่พบโพสต์');

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 20, 1, 50);

    const [comments, total] = await Promise.all([
      strapi.db.query('api::comment.comment').findMany({
        where: { post: post.id },
        orderBy: { createdAt: 'desc' },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: {
          author: { populate: OWNER_POPULATE },
          dog: { populate: { avatar: true, breed: true } },
        },
      }),
      strapi.db.query('api::comment.comment').count({ where: { post: post.id } }),
    ]);

    ctx.body = {
      data: comments.map(serializeComment),
      meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total },
    };
  },

  /** POST /api/posts/:id/comments */
  async addComment(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return ctx.badRequest('ข้อความว่างไม่ได้');

    const post = await strapi.db.query('api::post.post').findOne({
      where: { documentId: ctx.params.id },
      populate: { author: true },
    });
    if (!post) return ctx.notFound('ไม่พบโพสต์');

    const dog = await getPrimaryDog(strapi, user.id);
    const created = await strapi.db.query('api::comment.comment').create({
      data: {
        post: post.id,
        author: user.id,
        dog: dog?.id ?? null,
        text: text.slice(0, 1000),
        publishedAt: new Date(),
      },
    });

    const commentCount = Number(post.commentCount ?? 0) + 1;
    await strapi.db.query('api::post.post').update({
      where: { id: post.id },
      data: { commentCount },
    });

    await createNotification(strapi, {
      recipientId: post.author?.id,
      actorId: user.id,
      actorDogId: dog?.id ?? null,
      type: 'comment',
      scope: 'you',
      message: `แสดงความคิดเห็น: ${text.slice(0, 60)}`,
      postId: post.id,
      commentId: created.id,
    });

    const full = await strapi.db.query('api::comment.comment').findOne({
      where: { id: created.id },
      populate: {
        author: { populate: OWNER_POPULATE },
        dog: { populate: { avatar: true, breed: true } },
      },
    });

    ctx.body = { data: serializeComment(full), commentCount };
  },

  /** POST /api/posts/caption-suggestions — ผู้ช่วยเขียนแคปชั่น */
  async suggestCaption(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    let dogName = typeof body.dogName === 'string' ? body.dogName.trim() : '';
    if (!dogName && body.dog) {
      const dog = await strapi.db.query('api::dog.dog').findOne({
        where: { documentId: String(body.dog), owner: user.id },
      });
      dogName = dog?.nameTh ?? '';
    }
    if (!dogName) {
      const primary = await getPrimaryDog(strapi, user.id);
      dogName = primary?.nameTh ?? '';
    }

    ctx.body = {
      data: {
        suggestions: suggestCaptions({
          dogName,
          mood: typeof body.mood === 'string' ? body.mood : null,
          location: typeof body.location === 'string' ? body.location : null,
          hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
        }),
      },
    };
  },
}));
