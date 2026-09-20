import { compactCount, formatAgeTh, timeAgoTh } from './format';

/**
 * Flutter (โดยเฉพาะบน Chrome) ต้องได้ URL เต็มเสมอ
 * provider `local` ของ Strapi คืน path ขึ้นต้นด้วย "/" เท่านั้น
 */
export function absoluteUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.PUBLIC_URL || 'http://localhost:1337';
  return `${base.replace(/\/$/, '')}${url}`;
}

export function serializeMedia(file: any) {
  if (!file) return null;
  return {
    id: file.id,
    documentId: file.documentId ?? null,
    url: absoluteUrl(file.url),
    thumbnailUrl: absoluteUrl(file.formats?.thumbnail?.url ?? file.url),
    mime: file.mime ?? null,
    width: file.width ?? null,
    height: file.height ?? null,
  };
}

export function serializeMediaList(files: any): any[] {
  if (!Array.isArray(files)) return [];
  return files.map(serializeMedia).filter(Boolean);
}

export function serializeOwner(user: any) {
  if (!user) return null;
  const profile = user.ownerProfile ?? null;
  return {
    documentId: user.documentId ?? null,
    username: user.username ?? null,
    displayName: profile?.displayName ?? user.username ?? null,
    bio: profile?.bio ?? null,
    avatarUrl: absoluteUrl(profile?.avatar?.url),
    isPublic: profile?.isPublic ?? true,
  };
}

/** ข้อมูลสุนัขแบบย่อ สำหรับหัวการ์ดโพสต์ วงสตอรี่ และผลการค้นหา */
export function serializeDogSummary(dog: any) {
  if (!dog) return null;
  return {
    documentId: dog.documentId ?? null,
    handle: dog.handle ?? null,
    nameTh: dog.nameTh ?? null,
    nameEn: dog.nameEn ?? null,
    avatarUrl: absoluteUrl(dog.avatar?.url),
    breedNameTh: dog.breed?.nameTh ?? null,
    isPublic: dog.isPublic ?? true,
  };
}

export function serializeDogDetail(dog: any, extra: Record<string, unknown> = {}) {
  if (!dog) return null;
  return {
    ...serializeDogSummary(dog),
    coverUrl: absoluteUrl(dog.coverImage?.url),
    bio: dog.bio ?? null,
    gender: dog.gender ?? null,
    birthDate: dog.birthDate ?? null,
    ageText: formatAgeTh(dog.birthDate),
    weight: dog.weight ?? null,
    vaccineStatus: dog.vaccineStatus ?? null,
    breed: dog.breed
      ? { documentId: dog.breed.documentId, nameTh: dog.breed.nameTh, nameEn: dog.breed.nameEn, slug: dog.breed.slug }
      : null,
    owner: serializeOwner(dog.owner),
    accumulatedKm: Number(dog.accumulatedKm ?? 0),
    ...extra,
  };
}

type PostFlags = {
  likedByMe?: boolean;
  savedByMe?: boolean;
  isFollowing?: boolean;
  isMine?: boolean;
};

export function serializePost(post: any, flags: PostFlags = {}) {
  if (!post) return null;
  const media = serializeMediaList(post.media);
  const likeCount = Number(post.likeCount ?? 0);
  const commentCount = Number(post.commentCount ?? 0);

  return {
    documentId: post.documentId,
    caption: post.caption ?? '',
    media,
    coverUrl: media[0]?.url ?? null,
    mediaCount: media.length,
    location: post.location ?? null,
    mood: post.mood ?? null,
    aiMoodSummary: post.aiMoodSummary ?? null,
    visibility: post.visibility ?? 'public',
    likeCount,
    likeCountText: compactCount(likeCount),
    commentCount,
    commentCountText: compactCount(commentCount),
    saveCount: Number(post.saveCount ?? 0),
    hashtags: Array.isArray(post.hashtags) ? post.hashtags.map((h: any) => h.name) : [],
    dog: serializeDogSummary(post.dog),
    author: serializeOwner(post.author),
    createdAt: post.createdAt,
    timeAgo: timeAgoTh(post.createdAt),
    likedByMe: flags.likedByMe ?? false,
    savedByMe: flags.savedByMe ?? false,
    isFollowing: flags.isFollowing ?? false,
    isMine: flags.isMine ?? false,
  };
}

export function serializeComment(comment: any) {
  if (!comment) return null;
  return {
    documentId: comment.documentId,
    text: comment.text,
    author: serializeOwner(comment.author),
    dog: serializeDogSummary(comment.dog),
    likeCount: Number(comment.likeCount ?? 0),
    createdAt: comment.createdAt,
    timeAgo: timeAgoTh(comment.createdAt),
  };
}

export function serializeNotification(notification: any) {
  if (!notification) return null;
  const post = notification.post;
  const postCover = Array.isArray(post?.media) ? serializeMedia(post.media[0]) : null;

  return {
    documentId: notification.documentId,
    type: notification.type,
    scope: notification.scope ?? 'you',
    message: notification.message ?? '',
    isRead: Boolean(notification.isRead),
    actor: serializeOwner(notification.actor),
    actorDog: serializeDogSummary(notification.actorDog),
    postDocumentId: post?.documentId ?? null,
    postThumbnailUrl: postCover?.thumbnailUrl ?? null,
    commentText: notification.comment?.text ?? null,
    createdAt: notification.createdAt,
    timeAgo: timeAgoTh(notification.createdAt),
  };
}
