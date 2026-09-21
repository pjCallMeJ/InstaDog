/// โมเดลที่สะท้อน response ของ docs/API.md ตรงตัว
/// ทุกตัวมี factory fromJson ที่ทนต่อ field ที่หายไป เพื่อไม่ให้ UI พังกลางทาง
library;

int _asInt(dynamic value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('${value ?? ''}') ?? fallback;
}

double _asDouble(dynamic value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? fallback;
}

String _asString(dynamic value, [String fallback = '']) {
  if (value == null) return fallback;
  return '$value';
}

List<String> _asStringList(dynamic value) {
  if (value is List) return value.map((e) => '$e').toList();
  return const [];
}

class MediaItem {
  const MediaItem({required this.url, this.thumbnailUrl, this.width, this.height});

  final String url;
  final String? thumbnailUrl;
  final int? width;
  final int? height;

  factory MediaItem.fromJson(Map<String, dynamic> json) => MediaItem(
        url: _asString(json['url']),
        thumbnailUrl: json['thumbnailUrl'] as String?,
        width: json['width'] == null ? null : _asInt(json['width']),
        height: json['height'] == null ? null : _asInt(json['height']),
      );
}

class DogSummary {
  const DogSummary({
    required this.documentId,
    required this.handle,
    required this.nameTh,
    this.nameEn,
    this.avatarUrl,
    this.breedNameTh,
    this.isPublic = true,
  });

  final String documentId;
  final String handle;
  final String nameTh;
  final String? nameEn;
  final String? avatarUrl;
  final String? breedNameTh;
  final bool isPublic;

  factory DogSummary.fromJson(Map<String, dynamic> json) => DogSummary(
        documentId: _asString(json['documentId']),
        handle: _asString(json['handle']),
        nameTh: _asString(json['nameTh']),
        nameEn: json['nameEn'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        breedNameTh: json['breedNameTh'] as String?,
        isPublic: json['isPublic'] as bool? ?? true,
      );
}

class OwnerSummary {
  const OwnerSummary({
    required this.username,
    required this.displayName,
    this.avatarUrl,
    this.bio,
  });

  final String username;
  final String displayName;
  final String? avatarUrl;
  final String? bio;

  factory OwnerSummary.fromJson(Map<String, dynamic> json) => OwnerSummary(
        username: _asString(json['username']),
        displayName: _asString(json['displayName'], _asString(json['username'])),
        avatarUrl: json['avatarUrl'] as String?,
        bio: json['bio'] as String?,
      );
}

class Post {
  Post({
    required this.documentId,
    required this.caption,
    required this.media,
    this.coverUrl,
    this.location,
    required this.likeCount,
    required this.likeCountText,
    required this.commentCount,
    required this.commentCountText,
    required this.hashtags,
    this.dog,
    this.author,
    required this.timeAgo,
    required this.likedByMe,
    required this.savedByMe,
    required this.isFollowing,
    required this.isMine,
  });

  final String documentId;
  final String caption;
  final List<MediaItem> media;
  final String? coverUrl;
  final String? location;
  final int likeCount;
  final String likeCountText;
  final int commentCount;
  final String commentCountText;
  final List<String> hashtags;
  final DogSummary? dog;
  final OwnerSummary? author;
  final String timeAgo;
  final bool likedByMe;
  final bool savedByMe;
  final bool isFollowing;
  final bool isMine;

  factory Post.fromJson(Map<String, dynamic> json) => Post(
        documentId: _asString(json['documentId']),
        caption: _asString(json['caption']),
        media: (json['media'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => MediaItem.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        coverUrl: json['coverUrl'] as String?,
        location: json['location'] as String?,
        likeCount: _asInt(json['likeCount']),
        likeCountText: _asString(json['likeCountText'], '0'),
        commentCount: _asInt(json['commentCount']),
        commentCountText: _asString(json['commentCountText'], '0'),
        hashtags: _asStringList(json['hashtags']),
        dog: json['dog'] is Map ? DogSummary.fromJson(Map<String, dynamic>.from(json['dog'] as Map)) : null,
        author: json['author'] is Map ? OwnerSummary.fromJson(Map<String, dynamic>.from(json['author'] as Map)) : null,
        timeAgo: _asString(json['timeAgo']),
        likedByMe: json['likedByMe'] as bool? ?? false,
        savedByMe: json['savedByMe'] as bool? ?? false,
        isFollowing: json['isFollowing'] as bool? ?? false,
        isMine: json['isMine'] as bool? ?? false,
      );

  /// ใช้กับ optimistic update ตอนกดหัวใจหรือบันทึก
  Post copyWith({
    int? likeCount,
    String? likeCountText,
    int? commentCount,
    String? commentCountText,
    bool? likedByMe,
    bool? savedByMe,
    bool? isFollowing,
  }) {
    return Post(
      documentId: documentId,
      caption: caption,
      media: media,
      coverUrl: coverUrl,
      location: location,
      likeCount: likeCount ?? this.likeCount,
      likeCountText: likeCountText ?? this.likeCountText,
      commentCount: commentCount ?? this.commentCount,
      commentCountText: commentCountText ?? this.commentCountText,
      hashtags: hashtags,
      dog: dog,
      author: author,
      timeAgo: timeAgo,
      likedByMe: likedByMe ?? this.likedByMe,
      savedByMe: savedByMe ?? this.savedByMe,
      isFollowing: isFollowing ?? this.isFollowing,
      isMine: isMine,
    );
  }
}

class PostComment {
  const PostComment({
    required this.documentId,
    required this.text,
    required this.timeAgo,
    this.author,
    this.dog,
  });

  final String documentId;
  final String text;
  final String timeAgo;
  final OwnerSummary? author;
  final DogSummary? dog;

  factory PostComment.fromJson(Map<String, dynamic> json) => PostComment(
        documentId: _asString(json['documentId']),
        text: _asString(json['text']),
        timeAgo: _asString(json['timeAgo']),
        author: json['author'] is Map ? OwnerSummary.fromJson(Map<String, dynamic>.from(json['author'] as Map)) : null,
        dog: json['dog'] is Map ? DogSummary.fromJson(Map<String, dynamic>.from(json['dog'] as Map)) : null,
      );
}

class StoryItem {
  const StoryItem({
    required this.documentId,
    required this.imageUrl,
    this.caption,
    required this.timeAgo,
    required this.isSeen,
  });

  final String documentId;
  final String imageUrl;
  final String? caption;
  final String timeAgo;
  final bool isSeen;

  factory StoryItem.fromJson(Map<String, dynamic> json) => StoryItem(
        documentId: _asString(json['documentId']),
        imageUrl: _asString(json['imageUrl']),
        caption: json['caption'] as String?,
        timeAgo: _asString(json['timeAgo']),
        isSeen: json['isSeen'] as bool? ?? false,
      );
}

class StoryGroup {
  const StoryGroup({required this.dog, required this.hasUnseen, required this.items});

  final DogSummary dog;
  final bool hasUnseen;
  final List<StoryItem> items;

  factory StoryGroup.fromJson(Map<String, dynamic> json) => StoryGroup(
        dog: DogSummary.fromJson(Map<String, dynamic>.from(json['dog'] as Map? ?? {})),
        hasUnseen: json['hasUnseen'] as bool? ?? false,
        items: (json['items'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => StoryItem.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

class StoryFeed {
  const StoryFeed({this.self, required this.groups});

  final DogSummary? self;
  final List<StoryGroup> groups;

  factory StoryFeed.fromJson(Map<String, dynamic> json) => StoryFeed(
        self: json['self'] is Map ? DogSummary.fromJson(Map<String, dynamic>.from(json['self'] as Map)) : null,
        groups: (json['data'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => StoryGroup.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

class ExploreCategory {
  const ExploreCategory({
    required this.documentId,
    required this.nameTh,
    required this.slug,
    required this.icon,
    required this.isDefault,
  });

  final String documentId;
  final String nameTh;
  final String slug;
  final String icon;
  final bool isDefault;

  factory ExploreCategory.fromJson(Map<String, dynamic> json) => ExploreCategory(
        documentId: _asString(json['documentId']),
        nameTh: _asString(json['nameTh']),
        slug: _asString(json['slug']),
        icon: _asString(json['icon'], 'pets'),
        isDefault: json['isDefault'] as bool? ?? false,
      );
}

class DogCounts {
  const DogCounts({required this.posts, required this.followers, required this.following});

  final int posts;
  final int followers;
  final int following;

  factory DogCounts.fromJson(Map<String, dynamic> json) => DogCounts(
        posts: _asInt(json['posts']),
        followers: _asInt(json['followers']),
        following: _asInt(json['following']),
      );
}

class Achievement {
  const Achievement({required this.code, required this.title, required this.icon, this.colorHex});

  final String code;
  final String title;
  final String icon;
  final String? colorHex;

  factory Achievement.fromJson(Map<String, dynamic> json) => Achievement(
        code: _asString(json['code']),
        title: _asString(json['title']),
        icon: _asString(json['icon'], 'emoji_events'),
        colorHex: json['colorHex'] as String?,
      );
}

class DogProfile {
  const DogProfile({
    required this.documentId,
    required this.handle,
    required this.nameTh,
    this.nameEn,
    this.avatarUrl,
    this.coverUrl,
    this.bio,
    this.breedNameTh,
    required this.ageText,
    this.gender,
    this.weight,
    this.vaccineStatus,
    this.owner,
    required this.isMine,
    required this.isFollowing,
    required this.counts,
    required this.achievements,
  });

  final String documentId;
  final String handle;
  final String nameTh;
  final String? nameEn;
  final String? avatarUrl;
  final String? coverUrl;
  final String? bio;
  final String? breedNameTh;
  final String ageText;
  final String? gender;
  final double? weight;
  final String? vaccineStatus;
  final OwnerSummary? owner;
  final bool isMine;
  final bool isFollowing;
  final DogCounts counts;
  final List<Achievement> achievements;

  factory DogProfile.fromJson(Map<String, dynamic> json) => DogProfile(
        documentId: _asString(json['documentId']),
        handle: _asString(json['handle']),
        nameTh: _asString(json['nameTh']),
        nameEn: json['nameEn'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        coverUrl: json['coverUrl'] as String?,
        bio: json['bio'] as String?,
        breedNameTh: json['breedNameTh'] as String?,
        ageText: _asString(json['ageText']),
        gender: json['gender'] as String?,
        weight: json['weight'] == null ? null : _asDouble(json['weight']),
        vaccineStatus: json['vaccineStatus'] as String?,
        owner: json['owner'] is Map ? OwnerSummary.fromJson(Map<String, dynamic>.from(json['owner'] as Map)) : null,
        isMine: json['isMine'] as bool? ?? false,
        isFollowing: json['isFollowing'] as bool? ?? false,
        counts: DogCounts.fromJson(Map<String, dynamic>.from(json['counts'] as Map? ?? {})),
        achievements: (json['achievements'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => Achievement.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

class DogFact {
  const DogFact({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final String icon;

  factory DogFact.fromJson(Map<String, dynamic> json) => DogFact(
        label: _asString(json['label']),
        value: _asString(json['value']),
        icon: _asString(json['icon'], 'info'),
      );
}

class DogAbout {
  const DogAbout({
    required this.bio,
    required this.facts,
    required this.achievements,
    required this.totalWalks,
    this.ownerDisplayName,
    this.ownerBio,
    this.ownerAvatarUrl,
  });

  final String bio;
  final List<DogFact> facts;
  final List<Achievement> achievements;
  final int totalWalks;
  final String? ownerDisplayName;
  final String? ownerBio;
  final String? ownerAvatarUrl;

  factory DogAbout.fromJson(Map<String, dynamic> json) {
    final owner = json['owner'] as Map? ?? const {};
    return DogAbout(
      bio: _asString(json['bio']),
      facts: (json['facts'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => DogFact.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      achievements: (json['achievements'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => Achievement.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      totalWalks: _asInt(json['totalWalks']),
      ownerDisplayName: owner['displayName'] as String?,
      ownerBio: owner['bio'] as String?,
      ownerAvatarUrl: owner['avatarUrl'] as String?,
    );
  }
}

class PhotoTile {
  const PhotoTile({required this.url, this.thumbnailUrl, required this.postDocumentId});

  final String url;
  final String? thumbnailUrl;
  final String postDocumentId;

  factory PhotoTile.fromJson(Map<String, dynamic> json) => PhotoTile(
        url: _asString(json['url']),
        thumbnailUrl: json['thumbnailUrl'] as String?,
        postDocumentId: _asString(json['postDocumentId']),
      );
}

class MeProfile {
  const MeProfile({
    required this.username,
    required this.displayName,
    this.email,
    this.bio,
    this.avatarUrl,
    required this.isPublic,
    required this.dogs,
    this.primaryDog,
    this.primaryCounts,
  });

  final String username;
  final String displayName;
  final String? email;
  final String? bio;
  final String? avatarUrl;
  final bool isPublic;
  final List<DogSummary> dogs;
  final DogSummary? primaryDog;
  final DogCounts? primaryCounts;

  factory MeProfile.fromJson(Map<String, dynamic> json) {
    final primary = json['primaryDog'] as Map?;
    return MeProfile(
      username: _asString(json['username']),
      displayName: _asString(json['displayName']),
      email: json['email'] as String?,
      bio: json['bio'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      isPublic: json['isPublic'] as bool? ?? true,
      dogs: (json['dogs'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => DogSummary.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      primaryDog: primary == null ? null : DogSummary.fromJson(Map<String, dynamic>.from(primary)),
      primaryCounts: primary?['counts'] is Map
          ? DogCounts.fromJson(Map<String, dynamic>.from(primary!['counts'] as Map))
          : null,
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.documentId,
    required this.type,
    required this.message,
    required this.isRead,
    required this.timeAgo,
    this.actor,
    this.actorDog,
    this.postThumbnailUrl,
  });

  final String documentId;
  final String type;
  final String message;
  final bool isRead;
  final String timeAgo;
  final OwnerSummary? actor;
  final DogSummary? actorDog;
  final String? postThumbnailUrl;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        documentId: _asString(json['documentId']),
        type: _asString(json['type']),
        message: _asString(json['message']),
        isRead: json['isRead'] as bool? ?? false,
        timeAgo: _asString(json['timeAgo']),
        actor: json['actor'] is Map ? OwnerSummary.fromJson(Map<String, dynamic>.from(json['actor'] as Map)) : null,
        actorDog: json['actorDog'] is Map ? DogSummary.fromJson(Map<String, dynamic>.from(json['actorDog'] as Map)) : null,
        postThumbnailUrl: json['postThumbnailUrl'] as String?,
      );
}

class NotificationGroup {
  const NotificationGroup({required this.key, required this.label, required this.items});

  final String key;
  final String label;
  final List<AppNotification> items;

  factory NotificationGroup.fromJson(Map<String, dynamic> json) => NotificationGroup(
        key: _asString(json['key']),
        label: _asString(json['label']),
        items: (json['items'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => AppNotification.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

class TodayActivity {
  const TodayActivity({
    required this.steps,
    required this.stepGoal,
    required this.progress,
    required this.distanceKm,
    required this.calories,
    this.note = '',
    this.activeWalkId,
  });

  final int steps;
  final int stepGoal;
  final double progress;
  final double distanceKm;
  final int calories;
  final String note;
  final String? activeWalkId;

  factory TodayActivity.fromJson(Map<String, dynamic> json) => TodayActivity(
        steps: _asInt(json['steps']),
        stepGoal: _asInt(json['stepGoal'], 7000),
        progress: _asDouble(json['progress']),
        distanceKm: _asDouble(json['distanceKm']),
        calories: _asInt(json['calories']),
        note: _asString(json['note']),
        activeWalkId: (json['activeWalk'] as Map?)?['documentId'] as String?,
      );
}

class DayActivity {
  const DayActivity({
    required this.date,
    required this.weekdayTh,
    required this.steps,
    required this.stepGoal,
  });

  final String date;
  final String weekdayTh;
  final int steps;
  final int stepGoal;

  factory DayActivity.fromJson(Map<String, dynamic> json) => DayActivity(
        date: _asString(json['date']),
        weekdayTh: _asString(json['weekdayTh']),
        steps: _asInt(json['steps']),
        stepGoal: _asInt(json['stepGoal'], 7000),
      );
}

class CareRoutine {
  const CareRoutine({
    required this.documentId,
    required this.title,
    required this.scheduledTime,
    required this.category,
    required this.icon,
    required this.isCompleted,
  });

  final String documentId;
  final String title;
  final String scheduledTime;
  final String category;
  final String icon;
  final bool isCompleted;

  factory CareRoutine.fromJson(Map<String, dynamic> json) => CareRoutine(
        documentId: _asString(json['documentId']),
        title: _asString(json['title']),
        scheduledTime: _asString(json['scheduledTime']),
        category: _asString(json['category'], 'food'),
        icon: _asString(json['icon'], 'check_circle'),
        isCompleted: json['isCompleted'] as bool? ?? false,
      );

  CareRoutine copyWith({
    String? title,
    String? scheduledTime,
    String? category,
    String? icon,
    bool? isCompleted,
  }) =>
      CareRoutine(
        documentId: documentId,
        title: title ?? this.title,
        scheduledTime: scheduledTime ?? this.scheduledTime,
        category: category ?? this.category,
        icon: icon ?? this.icon,
        isCompleted: isCompleted ?? this.isCompleted,
      );
}

class WalkLog {
  const WalkLog({
    required this.documentId,
    required this.startedAt,
    required this.durationSec,
    required this.steps,
    required this.distanceKm,
    required this.calories,
    required this.note,
    this.dogNameTh,
  });

  final String documentId;
  final String startedAt;
  final int durationSec;
  final int steps;
  final double distanceKm;
  final int calories;
  final String note;
  final String? dogNameTh;

  factory WalkLog.fromJson(Map<String, dynamic> json) => WalkLog(
        documentId: _asString(json['documentId']),
        startedAt: _asString(json['startedAt']),
        durationSec: _asInt(json['durationSec']),
        steps: _asInt(json['steps']),
        distanceKm: _asDouble(json['distanceKm']),
        calories: _asInt(json['calories']),
        note: _asString(json['note']),
        dogNameTh: json['dogNameTh'] as String?,
      );
}

class CareInsight {
  const CareInsight({
    required this.title,
    required this.message,
    required this.completedRoutines,
    required this.totalRoutines,
  });

  final String title;
  final String message;
  final int completedRoutines;
  final int totalRoutines;

  factory CareInsight.fromJson(Map<String, dynamic> json) => CareInsight(
        title: _asString(json['title']),
        message: _asString(json['message']),
        completedRoutines: _asInt(json['completedRoutines']),
        totalRoutines: _asInt(json['totalRoutines']),
      );
}

class BarkMessage {
  const BarkMessage({
    required this.documentId,
    required this.sender,
    required this.text,
    required this.isEmergency,
    this.payload,
  });

  final String documentId;
  final String sender;
  final String text;
  final bool isEmergency;
  final Map<String, dynamic>? payload;

  bool get isUser => sender == 'user';

  factory BarkMessage.fromJson(Map<String, dynamic> json) => BarkMessage(
        documentId: _asString(json['documentId']),
        sender: _asString(json['sender'], 'ai'),
        text: _asString(json['text']),
        isEmergency: json['isEmergency'] as bool? ?? false,
        payload: json['payload'] is Map ? Map<String, dynamic>.from(json['payload'] as Map) : null,
      );
}

class BarkThread {
  const BarkThread({required this.messages, required this.quickPrompts, this.dog});

  final List<BarkMessage> messages;
  final List<String> quickPrompts;
  final DogSummary? dog;

  factory BarkThread.fromJson(Map<String, dynamic> json) => BarkThread(
        messages: (json['messages'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => BarkMessage.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        quickPrompts: _asStringList(json['quickPrompts']),
        dog: json['dog'] is Map ? DogSummary.fromJson(Map<String, dynamic>.from(json['dog'] as Map)) : null,
      );
}

class GroomingStyle {
  const GroomingStyle({
    required this.documentId,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.durationMinutes,
    required this.priceThb,
  });

  final String documentId;
  final String name;
  final String description;
  final String? imageUrl;
  final int durationMinutes;
  final int priceThb;

  factory GroomingStyle.fromJson(Map<String, dynamic> json) => GroomingStyle(
        documentId: _asString(json['documentId']),
        name: _asString(json['name']),
        description: _asString(json['description']),
        imageUrl: json['imageUrl'] as String?,
        durationMinutes: _asInt(json['durationMinutes']),
        priceThb: _asInt(json['priceThb']),
      );
}

class NutritionPlan {
  const NutritionPlan({
    required this.dailyKcal,
    required this.dryFoodGram,
    required this.mealsPerDay,
    required this.gramPerMeal,
    required this.proteinPct,
    required this.fatPct,
    required this.carbPct,
    required this.forbiddenFoods,
  });

  final int dailyKcal;
  final int dryFoodGram;
  final int mealsPerDay;
  final int gramPerMeal;
  final int proteinPct;
  final int fatPct;
  final int carbPct;
  final List<String> forbiddenFoods;

  factory NutritionPlan.fromJson(Map<String, dynamic> json) => NutritionPlan(
        dailyKcal: _asInt(json['dailyKcal']),
        dryFoodGram: _asInt(json['dryFoodGram']),
        mealsPerDay: _asInt(json['mealsPerDay'], 1),
        gramPerMeal: _asInt(json['gramPerMeal']),
        proteinPct: _asInt(json['proteinPct']),
        fatPct: _asInt(json['fatPct']),
        carbPct: _asInt(json['carbPct']),
        forbiddenFoods: _asStringList(json['forbiddenFoods']),
      );
}

class Breed {
  const Breed({required this.documentId, required this.nameTh, required this.slug});

  final String documentId;
  final String nameTh;
  final String slug;

  factory Breed.fromJson(Map<String, dynamic> json) => Breed(
        documentId: _asString(json['documentId']),
        nameTh: _asString(json['nameTh']),
        slug: _asString(json['slug']),
      );
}

class SearchResults {
  const SearchResults({
    required this.dogs,
    required this.owners,
    required this.hashtags,
    required this.posts,
  });

  final List<DogSummary> dogs;
  final List<OwnerSummary> owners;
  final List<({String name, int postCount})> hashtags;
  final List<Post> posts;

  bool get isEmpty => dogs.isEmpty && owners.isEmpty && hashtags.isEmpty && posts.isEmpty;

  factory SearchResults.fromJson(Map<String, dynamic> json) => SearchResults(
        dogs: (json['dogs'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => DogSummary.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        owners: (json['owners'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => OwnerSummary.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        hashtags: (json['hashtags'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => (name: _asString(e['name']), postCount: _asInt(e['postCount'])))
            .toList(),
        posts: (json['posts'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => Post.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}
