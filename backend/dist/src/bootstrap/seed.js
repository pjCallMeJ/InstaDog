"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const node_fs_1 = __importDefault(require("node:fs"));
const format_1 = require("../utils/format");
const seed_images_1 = require("./seed-images");
/**
 * ข้อมูลตั้งต้นสำหรับห้องเรียน ให้ตรงกับ mockup ของ InstaDog
 * รันซ้ำได้ ถ้ามีผู้ใช้ browny อยู่แล้วจะข้ามทั้งหมด
 */
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Instadog123';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BREEDS = [
    { nameTh: 'โกลเด้น รีทรีฟเวอร์', nameEn: 'Golden Retriever', slug: 'golden-retriever', icon: 'pets' },
    { nameTh: 'ชิบะ อินุ', nameEn: 'Shiba Inu', slug: 'shiba-inu', icon: 'pets' },
    { nameTh: 'ลาบราดอร์', nameEn: 'Labrador', slug: 'labrador', icon: 'pets' },
    { nameTh: 'ปอมเมอเรเนียน', nameEn: 'Pomeranian', slug: 'pomeranian', icon: 'pets' },
    { nameTh: 'คอร์กี้', nameEn: 'Corgi', slug: 'corgi', icon: 'pets' },
    { nameTh: 'บีเกิ้ล', nameEn: 'Beagle', slug: 'beagle', icon: 'pets' },
    { nameTh: 'พุดเดิ้ล', nameEn: 'Poodle', slug: 'poodle', icon: 'pets' },
    { nameTh: 'พันธุ์ผสม', nameEn: 'Mixed Breed', slug: 'mixed-breed', icon: 'pets' },
];
const EXPLORE_CATEGORIES = [
    { nameTh: 'ทั้งหมด', slug: 'all', icon: 'grid_view', order: 0, isDefault: true },
    { nameTh: 'ยอดนิยม', slug: 'popular', icon: 'local_fire_department', order: 1 },
    { nameTh: 'ลูกสุนัข', slug: 'puppy', icon: 'child_care', order: 2 },
    { nameTh: 'เดินเล่น', slug: 'walk', icon: 'directions_walk', order: 3 },
    { nameTh: 'กรูมมิ่ง', slug: 'grooming', icon: 'content_cut', order: 4 },
    { nameTh: 'อาหาร', slug: 'food', icon: 'restaurant', order: 5 },
    { nameTh: 'สุขภาพ', slug: 'health', icon: 'favorite', order: 6 },
    { nameTh: 'คาเฟ่หมา', slug: 'dog-cafe', icon: 'local_cafe', order: 7 },
];
const ACHIEVEMENTS = [
    { code: 'golden-walker', title: 'นักเดินเท้าทองคำ', description: 'เดินสะสมครบ 100 กิโลเมตร', icon: 'directions_walk', colorHex: '#C89B5C' },
    { code: 'pro-chewer', title: 'นักแทะมือโปร', description: 'เล่นของเล่นลับสมองครบ 30 วัน', icon: 'sports_baseball', colorHex: '#A28F82' },
    { code: 'park-star', title: 'ดาวเด่นประจำสวน', description: 'ได้รับถูกใจรวมเกิน 1,000 ครั้ง', icon: 'star', colorHex: '#6D5F57' },
];
const GROOMING_STYLES = [
    {
        name: 'ขนฟูธรรมชาติ',
        description: 'คงความยาวขนเดิม เน้นเล็มปลายให้เป็นทรง เหมาะกับโกลเด้นที่ขนสวยอยู่แล้ว ดูแลง่ายและไม่เปลี่ยนบุคลิก',
        image: 'groom-fluffy.jpg',
        durationMinutes: 90,
        priceThb: 900,
        order: 1,
    },
    {
        name: 'ทรงหมีเท็ดดี้',
        description: 'ตัดขนหน้าและลำตัวให้กลมมน ดูเป็นตุ๊กตาหมี ต้องแปรงทุกวันเพื่อไม่ให้ขนพันกัน',
        image: 'groom-teddy.jpg',
        durationMinutes: 120,
        priceThb: 1200,
        order: 2,
    },
    {
        name: 'ทรงกระชับคลายร้อน',
        description: 'เล็มสั้นลงทั้งตัวแต่ไม่โกนถึงผิว ช่วยระบายความร้อนในหน้าร้อนไทย และยังกันแดดให้ผิวได้',
        image: 'groom-summer.jpg',
        durationMinutes: 75,
        priceThb: 800,
        order: 3,
    },
];
async function uploadSeedImage(strapi, images, fileName) {
    var _a, _b;
    const filePath = images.get(fileName);
    if (!filePath)
        return null;
    const existing = await strapi.db.query('plugin::upload.file').findOne({
        where: { name: fileName },
    });
    if (existing)
        return existing.id;
    const stats = node_fs_1.default.statSync(filePath);
    const uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {},
        files: {
            filepath: filePath,
            originalFilename: fileName,
            mimetype: 'image/jpeg',
            size: stats.size,
        },
    });
    return (_b = (_a = uploaded === null || uploaded === void 0 ? void 0 : uploaded[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
}
async function createUser(strapi, username, email, displayName, bio, avatarId) {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
    });
    const user = await strapi.plugin('users-permissions').service('user').add({
        username,
        email,
        password: DEMO_PASSWORD,
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: role === null || role === void 0 ? void 0 : role.id,
    });
    await strapi.db.query('api::owner-profile.owner-profile').create({
        data: {
            user: user.id,
            displayName,
            bio,
            avatar: avatarId,
            isPublic: true,
            publishedAt: new Date(),
        },
    });
    return user;
}
/**
 * เพื่อนอีกสามตัว แยกออกมาเป็นขั้นตอนของตัวเอง และตรวจทีละ handle
 * จึงเติมให้ฐานข้อมูลที่ seed ไปแล้วได้โดยไม่ต้องลบข้อมูลเดิม
 */
const FRIENDS = [
    { handle: 'biggy.corgi', nameTh: 'น้องบิกกี้', nameEn: 'Biggy', breed: 'corgi', owner: 'คุณเบล', email: 'biggy@instadog.app', avatar: 'story-biggy.jpg', ageMonths: 18, weight: 12.4 },
    { handle: 'chin.poodle', nameTh: 'น้องชิน', nameEn: 'Chin', breed: 'poodle', owner: 'คุณหนิง', email: 'chin@instadog.app', avatar: 'story-chin.jpg', ageMonths: 30, weight: 6.8 },
    { handle: 'mimo.beagle', nameTh: 'น้องมิโม', nameEn: 'Mimo', breed: 'beagle', owner: 'คุณโย', email: 'mimo@instadog.app', avatar: 'post-play.jpg', ageMonths: 22, weight: 11.1 },
];
async function ensureFriendDogs(strapi, images) {
    var _a;
    for (const spec of FRIENDS) {
        const existing = await strapi.db.query('api::dog.dog').findOne({
            where: { handle: spec.handle },
        });
        if (existing)
            continue;
        const breed = await strapi.db.query('api::breed.breed').findOne({ where: { slug: spec.breed } });
        const avatarId = await uploadSeedImage(strapi, images, spec.avatar);
        const owner = await createUser(strapi, spec.handle, spec.email, spec.owner, `เจ้าของ ${spec.nameTh}`, avatarId);
        const birth = new Date();
        birth.setMonth(birth.getMonth() - spec.ageMonths);
        const dog = await strapi.db.query('api::dog.dog').create({
            data: {
                owner: owner.id,
                handle: spec.handle,
                nameTh: spec.nameTh,
                nameEn: spec.nameEn,
                breed: (_a = breed === null || breed === void 0 ? void 0 : breed.id) !== null && _a !== void 0 ? _a : null,
                gender: 'male',
                birthDate: (0, format_1.toDateKey)(birth),
                weight: spec.weight,
                vaccineStatus: 'วัคซีนครบถ้วน',
                bio: `สวัสดี เราคือ ${spec.nameTh} 🐾`,
                avatar: avatarId,
                isPublic: true,
                isPrimary: true,
                seedPostsCount: 40 + spec.ageMonths,
                seedFollowersCount: 300 + spec.ageMonths * 7,
                seedFollowingCount: 120,
                publishedAt: new Date(),
            },
        });
        await strapi.service('api::dog.dog').seedDefaultsFor(dog.id);
        const storyMedia = await uploadSeedImage(strapi, images, spec.avatar);
        await strapi.db.query('api::story.story').create({
            data: {
                dog: dog.id,
                author: owner.id,
                media: storyMedia,
                caption: `วันนี้ของ ${spec.nameTh} 🐾`,
                expiresAt: new Date(Date.now() + 20 * HOUR),
                publishedAt: new Date(Date.now() - 2 * HOUR),
            },
        });
    }
}
/** ปรับยอดตั้งต้นให้ตัวเลขรวมบนโปรไฟล์ตรงกับ mockup เสมอ แม้ seed รอบก่อนจะใช้ค่าอื่น */
async function alignBruniCounts(strapi) {
    const bruni = await strapi.db.query('api::dog.dog').findOne({
        where: { handle: 'browny.thegolden' },
    });
    if (!bruni)
        return;
    const realPosts = await strapi.db.query('api::post.post').count({ where: { dog: bruni.id } });
    const desiredTotal = 246;
    const seedPostsCount = Math.max(0, desiredTotal - realPosts);
    if (Number(bruni.seedPostsCount) !== seedPostsCount) {
        await strapi.db.query('api::dog.dog').update({
            where: { id: bruni.id },
            data: { seedPostsCount },
        });
    }
}
async function runSeed(strapi) {
    var _a, _b, _c, _d, _e;
    const images = await (0, seed_images_1.ensureSeedImages)(strapi);
    const already = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { username: 'browny.thegolden' },
    });
    if (already) {
        // ข้อมูลหลักมีแล้ว แต่ยังเติมส่วนที่เพิ่มภายหลังและปรับตัวเลขให้ตรง mockup ได้
        await ensureFriendDogs(strapi, images);
        await alignBruniCounts(strapi);
        strapi.log.info('[instadog] มีข้อมูลตัวอย่างอยู่แล้ว ตรวจเพิ่มเติมเรียบร้อย');
        return;
    }
    strapi.log.info('[instadog] กำลังสร้างข้อมูลตัวอย่าง...');
    // ---------- ข้อมูลอ้างอิง ----------
    const breedIds = new Map();
    for (const breed of BREEDS) {
        const row = await strapi.db.query('api::breed.breed').create({
            data: { ...breed, publishedAt: new Date() },
        });
        breedIds.set(breed.slug, row.id);
    }
    const categoryIds = new Map();
    for (const category of EXPLORE_CATEGORIES) {
        const row = await strapi.db.query('api::explore-category.explore-category').create({
            data: { isDefault: false, ...category, publishedAt: new Date() },
        });
        categoryIds.set(category.slug, row.id);
    }
    const achievementIds = new Map();
    for (const achievement of ACHIEVEMENTS) {
        const row = await strapi.db.query('api::achievement.achievement').create({
            data: { ...achievement, publishedAt: new Date() },
        });
        achievementIds.set(achievement.code, row.id);
    }
    for (const style of GROOMING_STYLES) {
        const imageId = await uploadSeedImage(strapi, images, style.image);
        await strapi.db.query('api::grooming-style.grooming-style').create({
            data: { ...style, image: imageId, publishedAt: new Date() },
        });
    }
    // ---------- ผู้ใช้และสุนัข ----------
    const bruniAvatar = await uploadSeedImage(strapi, images, 'bruni-avatar.jpg');
    const bruniCover = await uploadSeedImage(strapi, images, 'bruni-cover.jpg');
    const momoAvatar = await uploadSeedImage(strapi, images, 'momo-avatar.jpg');
    const momoCover = await uploadSeedImage(strapi, images, 'momo-cover.jpg');
    const kwan = await createUser(strapi, 'browny.thegolden', 'browny@instadog.app', 'คุณขวัญ', 'ทาสน้องบรูนี่ เต็มเวลา 🐾', bruniAvatar);
    const momoOwner = await createUser(strapi, 'shiba.momo', 'momo@instadog.app', 'คุณมิ้นท์', 'พาโมโม่ตะลุยคาเฟ่ทั่วกรุง', momoAvatar);
    // อายุ 3 ปี 6 เดือน นับจากวันนี้ ให้ตรงชิปบนหน้าโปรไฟล์ใน mockup
    const bruniBirth = new Date();
    bruniBirth.setMonth(bruniBirth.getMonth() - 42);
    const momoBirth = new Date();
    momoBirth.setMonth(momoBirth.getMonth() - 26);
    const bruni = await strapi.db.query('api::dog.dog').create({
        data: {
            owner: kwan.id,
            handle: 'browny.thegolden',
            nameTh: 'บรูนี่',
            nameEn: 'Bruni',
            breed: breedIds.get('golden-retriever'),
            gender: 'male',
            birthDate: (0, format_1.toDateKey)(bruniBirth),
            weight: 28.5,
            vaccineStatus: 'วัคซีนครบถ้วน',
            bio: 'น้องรูนี่ ชอบวิ่งเล่น ชอบกินขนม และรักทุกคนที่เข้ามาในชีวิต 🐾',
            avatar: bruniAvatar,
            coverImage: bruniCover,
            isPublic: true,
            isPrimary: true,
            // ยอดตั้งต้น + โพสต์จริง 5 อัน ให้รวมได้ตรง mockup: 246 โพสต์ / 1.8K ผู้ติดตาม / 312 กำลังติดตาม
            seedPostsCount: 241,
            seedFollowersCount: 1800,
            seedFollowingCount: 312,
            accumulatedKm: 142,
            publishedAt: new Date(),
        },
    });
    const momo = await strapi.db.query('api::dog.dog').create({
        data: {
            owner: momoOwner.id,
            handle: 'shiba.momo',
            nameTh: 'โมโม่',
            nameEn: 'Momo',
            breed: breedIds.get('shiba-inu'),
            gender: 'female',
            birthDate: (0, format_1.toDateKey)(momoBirth),
            weight: 9.2,
            vaccineStatus: 'วัคซีนครบถ้วน',
            bio: 'ชิบะสาวสายคาเฟ่ ชอบนั่งริมหน้าต่างรับแดดอุ่น ☕',
            avatar: momoAvatar,
            coverImage: momoCover,
            isPublic: true,
            isPrimary: true,
            seedPostsCount: 128,
            seedFollowersCount: 940,
            seedFollowingCount: 210,
            accumulatedKm: 76,
            publishedAt: new Date(),
        },
    });
    await strapi.service('api::dog.dog').seedDefaultsFor(bruni.id);
    await strapi.service('api::dog.dog').seedDefaultsFor(momo.id);
    await ensureFriendDogs(strapi, images);
    for (const code of ['golden-walker', 'park-star']) {
        await strapi.db.query('api::dog-achievement.dog-achievement').create({
            data: {
                dog: bruni.id,
                achievement: achievementIds.get(code),
                earnedAt: new Date(Date.now() - 20 * DAY),
                publishedAt: new Date(),
            },
        });
    }
    // ---------- โพสต์ ----------
    const POSTS = [
        {
            dog: bruni,
            author: kwan,
            image: 'post-walk.jpg',
            caption: 'อากาศดีแบบนี้ ไม่เดินเล่นก็ไม่ได้แล้ว 🐾 #InstaDog #น้องโกลเด้น #ชีวิตดีๆกับสุนัข',
            location: 'สวนเบญจกิติ กรุงเทพฯ',
            mood: 'สดใสขี้เล่น',
            aiMoodSummary: 'น้องอารมณ์ดีมาก หางกระดิกตลอดทาง',
            likeCount: 1200,
            commentCount: 48,
            category: 'walk',
            ageHours: 2,
        },
        {
            dog: momo,
            author: momoOwner,
            image: 'post-cafe.jpg',
            caption: 'นั่งรอเจ้าของสั่งกาแฟ ☕ #InstaDog #ชิบะอินุ #คาเฟ่หมา',
            location: 'Dog Friendly Cafe อารีย์',
            mood: 'เท่คูล',
            aiMoodSummary: 'สงบและผ่อนคลาย เหมาะกับบรรยากาศคาเฟ่',
            likeCount: 864,
            commentCount: 31,
            category: 'dog-cafe',
            ageHours: 4,
        },
        {
            dog: bruni,
            author: kwan,
            image: 'post-park.jpg',
            caption: 'วิ่งจนลิ้นห้อย แต่ยังไม่ยอมกลับบ้าน 😆 #InstaDog #เดินเล่น',
            location: 'สวนลุมพินี',
            mood: 'สดใสขี้เล่น',
            likeCount: 642,
            commentCount: 18,
            category: 'walk',
            ageHours: 26,
        },
        {
            dog: bruni,
            author: kwan,
            image: 'post-sunset.jpg',
            caption: 'แสงเย็นสวยจนต้องหยุดถ่าย 🌇 #InstaDog #ชีวิตดีๆกับสุนัข',
            location: 'ริมแม่น้ำเจ้าพระยา',
            mood: 'ง่วงนอน',
            likeCount: 517,
            commentCount: 12,
            category: 'popular',
            ageHours: 50,
        },
        {
            dog: momo,
            author: momoOwner,
            image: 'post-nap.jpg',
            caption: 'งีบบ่ายคือชีวิต 😴 #InstaDog #ชิบะอินุ',
            location: 'บ้าน',
            mood: 'ง่วงนอน',
            likeCount: 398,
            commentCount: 9,
            category: 'popular',
            ageHours: 74,
        },
        {
            dog: momo,
            author: momoOwner,
            image: 'post-treat.jpg',
            caption: 'ได้กลิ่นขนมปุ๊บ มาปั๊บ 🦴 #InstaDog #สายกิน',
            location: 'บ้าน',
            mood: 'สายกิน',
            likeCount: 356,
            commentCount: 7,
            category: 'food',
            ageHours: 96,
        },
        {
            dog: bruni,
            author: kwan,
            image: 'post-beach.jpg',
            caption: 'ทริปทะเลครั้งแรกของน้อง 🌊 #InstaDog #เที่ยวกับหมา',
            location: 'หาดชะอำ',
            mood: 'สดใสขี้เล่น',
            likeCount: 921,
            commentCount: 24,
            category: 'popular',
            ageHours: 130,
        },
        {
            dog: bruni,
            author: kwan,
            image: 'post-groom.jpg',
            caption: 'ตัดขนใหม่ หล่อขึ้นเยอะเลย ✂️ #InstaDog #กรูมมิ่ง',
            location: 'InstaDog Grooming Studio',
            mood: 'เท่คูล',
            likeCount: 274,
            commentCount: 6,
            category: 'grooming',
            ageHours: 170,
        },
        {
            dog: momo,
            author: momoOwner,
            image: 'post-play.jpg',
            caption: 'ของเล่นใหม่มาแล้ว 🎾 #InstaDog #ลูกสุนัข',
            location: 'บ้าน',
            mood: 'สดใสขี้เล่น',
            likeCount: 188,
            commentCount: 4,
            category: 'puppy',
            ageHours: 210,
        },
    ];
    const createdPosts = [];
    for (const spec of POSTS) {
        const mediaId = await uploadSeedImage(strapi, images, spec.image);
        if (!mediaId)
            continue;
        const tagNames = (0, format_1.parseHashtags)(spec.caption);
        const hashtagIds = [];
        for (const name of tagNames) {
            let tag = await strapi.db.query('api::hashtag.hashtag').findOne({ where: { name } });
            if (!tag) {
                tag = await strapi.db.query('api::hashtag.hashtag').create({
                    data: { name, postCount: 0, publishedAt: new Date() },
                });
            }
            await strapi.db.query('api::hashtag.hashtag').update({
                where: { id: tag.id },
                data: { postCount: Number((_a = tag.postCount) !== null && _a !== void 0 ? _a : 0) + 1 },
            });
            hashtagIds.push(tag.id);
        }
        const createdAt = new Date(Date.now() - spec.ageHours * HOUR);
        const post = await strapi.db.query('api::post.post').create({
            data: {
                author: spec.author.id,
                dog: spec.dog.id,
                caption: spec.caption,
                media: [mediaId],
                location: spec.location,
                mood: spec.mood,
                aiMoodSummary: (_b = spec.aiMoodSummary) !== null && _b !== void 0 ? _b : null,
                visibility: 'public',
                likeCount: spec.likeCount,
                commentCount: spec.commentCount,
                saveCount: Math.round(spec.likeCount / 12),
                hashtags: hashtagIds,
                exploreCategory: (_c = categoryIds.get(spec.category)) !== null && _c !== void 0 ? _c : null,
                createdAt,
                publishedAt: createdAt,
            },
        });
        createdPosts.push(post);
    }
    // ความคิดเห็นที่แสดงใต้โพสต์แรก
    const firstPost = createdPosts[0];
    if (firstPost) {
        await strapi.db.query('api::comment.comment').create({
            data: {
                post: firstPost.id,
                author: momoOwner.id,
                dog: momo.id,
                text: 'น้องน่ารักมากกก 😍 วันหลังไปเดินด้วยกันนะ',
                publishedAt: new Date(Date.now() - HOUR),
            },
        });
    }
    // ---------- สตอรี่ ----------
    const STORIES = [
        { dog: bruni, author: kwan, image: 'story-bruni.jpg', caption: 'ออกเดินแล้ว!' },
        { dog: momo, author: momoOwner, image: 'story-momo.jpg', caption: 'คาเฟ่วันนี้คนเยอะ' },
    ];
    for (const spec of STORIES) {
        const mediaId = await uploadSeedImage(strapi, images, spec.image);
        if (!mediaId)
            continue;
        await strapi.db.query('api::story.story').create({
            data: {
                dog: spec.dog.id,
                author: spec.author.id,
                media: mediaId,
                caption: spec.caption,
                expiresAt: new Date(Date.now() + 20 * HOUR),
                publishedAt: new Date(Date.now() - 3 * HOUR),
            },
        });
    }
    // ---------- ติดตามและแจ้งเตือน ----------
    await strapi.db.query('api::follow.follow').create({
        data: { follower: momoOwner.id, dog: bruni.id, status: 'accepted', publishedAt: new Date() },
    });
    const NOTIFICATIONS = [
        { type: 'like', scope: 'you', message: 'ถูกใจโพสต์ของคุณ', ageHours: 1, post: createdPosts[0] },
        { type: 'comment', scope: 'you', message: 'แสดงความคิดเห็น: น้องน่ารักมากกก 😍', ageHours: 1, post: createdPosts[0] },
        { type: 'follow', scope: 'you', message: 'เริ่มติดตาม บรูนี่', ageHours: 5, post: null },
        { type: 'like', scope: 'you', message: 'ถูกใจโพสต์ของคุณ', ageHours: 30, post: createdPosts[2] },
        { type: 'mention', scope: 'you', message: 'กล่าวถึงคุณในความคิดเห็น', ageHours: 80, post: createdPosts[3] },
        { type: 'like', scope: 'following', message: 'ถูกใจโพสต์ 3 รายการ', ageHours: 3, post: createdPosts[1] },
        { type: 'follow', scope: 'following', message: 'เริ่มติดตาม โมโม่', ageHours: 6, post: null },
        { type: 'like', scope: 'following', message: 'ถูกใจโพสต์ของ โมโม่', ageHours: 40, post: createdPosts[4] },
    ];
    for (const spec of NOTIFICATIONS) {
        const createdAt = new Date(Date.now() - spec.ageHours * HOUR);
        await strapi.db.query('api::notification.notification').create({
            data: {
                recipient: kwan.id,
                actor: momoOwner.id,
                actorDog: momo.id,
                type: spec.type,
                scope: spec.scope,
                message: spec.message,
                post: (_e = (_d = spec.post) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : null,
                isRead: false,
                createdAt,
                publishedAt: createdAt,
            },
        });
    }
    // ---------- กิจกรรมย้อนหลังและการเดินเล่น ----------
    const routePhoto = await uploadSeedImage(strapi, images, 'walk-route.jpg');
    const keys = (0, format_1.lastSevenDateKeys)();
    await strapi.db.query('api::walk-session.walk-session').create({
        data: {
            dog: bruni.id,
            user: kwan.id,
            startedAt: new Date(Date.now() - 3 * HOUR),
            endedAt: new Date(Date.now() - 3 * HOUR + 22 * 60 * 1000),
            durationSec: 22 * 60,
            steps: 2140,
            distanceKm: 1.39,
            calories: 96,
            status: 'finished',
            routePhoto,
            publishedAt: new Date(),
        },
    });
    const todayRow = await strapi.db.query('api::daily-activity.daily-activity').findOne({
        where: { dog: bruni.id, date: keys[keys.length - 1] },
    });
    if (todayRow) {
        await strapi.db.query('api::daily-activity.daily-activity').update({
            where: { id: todayRow.id },
            data: { steps: 4820, distanceKm: 3.13, calories: 217 },
        });
    }
    await alignBruniCounts(strapi);
    strapi.log.info('[instadog] สร้างข้อมูลตัวอย่างเรียบร้อย');
    strapi.log.info(`[instadog] บัญชีทดสอบ: browny@instadog.app / momo@instadog.app (รหัสผ่านจาก SEED_PASSWORD, ค่าเริ่มต้น "${DEMO_PASSWORD}")`);
}
