import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/env.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// จุดเดียวที่คุยกับ Strapi — หน้าจอและ repository ห้ามเรียก Dio ตรง
class ApiClient {
  ApiClient(this._tokenStorage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiRoot,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Accept': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _tokenStorage.token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await _tokenStorage.clear();
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final TokenStorage _tokenStorage;
  late final Dio _dio;

  /// เรียกเมื่อ JWT หมดอายุ ให้ router เด้งกลับหน้า Login
  VoidCallback? onUnauthorized;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    return _wrap(() => _dio.get<dynamic>(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    return _wrap(() => _dio.post<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    return _wrap(() => _dio.put<dynamic>(path, data: body));
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _wrap(() => _dio.delete<dynamic>(path));
  }

  /// อัปโหลดรูปไป /api/upload แล้วคืน id ของไฟล์เพื่อเอาไปผูกกับโพสต์
  Future<List<int>> uploadImages(List<MultipartFile> files) async {
    if (files.isEmpty) return const [];

    final form = FormData();
    for (final file in files) {
      form.files.add(MapEntry('files', file));
    }

    try {
      final response = await _dio.post<dynamic>('/upload', data: form);
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<dynamic, dynamic>>()
            .map((item) => item['id'])
            .whereType<int>()
            .toList();
      }
      return const [];
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<Map<String, dynamic>> _wrap(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      final response = await request();
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return <String, dynamic>{'data': data};
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
