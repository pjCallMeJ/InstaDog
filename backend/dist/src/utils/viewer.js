"use strict";
/**
 * ตัวช่วยที่ใช้ร่วมกันทุก custom controller
 * รวมการหา "ผู้ชมปัจจุบัน" สุนัขตัวหลัก และ flag ไลค์/บันทึก/ติดตาม
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST_POPULATE = exports.OWNER_POPULATE = exports.DOG_SUMMARY_POPULATE = void 0;
exports.requireUser = requireUser;
exports.getPrimaryDog = getPrimaryDog;
exports.findDogByRef = findDogByRef;
exports.buildPostFlags = buildPostFlags;
exports.countDogFollowers = countDogFollowers;
exports.countDogFollowing = countDogFollowing;
exports.countDogPosts = countDogPosts;
exports.isFollowingDog = isFollowingDog;
exports.upsertHashtags = upsertHashtags;
exports.createNotification = createNotification;
exports.DOG_SUMMARY_POPULATE = {
    avatar: true,
    breed: true,
};
exports.OWNER_POPULATE = {
    ownerProfile: { populate: { avatar: true } },
};
exports.POST_POPULATE = {
    media: true,
    hashtags: true,
    dog: { populate: exports.DOG_SUMMARY_POPULATE },
    author: { populate: exports.OWNER_POPULATE },
};
function requireUser(ctx) {
    var _a;
    const user = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.user;
    if (!user) {
        return ctx.unauthorized('ต้องเข้าสู่ระบบก่อน');
    }
    return user;
}
/** สุนัขตัวหลักของผู้ใช้ ใช้เป็นตัวตนเริ่มต้นตอนโพสต์/แชท/ดูกิจกรรม */
async function getPrimaryDog(strapi, userId) {
    var _a;
    const dogs = await strapi.db.query('api::dog.dog').findMany({
        where: { owner: userId },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        limit: 1,
        populate: { avatar: true, breed: true, coverImage: true, owner: true },
    });
    return (_a = dogs[0]) !== null && _a !== void 0 ? _a : null;
}
/** หาสุนัขจาก documentId หรือ handle ก็ได้ เพื่อให้ route เดียวรองรับทั้งสองแบบ */
async function findDogByRef(strapi, ref, populate) {
    if (!ref)
        return null;
    const where = { $or: [{ documentId: ref }, { handle: ref }] };
    return strapi.db.query('api::dog.dog').findOne({
        where,
        populate: populate !== null && populate !== void 0 ? populate : {
            avatar: true,
            coverImage: true,
            breed: true,
            owner: { populate: exports.OWNER_POPULATE },
        },
    });
}
/**
 * ดึงสถานะ ไลค์ / บันทึก / ติดตาม ของผู้ชมปัจจุบันเป็นชุดเดียว
 * เพื่อไม่ต้องยิง query ต่อโพสต์ (N+1)
 */
async function buildPostFlags(strapi, userId, posts) {
    const empty = {
        liked: new Set(),
        saved: new Set(),
        followedDogs: new Set(),
    };
    if (!userId || posts.length === 0)
        return empty;
    const postIds = posts.map((p) => p.id);
    const dogIds = [...new Set(posts.map((p) => { var _a; return (_a = p.dog) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean))];
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
        liked: new Set(likes.map((l) => { var _a; return (_a = l.post) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)),
        saved: new Set(saves.map((s) => { var _a; return (_a = s.post) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)),
        followedDogs: new Set(follows.map((f) => { var _a; return (_a = f.dog) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean)),
    };
}
/** นับผู้ติดตามจริง บวกยอดตั้งต้นจาก seed เพื่อให้ตัวเลขตรงกับ mockup (1.8K) */
async function countDogFollowers(strapi, dog) {
    var _a;
    const real = await strapi.db.query('api::follow.follow').count({
        where: { dog: dog.id, status: 'accepted' },
    });
    return real + Number((_a = dog.seedFollowersCount) !== null && _a !== void 0 ? _a : 0);
}
async function countDogFollowing(strapi, dog) {
    var _a, _b, _c;
    const ownerId = (_b = (_a = dog.owner) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : dog.owner;
    const real = ownerId
        ? await strapi.db.query('api::follow.follow').count({
            where: { follower: ownerId, status: 'accepted' },
        })
        : 0;
    return real + Number((_c = dog.seedFollowingCount) !== null && _c !== void 0 ? _c : 0);
}
async function countDogPosts(strapi, dog) {
    var _a;
    const real = await strapi.db.query('api::post.post').count({ where: { dog: dog.id } });
    return real + Number((_a = dog.seedPostsCount) !== null && _a !== void 0 ? _a : 0);
}
async function isFollowingDog(strapi, userId, dogId) {
    if (!userId)
        return false;
    const count = await strapi.db.query('api::follow.follow').count({
        where: { follower: userId, dog: dogId, status: 'accepted' },
    });
    return count > 0;
}
/** สร้าง/เชื่อมแฮชแท็กจากรายชื่อ คืน id ไว้ต่อกับโพสต์ */
async function upsertHashtags(strapi, names) {
    var _a;
    const ids = [];
    for (const raw of names) {
        const name = raw.replace(/^#/, '').trim();
        if (!name)
            continue;
        let tag = await strapi.db.query('api::hashtag.hashtag').findOne({ where: { name } });
        if (!tag) {
            tag = await strapi.db.query('api::hashtag.hashtag').create({
                data: { name, postCount: 0 },
            });
        }
        await strapi.db.query('api::hashtag.hashtag').update({
            where: { id: tag.id },
            data: { postCount: Number((_a = tag.postCount) !== null && _a !== void 0 ? _a : 0) + 1 },
        });
        ids.push(tag.id);
    }
    return ids;
}
async function createNotification(strapi, data) {
    var _a, _b, _c, _d;
    if (!data.recipientId || data.recipientId === data.actorId)
        return null;
    return strapi.db.query('api::notification.notification').create({
        data: {
            recipient: data.recipientId,
            actor: data.actorId,
            actorDog: (_a = data.actorDogId) !== null && _a !== void 0 ? _a : null,
            type: data.type,
            scope: (_b = data.scope) !== null && _b !== void 0 ? _b : 'you',
            message: data.message,
            post: (_c = data.postId) !== null && _c !== void 0 ? _c : null,
            comment: (_d = data.commentId) !== null && _d !== void 0 ? _d : null,
            isRead: false,
            publishedAt: new Date(),
        },
    });
}
