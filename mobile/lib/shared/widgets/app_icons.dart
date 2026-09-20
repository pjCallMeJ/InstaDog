import 'package:flutter/material.dart';

/// backend ส่งชื่อไอคอนแบบ Material Symbols มาเป็นสตริง
/// แปลงเป็น IconData ที่นี่ที่เดียว เพื่อไม่ต้องฝัง mapping ไว้ในหน้าจอ
IconData iconFromName(String? name) {
  switch (name) {
    case 'restaurant':
      return Icons.restaurant_rounded;
    case 'directions_walk':
      return Icons.directions_walk_rounded;
    case 'content_cut':
      return Icons.content_cut_rounded;
    case 'vaccines':
      return Icons.vaccines_rounded;
    case 'favorite':
      return Icons.favorite_rounded;
    case 'grid_view':
      return Icons.grid_view_rounded;
    case 'local_fire_department':
      return Icons.local_fire_department_rounded;
    case 'child_care':
      return Icons.child_care_rounded;
    case 'local_cafe':
      return Icons.local_cafe_rounded;
    case 'emoji_events':
      return Icons.emoji_events_rounded;
    case 'star':
      return Icons.star_rounded;
    case 'sports_baseball':
      return Icons.sports_baseball_rounded;
    case 'calendar_month':
      return Icons.calendar_month_rounded;
    case 'monitor_weight':
      return Icons.monitor_weight_rounded;
    case 'wc':
      return Icons.wc_rounded;
    case 'pets':
      return Icons.pets_rounded;
    case 'check_circle':
      return Icons.check_circle_rounded;
    default:
      return Icons.pets_rounded;
  }
}

/// ไอคอนของการ์ดแจ้งเตือนแต่ละชนิด
IconData notificationIcon(String type) {
  switch (type) {
    case 'like':
      return Icons.favorite_rounded;
    case 'comment':
      return Icons.mode_comment_rounded;
    case 'follow':
    case 'follow_request':
      return Icons.person_add_rounded;
    case 'mention':
      return Icons.alternate_email_rounded;
    case 'story_reply':
      return Icons.auto_stories_rounded;
    case 'care_reminder':
      return Icons.notifications_active_rounded;
    default:
      return Icons.notifications_rounded;
  }
}
