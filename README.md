# InstaDog

แอปคอมมูนิตี้คนรักสุนัข — **Strapi 5.54** backend + **Flutter** (ชื่อบนมือถือ: `InstaDog`)

```text
instadog/
├─ backend/     Strapi 5 TypeScript + SQLite (local)
├─ mobile/      Flutter (Chrome / Android)
└─ docs/
   └─ API.md    สัญญา API ทุก endpoint
```

สโลแกนในแอป: *คอมมูนิตี้คนรักสุนัขที่คุณและน้องหมาต้องหลงรัก*

## สถานะปัจจุบัน

- Phase 1 Backend และ Phase 2 Flutter ใช้งานได้แล้ว
- ตรวจบน Chrome ที่ `http://localhost:5000` แล้ว
- ติดตั้งบนมือถือ Android (เช่น RMX5120) แล้ว ชื่อไอคอนคือ **InstaDog**
- มือถือคุยกับ backend ได้ทั้ง USB (`adb reverse`) และ **Wi‑Fi เครือข่ายเดียวกัน** (ไม่ต้องเสียบสายหลังติดตั้ง)
- `flutter analyze` ผ่าน, `flutter test` ผ่าน, `node scripts/smoke-test.mjs` ผ่าน 31 ข้อ

## สิ่งที่ต้องมี

- Node.js 20–26 (เครื่องนี้ใช้ Node 24)
- Flutter 3.47+ / Dart 3.13+
- สำหรับมือถือ: USB debugging หรือ Wi‑Fi เดียวกับคอม

## 1. Backend

```bash
cd backend
npm install
npm run develop
```

- Admin: <http://localhost:1337/admin> (สร้างบัญชีผู้ดูแลคนแรกตอนเข้าครั้งแรก)
- API: <http://localhost:1337/api>
- ฟังทุก interace (`HOST=0.0.0.0`) จึงรับคำขอจากมือถือผ่าน LAN IP ได้

ตอนบูตครั้งแรก ระบบตั้งสิทธิ์และ seed ข้อมูลจาก [`backend/src/bootstrap`](backend/src/bootstrap)
รูปตัวอย่างสร้างออฟไลน์จาก `backend/data/seed-source` ไม่ต้องต่ออินเทอร์เน็ต

ข้ามการ seed ด้วย `SKIP_SEED=true`

**บัญชีทดสอบ** — รหัสผ่านจาก `SEED_PASSWORD` ค่าเริ่มต้น `Instadog123`

| อีเมล | สุนัข |
| --- | --- |
| `browny@instadog.app` | บรูนี่ `browny.thegolden` (โกลเด้น รีทรีฟเวอร์ 3 ปี 6 เดือน) |
| `momo@instadog.app` | โมโม่ `shiba.momo` (ชิบะ อินุ) |

ตรวจ API

```bash
node scripts/smoke-test.mjs
```

## 2. Mobile

เปิด backend ทิ้งไว้ในอีกเทอร์มินัลก่อน

```bash
cd mobile
flutter pub get
```

### Chrome (แนะนำตอนพัฒนา UI)

```bash
flutter run -d chrome --web-port=5000 --dart-define=API_BASE_URL=http://localhost:1337
```

### มือถือจริงผ่าน Wi‑Fi (ไม่ต้อง USB ตอนใช้งาน)

1. คอมกับมือถืออยู่ Wi‑Fi เดียวกัน
2. หา IPv4 ของคอม เช่น `ipconfig` (ตัวอย่าง: `10.137.82.197`)
3. ติดตั้งแอปครั้งหนึ่ง แล้วยกสายได้

```bash
flutter devices
flutter run -d <deviceId> --dart-define=API_BASE_URL=http://<LAN_IP>:1337
```

ถ้ามือถือเข้า API ไม่ได้ ให้เปิด Windows Firewall เป็น Administrator แล้วอนุญาตพอร์ต 1337:

```powershell
netsh advfirewall firewall add rule name="InstaDog Strapi 1337" dir=in action=allow protocol=TCP localport=1337
```

หรือกด Allow เมื่อ Windows ถาม Node.js / Strapi (Private networks)

ถ้าเปลี่ยน Wi‑Fi แล้ว IP คอมเปลี่ยน ต้องรัน `flutter run` ใหม่ด้วย IP ใหม่

### มือถือจริงผ่าน USB

```bash
adb reverse tcp:1337 tcp:1337
flutter run -d <deviceId> --dart-define=API_BASE_URL=http://127.0.0.1:1337
```

สาย USB ต้องเสียบค้างไว้ตลอดเวลาที่แอปเรียก API

### Android emulator

```bash
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:1337
```

### ตรวจคุณภาพโค้ด

```bash
flutter analyze
flutter test
```

## หน้าจอและการนำทาง

Bottom Nav มี 5 แท็บตาม mockup: **หน้าแรก / สำรวจ / สร้างโพสต์ / แจ้งเตือน / โปรไฟล์**
กิจกรรมและการดูแล + AI Bark เข้าจากไอคอนบน Header ของหน้าแรก

| เส้นทาง | หน้าจอ | จุดเด่น |
| --- | --- | --- |
| `/login` `/register` | เข้าสู่ระบบ / สมัคร | JWT จาก Strapi, สมัครพร้อมสุนัขตัวแรก |
| `/feed` | หน้าแรก | สตอรี่, การ์ดโพสต์, ไลค์/บันทึกแบบ optimistic |
| `/explore` | สำรวจ | `TabController` จาก `/api/explore/categories` ชิปโทนอำพัน |
| `/create` | สร้างโพสต์ | รูปสูงสุด 10, แคปชั่น 300 ตัว, ตำแหน่ง, แฮชแท็ก, แท็กสุนัข |
| `/notifications` | แจ้งเตือน | แท็บ กำลังติดตาม / คุณ จัดกลุ่มตามเวลา |
| `/profile` | โปรไฟล์ | รูปปก + สถิติ + แท็บ โพสต์ / รูปภาพ / เกี่ยวกับ |
| `/activity` | กิจกรรมและการดูแล | วงแหวนก้าว, จับเวลาเดินเล่น, กราฟ 7 วัน, checklist |
| `/bark` | AI Bark | แท็บ แชท / ทรงขน / โภชนาการ |
| `/search` | ค้นหา | น้องหมา เจ้าของ แฮชแท็ก โพสต์ |

หน้าสำรวจเป็นต้นแบบ `TabController` ที่ใช้ซ้ำในโปรไฟล์ แจ้งเตือน และ AI Bark
จำนวนแท็บสำรวจมาจาก API ไม่ได้ hard-code

## สิ่งที่ยังเป็น mock

- AI Bark ตอบด้วยกฎคำสำคัญใน [`bark-rules.ts`](backend/src/api/bark/services/bark-rules.ts) ยังไม่เรียก LLM
- การเดินเล่นนับก้าวจากตัวจับเวลาในแอป ยังไม่ได้ต่อ GPS หรือ Google Fit
- ปุ่ม Google / Apple / LINE, ลืมรหัสผ่าน, เปลี่ยนรูปโปรไฟล์ และแนบรูปอาการใน AI Bark เป็น placeholder
- อัปโหลดไฟล์ใช้ provider `local` ของ Strapi ยังไม่ได้ต่อ object storage

## เอกสาร

- [docs/API.md](docs/API.md) — request/response ของทุก endpoint
