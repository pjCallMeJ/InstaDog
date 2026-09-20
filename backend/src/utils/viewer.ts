/**
 * ตัวช่วยที่ใช้ร่วมกันทุก custom controller
 * รวมการหา "ผู้ชมปัจจุบัน" สุนัขตัวหลัก และ flag ไลค์/บันทึก/ติดตาม
 */

export const DOG_SUMMARY_POPULATE = {
  avatar: true,
  breed: true,
} as const;

export const OWNER_POPULATE = {
  ownerProfile: { populate: { avatar: true } },
} as const;

export const POST_POPULATE = {
  media: true,
  hashtags: true,
  dog: { populate: DOG_SUMMARY_POPULATE },
  author: { populate: OWNER_POPULATE },
} as const;

export function requireUser(ctx: any) {
  const user = ctx.state?.user;
  if (!user) {
    return ctx.unauthorized('ต้องเข้าสู่ระบบก่อน');
  }
  return user;
}

/** สุนัขตัวหลักของผู้ใช้ ใช้เป็นตัวตนเริ่มต้นตอนโพสต์/แชท/ดูกิจกรรม */
export async function getPrimaryDog(strapi: any, userId: number) {
  const dogs = await strapi.db.query('api::dog.dog').findMany({
    where: { owner: userId },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    limit: 1,
    populate: { avatar: true, breed: true, coverImage: true, owner: true },
  });
  return dogs[0] ?? null;
}

/** หาสุนัขจาก documentId หรือ handle ก็ได้ เพื่อให้ route เดียวรองรับทั้งสองแบบ */
export async function findDogByRef(strapi: any, ref: string, populate?: Record<string, unknown>) {
  if (!ref) return null;
  const where = { $or: [{ documentId: ref }, { handle: ref }] };
  return strapi.db.query('api::dog.dog').findOne({
    where,
    populate: populate ?? {
      avatar: true,
      coverImage: true,
      breed: true,
      owner: { populate: OWNER_POPULATE },
    },
  });
}

/**
 * ดึงสถานะ ไลค์ / บันทึก / ติดตาม ของผู้ชมปัจจุบันเป็นชุดเดียว
 * เพื่อไม่ต้องยิง query ต่อโพสต์ (N+1)
 */
export async function buildPostFlags(strapi: any, userId: number | null, posts: any[]) {
  const empty = {
    liked: new Set<number>(),
    saved: new Set<number>(),
    followedDogs: new Set<number>(),
  };
  if (!userId || posts.length === 0) return empty;

  const postIds = posts.map((p) => p.id);
  const dogIds = [...new Set(posts.map((p) => p.dog?.id).filter(Boolean))];

  const [likes, saves, follows] = await Promise.all([
    strapi.db.query('api::like.like').findMany({
      where: { user: userId, post: { id: { $in: postIds } } },
      populate: { post: true },
    }),
    strapi.db.query('api::saved-post.saved-post').findMany({
      where: { user: userId, post: { id: { $in: postIds } } },
      populate: { post: true },
    }),
    dogIds.length
      ? strapi.db.query('api::follow.follow').findMany({
          where: { follower: userId, dog: { id: { $in: dogIds } }, status: 'accepted' },
          populate: { dog: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    liked: new Set<number>(likes.map((l: any) => l.post?.id).filter(Boolean)),
    saved: new Set<number>(saves.map((s: any) => s.post?.id).filter(Boolean)),
    followedDogs: new Set<number>(follows.map((f: any) => f.dog?.id).filter(Boolean)),
  };
}

/** นับผู้ติดตามจริง บวกยอดตั้งต้นจาก seed เพื่อให้ตัวเลขตรงกับ mockup (1.8K) */
export async function countDogFollowers(strapi: any, dog: any) {
  const real = await strapi.db.query('api::follow.follow').count({
    where: { dog: dog.id, status: 'accepted' },
  });
  return real + Number(dog.seedFollowersCount ?? 0);
}

export async function countDogFollowing(strapi: any, dog: any) {
  const ownerId = dog.owner?.id ?? dog.owner;
  const real = ownerId
    ? await strapi.db.query('api::follow.follow').count({
        where: { follower: ownerId, status: 'accepted' },
      })
    : 0;
  return real + Number(dog.seedFollowingCount ?? 0);
}

export async function countDogPosts(strapi: any, dog: any) {
  const real = await strapi.db.query('api::post.post').count({ where: { dog: dog.id } });
  return real + Number(dog.seedPostsCount ?? 0);
}

export async function isFollowingDog(strapi: any, userId: number | null, dogId: number) {
  if (!userId) return false;
  const count = await strapi.db.query('api::follow.follow').count({
    where: { follower: userId, dog: dogId, status: 'accepted' },
  });
  return count > 0;
}

/** สร้าง/เชื่อมแฮชแท็กจากรายชื่อ คืน id ไว้ต่อกับโพสต์ */
export async function upsertHashtags(strapi: any, names: string[]) {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.replace(/^#/, '').trim();
    if (!name) continue;

    let tag = await strapi.db.query('api::hashtag.hashtag').findOne({ where: { name } });
    if (!tag) {
      tag = await strapi.db.query('api::hashtag.hashtag').create({
        data: { name, postCount: 0 },
      });
    }
    await strapi.db.query('api::hashtag.hashtag').update({
      where: { id: tag.id },
      data: { postCount: Number(tag.postCount ?? 0) + 1 },
    });
    ids.push(tag.id);
  }
  return ids;
}

export async function createNotification(
  strapi: any,
  data: {
    recipientId?: number | null;
    actorId: number;
    actorDogId?: number | null;
    type: string;
    scope?: 'you' | 'following';
    message: string;
    postId?: number | null;
    commentId?: number | null;
  }
) {
  if (!data.recipientId || data.recipientId === data.actorId) return null;

  return strapi.db.query('api::notification.notification').create({
    data: {
      recipient: data.recipientId,
      actor: data.actorId,
      actorDog: data.actorDogId ?? null,
      type: data.type,
      scope: data.scope ?? 'you',
      message: data.message,
      post: data.postId ?? null,
      comment: data.commentId ?? null,
      isRead: false,
      publishedAt: new Date(),
    },
  });
}
