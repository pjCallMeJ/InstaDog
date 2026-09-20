import 'package:dio/dio.dart';

/// ข้อผิดพลาดที่แปลงเป็นข้อความภาษาไทยพร้อมแสดงบนหน้าจอแล้ว
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  bool get isUnauthorized => statusCode == 401;

  factory ApiException.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;

    // Strapi ตอบ { error: { status, name, message } }
    if (data is Map && data['error'] is Map) {
      final message = (data['error'] as Map)['message'];
      if (message is String && message.isNotEmpty) {
        return ApiException(message, statusCode: status);
      }
    }
    if (data is Map && data['message'] is String) {
      return ApiException(data['message'] as String, statusCode: status);
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('เชื่อมต่อเซิร์ฟเวอร์ช้าเกินไป ลองใหม่อีกครั้ง', statusCode: status);
      case DioExceptionType.connectionError:
        return ApiException(
          'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า backend รันอยู่ที่พอร์ต 1337 แล้วหรือยัง',
          statusCode: status,
        );
      default:
        break;
    }

    switch (status) {
      case 400:
        return ApiException('ข้อมูลไม่ถูกต้อง', statusCode: status);
      case 401:
        return ApiException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', statusCode: status);
      case 403:
        return ApiException('ไม่มีสิทธิ์ทำรายการนี้', statusCode: status);
      case 404:
        return ApiException('ไม่พบข้อมูลที่ต้องการ', statusCode: status);
      case 413:
        return ApiException('ไฟล์ใหญ่เกินไป', statusCode: status);
      default:
        return ApiException('เซิร์ฟเวอร์ไม่พร้อมใช้งาน ลองใหม่ภายหลัง', statusCode: status);
    }
  }

  @override
  String toString() => message;
}
