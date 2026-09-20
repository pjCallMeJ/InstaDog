# InstaDog

แอปคอมมูนิตี้คนรักสุนัข — Strapi 5 backend + Flutter app

```text
instadog/
├─ backend/   Strapi 5 (TypeScript, SQLite สำหรับ local)
├─ mobile/    Flutter (ทดสอบบน Chrome ก่อน build Android)
└─ docs/
   └─ API.md  สัญญา API ทุก endpoint
```

## เริ่มใช้งาน

### 1. Backend

```bash
cd backend
npm install
npm run develop
```

- Admin: <http://localhost:1337/admin> (สร้างบัญชีผู้ดูแลคนแรกตอนเข้าครั้งแรก)
- API: <http://localhost:1337/api>

ตอนบูตครั้งแรก ระบบจะตั้งสิทธิ์และสร้างข้อมูลตัวอย่างให้เองจาก [`src/bootstrap`](backend/src/bootstrap)
รูปตัวอย่างถูกสร้างแบบออฟไลน์จากภาพต้นฉบับใน `backend/data/seed-source` จึงไม่ต้องต่ออินเทอร์เน็ต

ข้ามการ seed ด้วย `SKIP_SEED=true`

**บัญชีทดสอบ**

| อีเมล | สุนัข |
| --- | --- |
| `browny@instadog.app` | บรูนี่ (โกลเด้น รีทรีฟเวอร์ 3 ปี 6 เดือน) |
| `momo@instadog.app` | โมโม่ (ชิบะ อินุ) |

รหัสผ่านมาจาก `SEED_PASSWORD` ค่าเริ่มต้นสำหรับห้องเรียนคือ `Instadog123`

ตรวจว่า API ครบและทำงานถูกต้อง

```bash
node scripts/smoke-test.mjs
```

### 2. Mobile (Chrome)

เปิด backend ทิ้งไว้ในอีกเทอร์มินัลก่อน แล้ว

```bash
cd mobile
flutter pub get
flutter run -d chrome --web-port=5000 --dart-define=API_BASE_URL=http://localhost:1337
```

ใช้ `--web-port=5000` เพราะ CORS ของ backend ตั้งพอร์ตนี้ไว้เป็นหลัก (พอร์ต localhost อื่นก็ผ่าน)
สำหรับ Android emulator ในรอบถัดไปให้เปลี่ยนเป็น `--dart-define=API_BASE_URL=http://10.0.2.2:1337`

ตรวจคุณภาพโค้ด

```bash
flutter analyze   # ต้องไม่มี issue
flutter test
```

## หน้าจอและการนำทาง

Bottom Nav มี 5 แท็บตาม mockup ส่วนกิจกรรมและ AI Bark เข้าจากไอคอนบน Header ของหน้าแรก

| เส้นทาง | หน้าจอ | จุดเด่น |
| --- | --- | --- |
| `/feed` | หน้าแรก | แถบสตอรี่, การ์ดโพสต์, ไลค์/บันทึกแบบ optimistic |
| `/explore` | สำรวจ | `TabController` สร้างจาก `/api/explore/categories` |
| `/create` | สร้างโพสต์ | เลือกรูปสูงสุด 10, แคปชั่น, ตำแหน่ง, แฮชแท็ก, แท็กสุนัข |
| `/notifications` | แจ้งเตือน | 2 แท็บ จัดกลุ่ม ใหม่/วันนี้/สัปดาห์นี้ |
| `/profile` | โปรไฟล์ | รูปปก + สถิติ + 3 แท็บ โพสต์/รูปภาพ/เกี่ยวกับ |
| `/activity` | กิจกรรมและการดูแล | วงแหวนก้าว, จับเวลาเดินเล่น, กราฟ 7 วัน, checklist |
| `/bark` | AI Bark | 3 แท็บ แชท/ทรงขน/โภชนาการ |
| `/search` | ค้นหา | ค้นน้องหมา เจ้าของ แฮชแท็ก โพสต์ |

หน้าสำรวจเป็นต้นแบบของ pattern `TabController` ที่นำไปใช้ซ้ำในหน้าโปรไฟล์ แจ้งเตือน และ AI Bark
จำนวนแท็บมาจาก API ไม่ได้ hard-code ตัว controller จึงถูกสร้างใหม่หลังข้อมูลมาถึง

## สิ่งที่ยังเป็น mock ในรอบนี้

- AI Bark ตอบด้วยกฎคำสำคัญใน [`bark-rules.ts`](backend/src/api/bark/services/bark-rules.ts) ยังไม่เรียก LLM จริง
- การเดินเล่นนับก้าวจากตัวจับเวลาในแอป ยังไม่ได้ต่อ GPS หรือ Google Fit
- ปุ่ม Google / Apple / LINE, ลืมรหัสผ่าน, เปลี่ยนรูปโปรไฟล์ และแนบรูปอาการใน AI Bark เป็น placeholder
- ยังไม่ได้ build Android (`flutter build apk`) ตามที่ตกลงกันไว้
- อัปโหลดไฟล์ใช้ provider `local` ของ Strapi ยังไม่ได้ต่อ object storage

## เอกสาร

- [docs/API.md](docs/API.md) — request/response ของทุก endpoint
