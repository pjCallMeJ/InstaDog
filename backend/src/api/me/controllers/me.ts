import { clampInt } from '../../../utils/format';
import {
  absoluteUrl,
  serializeDogDetail,
  serializeDogSummary,
  serializePost,
} from '../../../utils/serializers';
import {
  DOG_SUMMARY_POPULATE,
  POST_POPULATE,
  buildPostFlags,
  countDogFollowers,
  countDogFollowing,
  countDogPosts,
  getPrimaryDog,
  requireUser,
} from '../../../utils/viewer';

async function loadOwnerProfile(userId: number) {
  return strapi.db.query('api::owner-profile.owner-profile').findOne({
    where: { user: userId },
    populate: { avatar: true },
  });
}

export default {
  /** GET /api/me/profile — ข้อมูลเจ้าของ + สุนัขทั้งหมด ใช้ตอนบูตแอป */
  async profile(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const [profile, dogs] = await Promise.all([
      loadOwnerProfile(user.id),
      strapi.db.query('api::dog.dog').findMany({
        where: { owner: user.id },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        populate: { avatar: true, coverImage: true, breed: true, owner: true },
      }),
    ]);

    const primary = dogs[0] ?? null;
    ctx.body = {
      data: {
        userDocumentId: user.documentId,
        username: user.username,
        email: user.email,
        displayName: profile?.displayName ?? user.username,
        bio: profile?.bio ?? null,
        website: profile?.website ?? null,
        gender: profile?.gender ?? 'unspecified',
        isPublic: profile?.isPublic ?? true,
        avatarUrl: absoluteUrl(profile?.avatar?.url),
        dogs: dogs.map((d: any) => serializeDogSummary(d)),
        primaryDog: primary
          ? serializeDogDetail(primary, {
              counts: {
                posts: await countDogPosts(strapi, primary),
                followers: await countDogFollowers(strapi, primary),
                following: await countDogFollowing(strapi, primary),
              },
            })
          : null,
      },
    };
  },

  /** PUT /api/me/profile — หน้าแก้ไขโปรไฟล์เจ้าของ */
  async updateProfile(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const data: Record<string, unknown> = {};

    if (body.displayName !== undefined) data.displayName = String(body.displayName).slice(0, 50);
    if (body.bio !== undefined) data.bio = String(body.bio).slice(0, 150);
    if (body.website !== undefined) data.website = body.website;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.isPublic !== undefined) data.isPublic = Boolean(body.isPublic);
    if (body.avatar !== undefined) data.avatar = body.avatar;

    const existing = await loadOwnerProfile(user.id);
    if (existing) {
      await strapi.db.query('api::owner-profile.owner-profile').update({
        where: { id: existing.id },
        data,
      });
    } else {
      await strapi.db.query('api::owner-profile.owner-profile').create({
        data: {
          user: user.id,
          displayName: (data.displayName as string) ?? user.username,
          isPublic: true,
          ...data,
          publishedAt: new Date(),
        },
      });
    }

    return this.profile(ctx);
  },

  /** GET /api/me/dogs */
  async dogs(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dogs = await strapi.db.query('api::dog.dog').findMany({
      where: { owner: user.id },
      orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
      populate: DOG_SUMMARY_POPULATE,
    });
    ctx.body = { data: dogs.map(serializeDogSummary) };
  },

  /** POST /api/me/dogs — เพิ่มสัตว์เลี้ยงใหม่ */
  async addDog(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const nameTh = String(body.nameTh ?? '').trim();
    if (!nameTh) return ctx.badRequest('ต้องระบุชื่อน้องหมา');

    const handle = await strapi
      .service('api::dog.dog')
      .buildUniqueHandle(body.handle ?? body.nameEn ?? nameTh);

    let breedId: number | null = null;
    if (body.breed) {
      const breed = await strapi.db.query('api::breed.breed').findOne({
        where: { $or: [{ documentId: String(body.breed) }, { slug: String(body.breed) }] },
      });
      breedId = breed?.id ?? null;
    }

    const existingCount = await strapi.db.query('api::dog.dog').count({ where: { owner: user.id } });

    const created = await strapi.db.query('api::dog.dog').create({
      data: {
        owner: user.id,
        handle,
        nameTh,
        nameEn: body.nameEn ?? null,
        breed: breedId,
        gender: body.gender === 'female' ? 'female' : 'male',
        birthDate: body.birthDate ?? null,
        weight: body.weight !== undefined ? Number(body.weight) : null,
        bio: body.bio ?? null,
        avatar: body.avatar ?? null,
        coverImage: body.coverImage ?? null,
        isPublic: body.isPublic === undefined ? true : Boolean(body.isPublic),
        isPrimary: existingCount === 0,
        publishedAt: new Date(),
      },
    });

    await strapi.service('api::dog.dog').seedDefaultsFor(created.id);

    const full = await strapi.db.query('api::dog.dog').findOne({
      where: { id: created.id },
      populate: { avatar: true, coverImage: true, breed: true, owner: true },
    });
    ctx.body = { data: serializeDogDetail(full, { isMine: true }) };
  },

  /** GET /api/me/saved — โพสต์ที่กด bookmark ไว้ */
  async saved(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const page = clampInt(ctx.query.page, 1, 1, 10_000);
    const pageSize = clampInt(ctx.query.pageSize, 21, 1, 60);

    const rows = await strapi.db.query('api::saved-post.saved-post').findMany({
      where: { user: user.id },
      orderBy: { createdAt: 'desc' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      populate: { post: { populate: POST_POPULATE } },
    });

    const posts = rows.map((r: any) => r.post).filter(Boolean);
    const flags = await buildPostFlags(strapi, user.id, posts);

    ctx.body = {
      data: posts.map((post: any) =>
        serializePost(post, {
          likedByMe: flags.liked.has(post.id),
          savedByMe: true,
          isMine: post.author?.id === user.id,
        })
      ),
      meta: { page, pageSize },
    };
  },
};
