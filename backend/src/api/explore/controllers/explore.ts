import { clampInt } from '../../../utils/format';
import {
  absoluteUrl,
  serializeDogSummary,
  serializeMedia,
  serializePost,
} from '../../../utils/serializers';
import {
  DOG_SUMMARY_POPULATE,
  OWNER_POPULATE,
  POST_POPULATE,
  buildPostFlags,
} from '../../../utils/viewer';

export default {
  /**
   * GET /api/explore/categories
   * จำนวนระเบียนที่คืนจากที่นี่ = จำนวนแท็บของ TabController บนหน้าสำรวจ
   */
  async categories(ctx: any) {
    const rows = await strapi.db.query('api::explore-category.explore-category').findMany({
      orderBy: { order: 'asc' },
      limit: 50,
    });

    ctx.body = {
      data: rows.map((row: any) => ({
        documentId: row.documentId,
        nameTh: row.nameTh,
        slug: row.slug,
        icon: row.icon,
        isDefault: Boolean(row.isDefault),
      })),
    };
  },

  /** GET /api/explore?category=<slug>&page=1 — กริดรูปของแต่ละแท็บ */
  async find(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 21, 1, 60);
    const slug = ctx.query.category ? String(ctx.query.category) : null;

    const where: Record<string, unknown> = {
      visibility: 'public',
      dog: { isPublic: true },
    };

    if (slug) {
      const category = await strapi.db.query('api::explore-category.explore-category').findOne({
        where: { slug },
      });
      if (!category) return ctx.notFound('ไม่พบหมวดนี้');
      // หมวดเริ่มต้น ("ทั้งหมด") ไม่กรอง เพื่อให้แท็บแรกเห็นทุกโพสต์
      if (!category.isDefault) where.exploreCategory = category.id;
    }

    const [posts, total] = await Promise.all([
      strapi.db.query('api::post.post').findMany({
        where,
        orderBy: { likeCount: 'desc' },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: POST_POPULATE,
      }),
      strapi.db.query('api::post.post').count({ where }),
    ]);

    const flags = await buildPostFlags(strapi, viewer?.id ?? null, posts);

    ctx.body = {
      data: posts.map((post: any) =>
        serializePost(post, {
          likedByMe: flags.liked.has(post.id),
          savedByMe: flags.saved.has(post.id),
          isMine: post.author?.id === viewer?.id,
        })
      ),
      meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total, category: slug },
    };
  },

  /** GET /api/search?q=&type=all|dogs|owners|hashtags|posts */
  async search(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const q = String(ctx.query.q ?? '').trim();
    const type = String(ctx.query.type ?? 'all');

    if (!q) {
      ctx.body = { data: { dogs: [], owners: [], hashtags: [], posts: [] }, meta: { q } };
      return;
    }

    const wants = (key: string) => type === 'all' || type === key;
    const contains = { $containsi: q };

    const [dogs, owners, hashtags, posts] = await Promise.all([
      wants('dogs')
        ? strapi.db.query('api::dog.dog').findMany({
            where: {
              isPublic: true,
              $or: [{ nameTh: contains }, { nameEn: contains }, { handle: contains }],
            },
            limit: 20,
            populate: DOG_SUMMARY_POPULATE,
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
            populate: POST_POPULATE,
          })
        : Promise.resolve([]),
    ]);

    const flags = await buildPostFlags(strapi, viewer?.id ?? null, posts);

    ctx.body = {
      data: {
        dogs: dogs.map(serializeDogSummary),
        owners: owners.map((p: any) => ({
          userDocumentId: p.user?.documentId ?? null,
          username: p.user?.username ?? null,
          displayName: p.displayName,
          avatarUrl: absoluteUrl(p.avatar?.url),
        })),
        hashtags: hashtags.map((h: any) => ({
          documentId: h.documentId,
          name: h.name,
          postCount: h.postCount,
        })),
        posts: posts.map((post: any) =>
          serializePost(post, {
            likedByMe: flags.liked.has(post.id),
            savedByMe: flags.saved.has(post.id),
          })
        ),
      },
      meta: { q, type },
    };
  },
};
