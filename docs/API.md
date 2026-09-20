# InstaDog API contract (Strapi 5.54)

Base URL

| สภาพแวดล้อม | URL |
| --- | --- |
| Local / Flutter Web (Chrome) | `http://localhost:1337` |
| Android emulator | `http://10.0.2.2:1337` |

Header เมื่อล็อกอินแล้ว

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

ปลั๊กอิน users-permissions ตั้งเป็น `jwtManagement: 'legacy-support'` ใน [`config/plugins.ts`](../backend/config/plugins.ts)
`/api/auth/local` จึงคืน `jwt` ตรง ๆ ให้ไคลเอนต์เก็บเอง แทนโหมด refresh cookie ที่ Flutter อ่านไม่ได้

Strapi 5 ใช้ `documentId` (string) เป็นตัวระบุหลัก อย่าอ้าง numeric `id`
URL รูปทุกจุดถูกแปลงเป็น absolute URL แล้วด้วย `PUBLIC_URL` จึงโหลดบน Chrome ได้ทันที

บัญชีทดสอบจาก seed

| อีเมล | สุนัข |
| --- | --- |
| `browny@instadog.app` | บรูนี่ (`browny.thegolden`) |
| `momo@instadog.app` | โมโม่ (`shiba.momo`) |

รหัสผ่านอ่านจาก `SEED_PASSWORD` ค่าเริ่มต้นสำหรับห้องเรียนคือ `Instadog123`

---

## 1. Auth

### POST /api/auth/local — เข้าสู่ระบบ

```json
{ "identifier": "browny@instadog.app", "password": "Instadog123" }
```

```json
{ "jwt": "<token>", "user": { "id": 1, "documentId": "abc", "username": "browny.thegolden", "confirmed": true } }
```

`identifier` รับได้ทั้งอีเมลและ username

### POST /api/auth/local/register — สมัครแบบมาตรฐาน

```json
{ "username": "alice", "email": "alice@example.com", "password": "Password123" }
```

### POST /api/auth/register-with-dog — สมัคร + Quick Add สุนัขตัวแรก

ใช้กับฟอร์ม Register ของแอป สร้าง user + owner-profile + dog + ตารางดูแล + แผนโภชนาการ ในคำขอเดียว

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "Password123",
  "displayName": "คุณอลิซ",
  "dog": {
    "nameTh": "น้องข้าวปุ้น",
    "nameEn": "Khaopun",
    "breed": "golden-retriever",
    "gender": "female",
    "birthDate": "2024-02-14",
    "weight": 18.5
  }
}
```

```json
{ "jwt": "<token>", "user": { "...": "" }, "dog": { "handle": "khaopun", "ageText": "8 เดือน", "...": "" } }
```

### POST /api/auth/change-password

```json
{ "currentPassword": "Old123456", "password": "New123456", "passwordConfirmation": "New123456" }
```

### GET /api/users/me

---

## 2. หน้าแรก (Feed)

### GET /api/feed?page=1&pageSize=10

คืนเฉพาะโพสต์ `visibility=public` ของสุนัขที่ `isPublic=true` เรียงใหม่สุดก่อน

```json
{
  "data": [
    {
      "documentId": "post_1",
      "caption": "อากาศดีแบบนี้ ไม่เดินเล่นก็ไม่ได้แล้ว 🐾 #InstaDog",
      "media": [{ "id": 5, "url": "http://localhost:1337/uploads/post_walk.jpg", "width": 1080, "height": 1080 }],
      "coverUrl": "http://localhost:1337/uploads/post_walk.jpg",
      "mediaCount": 1,
      "location": "สวนเบญจกิติ กรุงเทพฯ",
      "likeCount": 1200,
      "likeCountText": "1.2K",
      "commentCount": 48,
      "commentCountText": "48",
      "hashtags": ["InstaDog", "น้องโกลเด้น", "ชีวิตดีๆกับสุนัข"],
      "dog": { "handle": "browny.thegolden", "nameTh": "บรูนี่", "avatarUrl": "…", "breedNameTh": "โกลเด้น รีทรีฟเวอร์" },
      "author": { "username": "browny.thegolden", "displayName": "คุณขวัญ", "avatarUrl": "…" },
      "timeAgo": "2 ชม. ที่ผ่านมา",
      "likedByMe": false,
      "savedByMe": false,
      "isFollowing": false,
      "isMine": true
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "pageCount": 1, "total": 9 }
}
```

`likeCountText` คือค่าที่ UI แสดงตรง ๆ (1200 -> `1.2K`) ส่วน `likeCount` ใช้คำนวณตอน optimistic update

---

## 3. สตอรี่

### GET /api/stories

จัดกลุ่มหนึ่งวงต่อหนึ่งสุนัข วงที่ยังไม่ดูถูกดันขึ้นก่อน

```json
{
  "self": { "handle": "browny.thegolden", "nameTh": "บรูนี่", "avatarUrl": "…" },
  "data": [
    {
      "dog": { "handle": "biggy.corgi", "nameTh": "น้องบิกกี้", "avatarUrl": "…" },
      "hasUnseen": true,
      "items": [{ "documentId": "s1", "imageUrl": "…", "caption": "…", "timeAgo": "2 ชม. ที่ผ่านมา", "isSeen": false }]
    }
  ]
}
```

`self` ใช้เรนเดอร์ปุ่ม "สร้างสตอรี่" ช่องแรกของแถบ

### POST /api/stories

```json
{ "media": 12, "caption": "ออกเดินแล้ว!", "dog": "<dogDocumentId>" }
```

### POST /api/stories/:id/view

### POST /api/stories/:id/reply

```json
{ "text": "น่ารักจัง" }
```

---

## 4. โพสต์

### สร้างโพสต์ — สองขั้นตอน

1. `POST /api/upload` แบบ `multipart/form-data` field ชื่อ `files` (สูงสุด 10 ไฟล์ เฉพาะรูป)
2. `POST /api/posts`

```json
{
  "data": {
    "caption": "วันนี้แดดดี 🐾 #InstaDog",
    "media": [12, 13],
    "location": "สวนลุมพินี",
    "mood": "สดใสขี้เล่น",
    "visibility": "public",
    "dog": "<dogDocumentId>",
    "hashtags": ["เดินเล่น"],
    "exploreCategory": "walk"
  }
}
```

`author` ถูกตั้งจาก JWT เสมอ ห้ามส่งมาจากไคลเอนต์
แฮชแท็กถูกแยกจากแคปชั่นอัตโนมัติ (รองรับอักษรไทย) แล้วรวมกับที่ส่งมาใน `hashtags`

### GET /api/posts/:documentId

### DELETE /api/posts/:documentId

403 ถ้าไม่ใช่เจ้าของ ลบ like / save / comment / notification ที่เกี่ยวข้องให้ด้วย

> **ไม่มี** `PUT /api/posts/:id` ใน MVP — permission `update` ถูกปิดไว้

### POST /api/posts/:documentId/like

```json
{ "liked": true, "likeCount": 1201 }
```

เรียกซ้ำเพื่อ unlike `likeCount` ไม่ต่ำกว่า 0

### POST /api/posts/:documentId/save

```json
{ "saved": true, "saveCount": 101 }
```

### GET /api/posts/:documentId/comments?page=1&pageSize=20

### POST /api/posts/:documentId/comments

```json
{ "text": "น้องน่ารักมาก" }
```

```json
{ "data": { "documentId": "c1", "text": "…", "author": { "…": "" }, "timeAgo": "เมื่อสักครู่" }, "commentCount": 49 }
```

---

## 5. สำรวจ และค้นหา

### GET /api/explore/categories

**จำนวนระเบียนที่คืนจาก endpoint นี้คือจำนวนแท็บของ `TabController` บนหน้าสำรวจ**

```json
{
  "data": [
    { "documentId": "c0", "nameTh": "ทั้งหมด", "slug": "all", "icon": "grid_view", "isDefault": true },
    { "documentId": "c1", "nameTh": "ยอดนิยม", "slug": "popular", "icon": "local_fire_department", "isDefault": false }
  ]
}
```

หมวดที่ `isDefault=true` จะไม่ถูกกรอง แท็บแรกจึงเห็นทุกโพสต์

### GET /api/explore?category=walk&page=1&pageSize=21

รูปแบบ `data` เหมือน `/api/feed` เรียงตาม `likeCount` มากไปน้อย

### GET /api/search?q=บรูนี่&type=all

`type` = `all` | `dogs` | `owners` | `hashtags` | `posts`

```json
{
  "data": {
    "dogs": [{ "handle": "browny.thegolden", "nameTh": "บรูนี่", "avatarUrl": "…" }],
    "owners": [{ "username": "browny.thegolden", "displayName": "คุณขวัญ", "avatarUrl": "…" }],
    "hashtags": [{ "name": "InstaDog", "postCount": 9 }],
    "posts": []
  },
  "meta": { "q": "บรูนี่", "type": "all" }
}
```

---

## 6. แจ้งเตือน

### GET /api/notifications?scope=you

`scope` = `you` (แท็บ "คุณ") หรือ `following` (แท็บ "กำลังติดตาม")
เซิร์ฟเวอร์จัดกลุ่มตามช่วงเวลามาให้แล้ว UI แค่เรนเดอร์หัวข้อกับรายการ

```json
{
  "data": [
    {
      "key": "new",
      "label": "ใหม่",
      "items": [
        {
          "documentId": "n1",
          "type": "like",
          "message": "ถูกใจโพสต์ของคุณ",
          "isRead": false,
          "actor": { "displayName": "คุณมิ้นท์", "avatarUrl": "…" },
          "actorDog": { "handle": "shiba.momo", "nameTh": "โมโม่" },
          "postThumbnailUrl": "…",
          "timeAgo": "1 ชม. ที่ผ่านมา"
        }
      ]
    },
    { "key": "today", "label": "วันนี้", "items": [] },
    { "key": "week", "label": "สัปดาห์นี้", "items": [] }
  ],
  "meta": { "scope": "you", "page": 1, "total": 5 }
}
```

`type` ที่เป็นไปได้: `like` `comment` `follow` `mention` `follow_request` `story_reply` `care_reminder`

### GET /api/notifications/unread-count → `{ "count": 8 }`

### POST /api/notifications/read-all → `{ "ok": true }`

---

## 7. โปรไฟล์สุนัข

`:ref` รับได้ทั้ง `documentId` และ `handle` เช่น `browny.thegolden`

### GET /api/dogs/:ref/profile — ส่วนหัวทั้งหมดในคำขอเดียว

```json
{
  "data": {
    "handle": "browny.thegolden",
    "nameTh": "บรูนี่",
    "nameEn": "Bruni",
    "avatarUrl": "…",
    "coverUrl": "…",
    "bio": "น้องรูนี่ ชอบวิ่งเล่น ชอบกินขนม และรักทุกคนที่เข้ามาในชีวิต 🐾",
    "breedNameTh": "โกลเด้น รีทรีฟเวอร์",
    "ageText": "3 ปี 6 เดือน",
    "gender": "male",
    "weight": 28.5,
    "vaccineStatus": "วัคซีนครบถ้วน",
    "owner": { "displayName": "คุณขวัญ", "avatarUrl": "…" },
    "isMine": true,
    "isFollowing": false,
    "counts": { "posts": 246, "followers": 1801, "following": 312 },
    "achievements": [{ "code": "golden-walker", "title": "นักเดินเท้าทองคำ", "icon": "directions_walk" }]
  }
}
```

`ageText` และ `counts` คือค่าที่วางลงชิปกับแถบสถิติได้ตรง ๆ ตาม mockup

### สามแท็บของหน้าโปรไฟล์

| Endpoint | แท็บ | คืนอะไร |
| --- | --- | --- |
| `GET /api/dogs/:ref/posts` | โพสต์ | โพสต์เต็มรูปแบบ (กริดใช้ `coverUrl`) |
| `GET /api/dogs/:ref/photos` | รูปภาพ | แยกรายรูป ไม่ใช่รายโพสต์ |
| `GET /api/dogs/:ref/about` | เกี่ยวกับ | `bio`, `facts[]`, `owner`, `nutrition`, `achievements`, `totalWalks` |

ถ้าสุนัขเป็นบัญชีส่วนตัวและผู้ชมไม่ใช่เจ้าของ จะได้ `data: []` พร้อม `meta.isPrivate = true`

### POST /api/dogs/:ref/follow

```json
{ "following": true, "followersCount": 1802 }
```

400 ถ้าติดตามสุนัขของตัวเอง บัญชีส่วนตัวจะได้สถานะ `pending` และ `following=false`

### GET /api/dogs/:ref/followers / GET /api/dogs/:ref/following

---

## 8. บัญชีของฉัน

### GET /api/me/profile

```json
{
  "data": {
    "username": "browny.thegolden",
    "displayName": "คุณขวัญ",
    "bio": "ทาสน้องบรูนี่ เต็มเวลา 🐾",
    "avatarUrl": "…",
    "isPublic": true,
    "dogs": [{ "handle": "browny.thegolden", "nameTh": "บรูนี่" }],
    "primaryDog": { "handle": "browny.thegolden", "counts": { "posts": 246, "followers": 1801, "following": 312 } }
  }
}
```

### PUT /api/me/profile

```json
{ "displayName": "คุณขวัญ", "bio": "…", "isPublic": true, "avatar": 99 }
```

### GET /api/me/dogs · POST /api/me/dogs · GET /api/me/saved

`POST /api/me/dogs` สร้าง handle ที่ไม่ซ้ำให้อัตโนมัติ และ seed ตารางดูแล/แผนโภชนาการ/กิจกรรม 7 วันให้ทันที

### PUT /api/dogs/:ref — แก้ไขโปรไฟล์สุนัข

แก้ได้เฉพาะของตัวเอง: `nameTh` `nameEn` `bio` `weight` `birthDate` `gender` `breed` `vaccineStatus` `isPublic` `avatar` `coverImage`

---

## 9. กิจกรรมและการดูแล

ทุก endpoint มีทั้งแบบระบุสุนัข (`/api/dogs/:ref/...`) และแบบใช้สุนัขตัวหลักอัตโนมัติ

### GET /api/activity/today

```json
{ "data": { "date": "2026-09-20", "steps": 4820, "stepGoal": 7000, "progress": 0.688, "distanceKm": 3.13, "calories": 217, "activeWalk": null } }
```

`progress` คำนวณมาให้แล้ว วาดวงแหวนได้ทันที

### GET /api/activity/week

คืน 7 วันเสมอ เรียงเก่าไปใหม่ พร้อม `weekdayTh` (`จ.` … `อา.`) สำหรับแกน X ของกราฟ

### POST /api/walks/start

```json
{ "data": { "documentId": "w1", "startedAt": "2026-09-20T08:00:00.000Z", "resumed": false } }
```

ถ้ามีรอบที่ยังไม่จบอยู่ จะคืนรอบเดิมพร้อม `resumed: true`

### POST /api/walks/:id/stop

```json
{ "durationSec": 600, "steps": 980, "distanceKm": 0.64, "calories": 44 }
```

ตัวจับเวลาอยู่ฝั่งแอป เซิร์ฟเวอร์รับค่ามาสรุป แล้วบวกเข้า `daily-activity` ของวันนี้และ `accumulatedKm` ของสุนัข

### GET /api/walks — ประวัติการเดินเล่น

### GET /api/care-routines?date=YYYY-MM-DD

```json
{
  "data": [
    { "documentId": "r1", "title": "อาหารเช้า + วิตามิน", "scheduledTime": "07:30 น.", "category": "food", "icon": "restaurant", "isCompleted": false, "completedAt": null }
  ],
  "meta": { "date": "2026-09-20", "completed": 0, "total": 5 }
}
```

`category` = `food` | `walk` | `groom` | `health`

### POST /api/care-logs/toggle

```json
{ "routine": "r1", "date": "2026-09-20" }
```

```json
{ "documentId": "r1", "date": "2026-09-20", "isCompleted": true, "completedAt": "2026-09-20T07:35:00.000Z" }
```

### GET /api/care-insight — การ์ด AI Care Insight

---

## 10. AI Bark

### GET /api/bark/thread

สร้างห้องและข้อความต้อนรับให้อัตโนมัติถ้ายังไม่มี

```json
{
  "data": {
    "documentId": "t1",
    "dog": { "nameTh": "บรูนี่", "avatarUrl": "…" },
    "quickPrompts": ["วันนี้ควรให้อาหารกี่กรัม", "น้องขนร่วงเยอะมาก ทำยังไงดี", "น้องเผลอกินช็อกโกแลต", "ฝึกไม่ให้เห่าตอนกลางคืนยังไง"],
    "messages": [{ "documentId": "m1", "sender": "ai", "text": "สวัสดีค่ะ ฉันคือ AI Bark…", "isEmergency": false, "payload": null }]
  }
}
```

### POST /api/bark/messages

```json
{ "text": "น้องเผลอกินช็อกโกแลตไปนิดหน่อย" }
```

คืนทั้งข้อความผู้ใช้และคำตอบ AI ในครั้งเดียว แอปจึงต่อท้ายรายการได้เลย

```json
{
  "data": {
    "userMessage": { "sender": "user", "text": "…" },
    "aiMessage": {
      "sender": "ai",
      "text": "ช็อกโกแลตมีสาร Theobromine…",
      "isEmergency": true,
      "payload": { "kind": "emergency", "title": "สงสัยได้รับช็อกโกแลต", "toxin": "Theobromine", "steps": ["…"], "clinic": "…", "phone": "…" }
    }
  }
}
```

กฎคำตอบอยู่ใน [`src/api/bark/services/bark-rules.ts`](../backend/src/api/bark/services/bark-rules.ts) ไฟล์เดียว สลับไปเรียก Gemini ได้โดยไม่ต้องแตะ controller

| คำสำคัญ | ผลลัพธ์ |
| --- | --- |
| ช็อกโกแลต / chocolate | การ์ดฉุกเฉิน `isEmergency=true` พร้อมขั้นตอนและเบอร์คลินิก |
| ขนร่วง / ผลัดขน | คำแนะนำการดูแลขน + สัญญาณที่ควรพบสัตวแพทย์ |
| กี่กรัม / อาหาร / แคล | คำนวณ kcal และกรัมต่อวันจากน้ำหนักจริง คืน `payload.kind = "nutrition"` |
| เห่า / ฝึก / ดื้อ | แนวทาง Positive Reinforcement |
| อื่น ๆ | ตอบทั่วไปโดยอ้างชื่อและน้ำหนักของสุนัข |

### GET /api/bark/grooming-styles

### POST /api/bark/grooming-bookings

```json
{ "style": "<styleDocumentId>", "salonName": "InstaDog Grooming Studio", "scheduledAt": "2026-09-25T10:00:00.000Z" }
```

### GET /api/nutrition-plan

```json
{ "data": { "dailyKcal": 1150, "dryFoodGram": 320, "mealsPerDay": 2, "gramPerMeal": 160, "proteinPct": 26, "fatPct": 14, "carbPct": 60, "forbiddenFoods": ["ช็อกโกแลต", "องุ่นและลูกเกด", "หัวหอม/กระเทียม", "ไซลิทอล", "อะโวคาโด"] } }
```

---

## 11. ข้อมูลอ้างอิง (เปิดให้ Public)

| Endpoint | ใช้ที่ |
| --- | --- |
| `GET /api/breeds` | ตัวเลือกสายพันธุ์ในฟอร์มสมัคร/แก้ไข |
| `GET /api/explore-categories` | สำรองของ `/api/explore/categories` |

---

## 12. HTTP status ที่แอปต้องรองรับ

| Code | ความหมายในแอป |
| --- | --- |
| 200 | สำเร็จ |
| 400 | ฟอร์มผิด / ติดตามตัวเอง / ไฟล์ไม่ใช่รูป / จำนวนรูปเกิน 10 |
| 401 | ไม่ได้ส่ง JWT หรือหมดอายุ → กลับหน้า Login |
| 403 | ไม่ใช่เจ้าของ หรือ role ไม่มีสิทธิ์ |
| 404 | ไม่พบโพสต์ / สุนัข / สตอรี่ |
| 413 | ไฟล์ใหญ่เกิน 10 MB |
| 5xx | แสดง "เซิร์ฟเวอร์ไม่พร้อม" |

รูปแบบ error ของ Strapi

```json
{ "error": { "status": 400, "name": "ValidationError", "message": "อีเมลนี้ถูกใช้แล้ว" } }
```

---

## 13. Permissions

ตั้งจากโค้ดใน [`src/bootstrap/permissions.ts`](../backend/src/bootstrap/permissions.ts) ทุกครั้งที่บูต จึงไม่ต้องคลิกใน Admin และเครื่องนักเรียนได้ผลเหมือนกัน

**Public** — เฉพาะ login, register, register-with-dog, forgot/reset password, `breeds`, `explore-categories`
**Authenticated** — endpoint ที่เหลือทั้งหมดตามรายการในไฟล์นั้น

action ที่ไม่อยู่ในรายการจะถูก **ปิด** ทุกครั้งที่บูต การเพิ่ม endpoint ใหม่จึงต้องเพิ่มชื่อ action ในไฟล์นี้ด้วย

---

## 14. ตรวจ API

```bash
cd backend
npm run develop        # เทอร์มินัลที่ 1
node scripts/smoke-test.mjs   # เทอร์มินัลที่ 2
```

สคริปต์ไล่ยิงทุก endpoint ในเอกสารนี้ รวมถึงตรวจว่า `/api/feed` แบบไม่มี token ต้องถูกปฏิเสธ
