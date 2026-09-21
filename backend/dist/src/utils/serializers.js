"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.absoluteUrl = absoluteUrl;
exports.serializeMedia = serializeMedia;
exports.serializeMediaList = serializeMediaList;
exports.serializeOwner = serializeOwner;
exports.serializeDogSummary = serializeDogSummary;
exports.serializeDogDetail = serializeDogDetail;
exports.serializePost = serializePost;
exports.serializeComment = serializeComment;
exports.serializeNotification = serializeNotification;
const format_1 = require("./format");
/**
 * Flutter (โดยเฉพาะบน Chrome) ต้องได้ URL เต็มเสมอ
 * provider `local` ของ Strapi คืน path ขึ้นต้นด้วย "/" เท่านั้น
 */
function absoluteUrl(url) {
    if (!url)
        return null;
    if (/^https?:\/\//i.test(url))
        return url;
    const base = process.env.PUBLIC_URL || 'http://localhost:1337';
    return `${base.replace(/\/$/, '')}${url}`;
}
function serializeMedia(file) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!file)
        return null;
    return {
        id: file.id,
        documentId: (_a = file.documentId) !== null && _a !== void 0 ? _a : null,
        url: absoluteUrl(file.url),
        thumbnailUrl: absoluteUrl((_d = (_c = (_b = file.formats) === null || _b === void 0 ? void 0 : _b.thumbnail) === null || _c === void 0 ? void 0 : _c.url) !== null && _d !== void 0 ? _d : file.url),
        mime: (_e = file.mime) !== null && _e !== void 0 ? _e : null,
        width: (_f = file.width) !== null && _f !== void 0 ? _f : null,
        height: (_g = file.height) !== null && _g !== void 0 ? _g : null,
    };
}
function serializeMediaList(files) {
    if (!Array.isArray(files))
        return [];
    return files.map(serializeMedia).filter(Boolean);
}
function serializeOwner(user) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!user)
        return null;
    const profile = (_a = user.ownerProfile) !== null && _a !== void 0 ? _a : null;
    return {
        documentId: (_b = user.documentId) !== null && _b !== void 0 ? _b : null,
        username: (_c = user.username) !== null && _c !== void 0 ? _c : null,
        displayName: (_e = (_d = profile === null || profile === void 0 ? void 0 : profile.displayName) !== null && _d !== void 0 ? _d : user.username) !== null && _e !== void 0 ? _e : null,
        bio: (_f = profile === null || profile === void 0 ? void 0 : profile.bio) !== null && _f !== void 0 ? _f : null,
        avatarUrl: absoluteUrl((_g = profile === null || profile === void 0 ? void 0 : profile.avatar) === null || _g === void 0 ? void 0 : _g.url),
        isPublic: (_h = profile === null || profile === void 0 ? void 0 : profile.isPublic) !== null && _h !== void 0 ? _h : true,
    };
}
/** ข้อมูลสุนัขแบบย่อ สำหรับหัวการ์ดโพสต์ วงสตอรี่ และผลการค้นหา */
function serializeDogSummary(dog) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!dog)
        return null;
    return {
        documentId: (_a = dog.documentId) !== null && _a !== void 0 ? _a : null,
        handle: (_b = dog.handle) !== null && _b !== void 0 ? _b : null,
        nameTh: (_c = dog.nameTh) !== null && _c !== void 0 ? _c : null,
        nameEn: (_d = dog.nameEn) !== null && _d !== void 0 ? _d : null,
        avatarUrl: absoluteUrl((_e = dog.avatar) === null || _e === void 0 ? void 0 : _e.url),
        breedNameTh: (_g = (_f = dog.breed) === null || _f === void 0 ? void 0 : _f.nameTh) !== null && _g !== void 0 ? _g : null,
        isPublic: (_h = dog.isPublic) !== null && _h !== void 0 ? _h : true,
    };
}
function serializeDogDetail(dog, extra = {}) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!dog)
        return null;
    return {
        ...serializeDogSummary(dog),
        coverUrl: absoluteUrl((_a = dog.coverImage) === null || _a === void 0 ? void 0 : _a.url),
        bio: (_b = dog.bio) !== null && _b !== void 0 ? _b : null,
        gender: (_c = dog.gender) !== null && _c !== void 0 ? _c : null,
        birthDate: (_d = dog.birthDate) !== null && _d !== void 0 ? _d : null,
        ageText: (0, format_1.formatAgeTh)(dog.birthDate),
        weight: (_e = dog.weight) !== null && _e !== void 0 ? _e : null,
        vaccineStatus: (_f = dog.vaccineStatus) !== null && _f !== void 0 ? _f : null,
        breed: dog.breed
            ? { documentId: dog.breed.documentId, nameTh: dog.breed.nameTh, nameEn: dog.breed.nameEn, slug: dog.breed.slug }
            : null,
        owner: serializeOwner(dog.owner),
        accumulatedKm: Number((_g = dog.accumulatedKm) !== null && _g !== void 0 ? _g : 0),
        ...extra,
    };
}
function serializePost(post, flags = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    if (!post)
        return null;
    const media = serializeMediaList(post.media);
    const likeCount = Number((_a = post.likeCount) !== null && _a !== void 0 ? _a : 0);
    const commentCount = Number((_b = post.commentCount) !== null && _b !== void 0 ? _b : 0);
    return {
        documentId: post.documentId,
        caption: (_c = post.caption) !== null && _c !== void 0 ? _c : '',
        media,
        coverUrl: (_e = (_d = media[0]) === null || _d === void 0 ? void 0 : _d.url) !== null && _e !== void 0 ? _e : null,
        mediaCount: media.length,
        location: (_f = post.location) !== null && _f !== void 0 ? _f : null,
        mood: (_g = post.mood) !== null && _g !== void 0 ? _g : null,
        aiMoodSummary: (_h = post.aiMoodSummary) !== null && _h !== void 0 ? _h : null,
        visibility: (_j = post.visibility) !== null && _j !== void 0 ? _j : 'public',
        likeCount,
        likeCountText: (0, format_1.compactCount)(likeCount),
        commentCount,
        commentCountText: (0, format_1.compactCount)(commentCount),
        saveCount: Number((_k = post.saveCount) !== null && _k !== void 0 ? _k : 0),
        hashtags: Array.isArray(post.hashtags) ? post.hashtags.map((h) => h.name) : [],
        dog: serializeDogSummary(post.dog),
        author: serializeOwner(post.author),
        createdAt: post.createdAt,
        timeAgo: (0, format_1.timeAgoTh)(post.createdAt),
        likedByMe: (_l = flags.likedByMe) !== null && _l !== void 0 ? _l : false,
        savedByMe: (_m = flags.savedByMe) !== null && _m !== void 0 ? _m : false,
        isFollowing: (_o = flags.isFollowing) !== null && _o !== void 0 ? _o : false,
        isMine: (_p = flags.isMine) !== null && _p !== void 0 ? _p : false,
    };
}
function serializeComment(comment) {
    var _a;
    if (!comment)
        return null;
    return {
        documentId: comment.documentId,
        text: comment.text,
        author: serializeOwner(comment.author),
        dog: serializeDogSummary(comment.dog),
        likeCount: Number((_a = comment.likeCount) !== null && _a !== void 0 ? _a : 0),
        createdAt: comment.createdAt,
        timeAgo: (0, format_1.timeAgoTh)(comment.createdAt),
    };
}
function serializeNotification(notification) {
    var _a, _b, _c, _d, _e, _f;
    if (!notification)
        return null;
    const post = notification.post;
    const postCover = Array.isArray(post === null || post === void 0 ? void 0 : post.media) ? serializeMedia(post.media[0]) : null;
    return {
        documentId: notification.documentId,
        type: notification.type,
        scope: (_a = notification.scope) !== null && _a !== void 0 ? _a : 'you',
        message: (_b = notification.message) !== null && _b !== void 0 ? _b : '',
        isRead: Boolean(notification.isRead),
        actor: serializeOwner(notification.actor),
        actorDog: serializeDogSummary(notification.actorDog),
        postDocumentId: (_c = post === null || post === void 0 ? void 0 : post.documentId) !== null && _c !== void 0 ? _c : null,
        postThumbnailUrl: (_d = postCover === null || postCover === void 0 ? void 0 : postCover.thumbnailUrl) !== null && _d !== void 0 ? _d : null,
        commentText: (_f = (_e = notification.comment) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : null,
        createdAt: notification.createdAt,
        timeAgo: (0, format_1.timeAgoTh)(notification.createdAt),
    };
}
