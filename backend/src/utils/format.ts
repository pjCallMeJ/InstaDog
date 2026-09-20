const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/** "2 ชม. ที่ผ่านมา" — ข้อความเวลาแบบเดียวกับที่อยู่บนการ์ดโพสต์ใน mockup */
export function timeAgoTh(value: Date | string | null | undefined): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'เมื่อสักครู่';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่ผ่านมา`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม. ที่ผ่านมา`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่ผ่านมา`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} สัปดาห์ที่ผ่านมา`;

  const d = new Date(value);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** "3 ปี 6 เดือน" — ชิปอายุบนหน้าโปรไฟล์ */
export function formatAgeTh(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  if (years === 0) return `${restMonths} เดือน`;
  if (restMonths === 0) return `${years} ปี`;
  return `${years} ปี ${restMonths} เดือน`;
}

/** 1200 -> "1.2K" — ตัวเลขไลค์/ผู้ติดตามแบบย่อ */
export function compactCount(value: number): string {
  const n = Number(value) || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  const m = n / 1_000_000;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
}

/** ดึง #แฮชแท็ก ออกจากแคปชั่น รองรับอักษรไทย */
export function parseHashtags(caption?: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const unique = new Set(matches.map((tag) => tag.slice(1)));
  return [...unique];
}

/** วันที่รูปแบบ YYYY-MM-DD ตามเวลาท้องถิ่นของเซิร์ฟเวอร์ */
export function toDateKey(value: Date | string = new Date()): string {
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** คีย์วันที่ของ 7 วันล่าสุด เรียงจากเก่าไปใหม่ (จ. ถึง อา. บนกราฟ) */
export function lastSevenDateKeys(from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    keys.push(toDateKey(d));
  }
  return keys;
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
