import { factories } from '@strapi/strapi';

import { clampInt, formatAgeTh } from '../../../utils/format';
import {
  absoluteUrl,
  serializeDogDetail,
  serializeDogSummary,
  serializeMedia,
  serializePost,
} from '../../../utils/serializers';
import {
  DOG_SUMMARY_POPULATE,
  OWNER_POPULATE,
  POST_POPULATE,
  buildPostFlags,
  countDogFollowers,
  countDogFollowing,
  countDogPosts,
  createNotification,
  findDogByRef,
  getPrimaryDog,
  isFollowingDog,
  requireUser,
} from '../../../utils/viewer';

export default factories.createCoreController('api::dog.dog', () => ({
  /** GET /api/dogs/:ref/profile — ส่วนหัวโปรไฟล์ทั้งหมดในครั้งเดียว */
  async profile(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const [posts, followers, following, isFollowing, achievements] = await Promise.all([
      countDogPosts(strapi, dog),
      countDogFollowers(strapi, dog),
      countDogFollowing(strapi, dog),
      isFollowingDog(strapi, viewer?.id ?? null, dog.id),
      strapi.db.query('api::dog-achievement.dog-achievement').findMany({
        where: { dog: dog.id },
        populate: { achievement: true },
      }),
    ]);

    ctx.body = {
      data: serializeDogDetail(dog, {
        isMine: dog.owner?.id === viewer?.id,
        isFollowing,
        counts: { posts, followers, following },
        achievements: achievements
          .map((a: any) => a.achievement)
          .filter(Boolean)
          .map((a: any) => ({
            code: a.code,
            title: a.title,
            description: a.description,
            icon: a.icon,
            colorHex: a.colorHex,
          })),
      }),
    };
  },

  /** GET /api/dogs/:ref/posts — แท็บ "โพสต์" (กริดรูปแรกของแต่ละโพสต์) */
  async posts(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 18, 1, 60);
    const isOwner = dog.owner?.id === viewer?.id;

    if (!dog.isPublic && !isOwner) {
      ctx.body = {
        data: [],
        meta: { page, pageSize, pageCount: 0, total: 0, isPrivate: true },
      };
      return;
    }

    const where = { dog: dog.id };
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

    const flags = await buildPostFlags(strapi, viewer?.id ?? null, posts);
    ctx.body = {
      data: posts.map((post: any) =>
        serializePost(post, {
          likedByMe: flags.liked.has(post.id),
          savedByMe: flags.saved.has(post.id),
          isMine: isOwner,
        })
      ),
      meta: { page, pageSize, pageCount: Math.ceil(total / pageSize), total, isPrivate: false },
    };
  },

  /** GET /api/dogs/:ref/photos — แท็บ "รูปภาพ" แยกเป็นรายรูป ไม่ใช่รายโพสต์ */
  async photos(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const isOwner = dog.owner?.id === viewer?.id;
    if (!dog.isPublic && !isOwner) {
      ctx.body = { data: [], meta: { total: 0, isPrivate: true } };
      return;
    }

    const posts = await strapi.db.query('api::post.post').findMany({
      where: { dog: dog.id },
      orderBy: { createdAt: 'desc' },
      limit: 120,
      populate: { media: true },
    });

    const photos = posts.flatMap((post: any) =>
      (post.media ?? []).map((file: any) => ({
        ...serializeMedia(file),
        postDocumentId: post.documentId,
      }))
    );

    ctx.body = { data: photos, meta: { total: photos.length, isPrivate: false } };
  },

  /** GET /api/dogs/:ref/about — แท็บ "เกี่ยวกับ" */
  async about(ctx: any) {
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const [nutrition, achievements, totalWalks] = await Promise.all([
      strapi.db.query('api::nutrition-plan.nutrition-plan').findOne({ where: { dog: dog.id } }),
      strapi.db.query('api::dog-achievement.dog-achievement').findMany({
        where: { dog: dog.id },
        populate: { achievement: true },
      }),
      strapi.db.query('api::walk-session.walk-session').count({
        where: { dog: dog.id, status: 'finished' },
      }),
    ]);

    ctx.body = {
      data: {
        bio: dog.bio ?? '',
        facts: [
          { label: 'สายพันธุ์', value: dog.breed?.nameTh ?? '-', icon: 'pets' },
          { label: 'อายุ', value: formatAgeTh(dog.birthDate) || '-', icon: 'calendar_month' },
          { label: 'เพศ', value: dog.gender === 'female' ? 'เพศเมีย' : 'เพศผู้', icon: 'wc' },
          { label: 'น้ำหนัก', value: dog.weight ? `${dog.weight} กก.` : '-', icon: 'monitor_weight' },
          { label: 'วัคซีน', value: dog.vaccineStatus ?? '-', icon: 'vaccines' },
          { label: 'ระยะสะสม', value: `${Number(dog.accumulatedKm ?? 0)} กม.`, icon: 'directions_walk' },
        ],
        owner: {
          displayName: dog.owner?.ownerProfile?.displayName ?? dog.owner?.username ?? null,
          username: dog.owner?.username ?? null,
          bio: dog.owner?.ownerProfile?.bio ?? null,
          avatarUrl: absoluteUrl(dog.owner?.ownerProfile?.avatar?.url),
        },
        nutrition: nutrition
          ? {
              dailyKcal: nutrition.dailyKcal,
              dryFoodGram: nutrition.dryFoodGram,
              mealsPerDay: nutrition.mealsPerDay,
            }
          : null,
        achievements: achievements
          .map((a: any) => a.achievement)
          .filter(Boolean)
          .map((a: any) => ({ code: a.code, title: a.title, icon: a.icon, colorHex: a.colorHex })),
        totalWalks,
      },
    };
  },

  /** POST /api/dogs/:ref/follow — สลับติดตาม */
  async toggleFollow(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');
    if (dog.owner?.id === user.id) return ctx.badRequest('ติดตามสุนัขของตัวเองไม่ได้');

    const existing = await strapi.db.query('api::follow.follow').findOne({
      where: { follower: user.id, dog: dog.id },
    });

    let following: boolean;
    if (existing) {
      await strapi.db.query('api::follow.follow').delete({ where: { id: existing.id } });
      following = false;
    } else {
      await strapi.db.query('api::follow.follow').create({
        data: {
          follower: user.id,
          dog: dog.id,
          status: dog.isPublic ? 'accepted' : 'pending',
          publishedAt: new Date(),
        },
      });
      following = dog.isPublic;

      const actorDog = await getPrimaryDog(strapi, user.id);
      await createNotification(strapi, {
        recipientId: dog.owner?.id,
        actorId: user.id,
        actorDogId: actorDog?.id ?? null,
        type: dog.isPublic ? 'follow' : 'follow_request',
        scope: 'you',
        message: dog.isPublic
          ? `เริ่มติดตาม ${dog.nameTh}`
          : `ขอติดตาม ${dog.nameTh}`,
      });
    }

    const followersCount = await countDogFollowers(strapi, dog);
    ctx.body = { following, followersCount };
  },

  /** GET /api/dogs/:ref/followers */
  async followers(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 20, 1, 50);

    const rows = await strapi.db.query('api::follow.follow').findMany({
      where: { dog: dog.id, status: 'accepted' },
      orderBy: { createdAt: 'desc' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: {
        follower: { populate: { ...OWNER_POPULATE, dogs: { populate: DOG_SUMMARY_POPULATE } } },
      },
    });

    const data = [] as any[];
    for (const row of rows) {
      const follower = row.follower;
      if (!follower) continue;
      const theirDog = follower.dogs?.[0] ?? null;
      data.push({
        userDocumentId: follower.documentId,
        username: follower.username,
        displayName: follower.ownerProfile?.displayName ?? follower.username,
        avatarUrl: absoluteUrl(follower.ownerProfile?.avatar?.url),
        dog: serializeDogSummary(theirDog),
        isFollowedByMe: theirDog
          ? await isFollowingDog(strapi, viewer?.id ?? null, theirDog.id)
          : false,
      });
    }

    ctx.body = { data, meta: { page, pageSize } };
  },

  /** GET /api/dogs/:ref/following — สุนัขที่เจ้าของของโปรไฟล์นี้ติดตามอยู่ */
  async following(ctx: any) {
    const viewer = ctx.state?.user ?? null;
    const dog = await findDogByRef(strapi, ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 20, 1, 50);

    const rows = await strapi.db.query('api::follow.follow').findMany({
      where: { follower: dog.owner?.id ?? -1, status: 'accepted' },
      orderBy: { createdAt: 'desc' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: { dog: { populate: { ...DOG_SUMMARY_POPULATE, owner: { populate: OWNER_POPULATE } } } },
    });

    const data = [] as any[];
    for (const row of rows) {
      if (!row.dog) continue;
      data.push({
        ...serializeDogSummary(row.dog),
        ownerDisplayName: row.dog.owner?.ownerProfile?.displayName ?? row.dog.owner?.username ?? null,
        isFollowedByMe: await isFollowingDog(strapi, viewer?.id ?? null, row.dog.id),
      });
    }

    ctx.body = { data, meta: { page, pageSize } };
  },

  /** PUT /api/dogs/:ref — แก้ไขโปรไฟล์สุนัขของตัวเอง */
  async update(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await findDogByRef(strapi, ctx.params.id ?? ctx.params.ref);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');
    if (dog.owner?.id !== user.id) return ctx.forbidden('แก้ไขได้เฉพาะสุนัขของตัวเอง');

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const data: Record<string, unknown> = {};

    for (const key of ['nameTh', 'nameEn', 'bio', 'vaccineStatus', 'gender', 'birthDate']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.weight !== undefined) data.weight = Number(body.weight);
    if (body.isPublic !== undefined) data.isPublic = Boolean(body.isPublic);
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.coverImage !== undefined) data.coverImage = body.coverImage;
    if (body.breed !== undefined) {
      const breed = await strapi.db.query('api::breed.breed').findOne({
        where: { $or: [{ documentId: String(body.breed) }, { slug: String(body.breed) }] },
      });
      data.breed = breed?.id ?? null;
    }

    await strapi.db.query('api::dog.dog').update({ where: { id: dog.id }, data });
    const updated = await findDogByRef(strapi, dog.documentId);
    ctx.body = { data: serializeDogDetail(updated, { isMine: true }) };
  },
}));
