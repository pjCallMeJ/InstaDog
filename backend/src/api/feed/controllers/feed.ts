import { clampInt } from '../../../utils/format';
import { serializePost } from '../../../utils/serializers';
import { POST_POPULATE, buildPostFlags, requireUser } from '../../../utils/viewer';

export default {
  /** GET /api/feed — ไทม์ไลน์หลักของหน้าแรก */
  async find(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 10, 1, 50);

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
        populate: POST_POPULATE,
      }),
      strapi.db.query('api::post.post').count({ where }),
    ]);

    const flags = await buildPostFlags(strapi, user.id, posts);

    ctx.body = {
      data: posts.map((post: any) =>
        serializePost(post, {
          likedByMe: flags.liked.has(post.id),
          savedByMe: flags.saved.has(post.id),
          isFollowing: post.dog ? flags.followedDogs.has(post.dog.id) : false,
          isMine: post.author?.id === user.id,
        })
      ),
      meta: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },
};
