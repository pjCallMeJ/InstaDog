import 'package:dio/dio.dart';

import '../models/models.dart';
import '../network/api_client.dart';

/// รวมการเรียก API ทั้งหมดไว้ที่เดียว หน้าจอเรียกผ่านคลาสนี้เท่านั้น
class InstadogRepository {
  InstadogRepository(this._api);

  final ApiClient _api;

  List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    }
    return const [];
  }

  Map<String, dynamic> _map(dynamic value) {
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  // ---------- Auth ----------

  Future<String> login(String identifier, String password) async {
    final json = await _api.post('/auth/local', body: {
      'identifier': identifier,
      'password': password,
    });
    return '${json['jwt']}';
  }

  Future<String> registerWithDog({
    required String username,
    required String email,
    required String password,
    required String displayName,
    required String dogNameTh,
    String? dogNameEn,
    String? breedSlug,
    String gender = 'male',
    String? birthDate,
    double? weight,
  }) async {
    final json = await _api.post('/auth/register-with-dog', body: {
      'username': username,
      'email': email,
      'password': password,
      'displayName': displayName,
      'dog': {
        'nameTh': dogNameTh,
        if (dogNameEn != null && dogNameEn.isNotEmpty) 'nameEn': dogNameEn,
        'breed': ?breedSlug,
        'gender': gender,
        'birthDate': ?birthDate,
        'weight': ?weight,
      },
    });
    return '${json['jwt']}';
  }

  Future<void> changePassword({
    required String currentPassword,
    required String password,
  }) async {
    await _api.post('/auth/change-password', body: {
      'currentPassword': currentPassword,
      'password': password,
      'passwordConfirmation': password,
    });
  }

  Future<List<Breed>> breeds() async {
    final json = await _api.get('/breeds');
    return _list(json['data']).map(Breed.fromJson).toList();
  }

  // ---------- Me ----------

  Future<MeProfile> myProfile() async {
    final json = await _api.get('/me/profile');
    return MeProfile.fromJson(_map(json['data']));
  }

  Future<MeProfile> updateMyProfile({
    String? displayName,
    String? bio,
    bool? isPublic,
    int? avatarId,
  }) async {
    final json = await _api.put('/me/profile', body: {
      'displayName': ?displayName,
      'bio': ?bio,
      'isPublic': ?isPublic,
      'avatar': ?avatarId,
    });
    return MeProfile.fromJson(_map(json['data']));
  }

  Future<List<Post>> savedPosts() async {
    final json = await _api.get('/me/saved');
    return _list(json['data']).map(Post.fromJson).toList();
  }

  // ---------- Feed ----------

  Future<List<Post>> feed({int page = 1, int pageSize = 10}) async {
    final json = await _api.get('/feed', query: {'page': page, 'pageSize': pageSize});
    return _list(json['data']).map(Post.fromJson).toList();
  }

  Future<StoryFeed> stories() async {
    final json = await _api.get('/stories');
    return StoryFeed.fromJson(json);
  }

  Future<void> markStorySeen(String storyId) => _api.post('/stories/$storyId/view');

  Future<void> replyToStory(String storyId, String text) =>
      _api.post('/stories/$storyId/reply', body: {'text': text});

  // ---------- Post interactions ----------

  Future<({bool liked, int likeCount})> toggleLike(String postId) async {
    final json = await _api.post('/posts/$postId/like');
    return (liked: json['liked'] as bool? ?? false, likeCount: json['likeCount'] as int? ?? 0);
  }

  Future<bool> toggleSave(String postId) async {
    final json = await _api.post('/posts/$postId/save');
    return json['saved'] as bool? ?? false;
  }

  Future<List<PostComment>> comments(String postId) async {
    final json = await _api.get('/posts/$postId/comments');
    return _list(json['data']).map(PostComment.fromJson).toList();
  }

  Future<({PostComment comment, int commentCount})> addComment(String postId, String text) async {
    final json = await _api.post('/posts/$postId/comments', body: {'text': text});
    return (
      comment: PostComment.fromJson(_map(json['data'])),
      commentCount: json['commentCount'] as int? ?? 0,
    );
  }

  Future<void> deletePost(String postId) => _api.delete('/posts/$postId');

  Future<List<int>> uploadImages(List<MultipartFile> files) => _api.uploadImages(files);

  Future<Post> createPost({
    required List<int> mediaIds,
    required String caption,
    String? location,
    String? mood,
    String visibility = 'public',
    String? dogDocumentId,
    String? exploreCategorySlug,
    List<String> hashtags = const [],
  }) async {
    final json = await _api.post('/posts', body: {
      'data': {
        'media': mediaIds,
        'caption': caption,
        if (location != null && location.isNotEmpty) 'location': location,
        if (mood != null && mood.isNotEmpty) 'mood': mood,
        'visibility': visibility,
        'dog': ?dogDocumentId,
        'exploreCategory': ?exploreCategorySlug,
        if (hashtags.isNotEmpty) 'hashtags': hashtags,
      },
    });
    return Post.fromJson(_map(json['data']));
  }

  // ---------- Explore / Search ----------

  Future<List<ExploreCategory>> exploreCategories() async {
    final json = await _api.get('/explore/categories');
    return _list(json['data']).map(ExploreCategory.fromJson).toList();
  }

  Future<List<Post>> explore(String categorySlug, {int page = 1}) async {
    final json = await _api.get('/explore', query: {
      'category': categorySlug,
      'page': page,
      'pageSize': 21,
    });
    return _list(json['data']).map(Post.fromJson).toList();
  }

  Future<SearchResults> search(String query) async {
    final json = await _api.get('/search', query: {'q': query});
    return SearchResults.fromJson(_map(json['data']));
  }

  // ---------- Notifications ----------

  Future<List<NotificationGroup>> notifications({required String scope}) async {
    final json = await _api.get('/notifications', query: {'scope': scope});
    return _list(json['data']).map(NotificationGroup.fromJson).toList();
  }

  Future<int> unreadCount() async {
    final json = await _api.get('/notifications/unread-count');
    return json['count'] as int? ?? 0;
  }

  Future<void> markAllRead() => _api.post('/notifications/read-all');

  // ---------- Dog profile ----------

  Future<DogProfile> dogProfile(String ref) async {
    final json = await _api.get('/dogs/$ref/profile');
    return DogProfile.fromJson(_map(json['data']));
  }

  Future<List<Post>> dogPosts(String ref) async {
    final json = await _api.get('/dogs/$ref/posts');
    return _list(json['data']).map(Post.fromJson).toList();
  }

  Future<List<PhotoTile>> dogPhotos(String ref) async {
    final json = await _api.get('/dogs/$ref/photos');
    return _list(json['data']).map(PhotoTile.fromJson).toList();
  }

  Future<DogAbout> dogAbout(String ref) async {
    final json = await _api.get('/dogs/$ref/about');
    return DogAbout.fromJson(_map(json['data']));
  }

  Future<({bool following, int followersCount})> toggleFollow(String ref) async {
    final json = await _api.post('/dogs/$ref/follow');
    return (
      following: json['following'] as bool? ?? false,
      followersCount: json['followersCount'] as int? ?? 0,
    );
  }

  Future<void> updateDog(
    String ref, {
    String? nameTh,
    String? nameEn,
    String? bio,
    double? weight,
    bool? isPublic,
    int? avatarId,
    int? coverId,
  }) async {
    await _api.put('/dogs/$ref', body: {
      'nameTh': ?nameTh,
      'nameEn': ?nameEn,
      'bio': ?bio,
      'weight': ?weight,
      'isPublic': ?isPublic,
      'avatar': ?avatarId,
      'coverImage': ?coverId,
    });
  }

  // ---------- Activity & care ----------

  Future<TodayActivity> todayActivity() async {
    final json = await _api.get('/activity/today');
    return TodayActivity.fromJson(_map(json['data']));
  }

  Future<List<DayActivity>> weekActivity() async {
    final json = await _api.get('/activity/week');
    return _list(json['data']).map(DayActivity.fromJson).toList();
  }

  Future<String> startWalk() async {
    final json = await _api.post('/walks/start', body: const {});
    return '${_map(json['data'])['documentId']}';
  }

  Future<void> stopWalk(
    String walkId, {
    required int durationSec,
    required int steps,
    required double distanceKm,
    required int calories,
  }) async {
    await _api.post('/walks/$walkId/stop', body: {
      'durationSec': durationSec,
      'steps': steps,
      'distanceKm': distanceKm,
      'calories': calories,
    });
  }

  Future<List<CareRoutine>> careRoutines() async {
    final json = await _api.get('/care-routines');
    return _list(json['data']).map(CareRoutine.fromJson).toList();
  }

  Future<bool> toggleCareRoutine(String routineId) async {
    final json = await _api.post('/care-logs/toggle', body: {'routine': routineId});
    return json['isCompleted'] as bool? ?? false;
  }

  Future<CareInsight> careInsight() async {
    final json = await _api.get('/care-insight');
    return CareInsight.fromJson(_map(json['data']));
  }

  // ---------- AI Bark ----------

  Future<BarkThread> barkThread() async {
    final json = await _api.get('/bark/thread');
    return BarkThread.fromJson(_map(json['data']));
  }

  Future<({BarkMessage userMessage, BarkMessage aiMessage})> sendBarkMessage(String text) async {
    final json = await _api.post('/bark/messages', body: {'text': text});
    final data = _map(json['data']);
    return (
      userMessage: BarkMessage.fromJson(_map(data['userMessage'])),
      aiMessage: BarkMessage.fromJson(_map(data['aiMessage'])),
    );
  }

  Future<List<GroomingStyle>> groomingStyles() async {
    final json = await _api.get('/bark/grooming-styles');
    return _list(json['data']).map(GroomingStyle.fromJson).toList();
  }

  Future<void> bookGrooming(String styleId) =>
      _api.post('/bark/grooming-bookings', body: {'style': styleId});

  Future<NutritionPlan> nutritionPlan() async {
    final json = await _api.get('/nutrition-plan');
    return NutritionPlan.fromJson(_map(json['data']));
  }
}
