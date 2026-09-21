/**
 * ผู้ช่วยเขียนแคปชั่นโพสต์
 * ยังไม่เรียก LLM จริง แยกโมดูลเดียวเพื่อสลับไป Gemini ได้ภายหลัง
 */

export type CaptionContext = {
  dogName?: string | null;
  mood?: string | null;
  location?: string | null;
  hashtags?: string[];
};

const MOOD_LINES: Record<string, string[]> = {
  'สดใสขี้เล่น': [
    'พลังงานล้นตู้ วันนี้วิ่งจนหญ้าแบนเลย 🐾',
    'ยิ้มกว้างขนาดนี้ ใครจะทนไม่ยิ้มตามได้',
    'โหมดขี้เล่นเต็มพิกัด ใครอยากมาเป็นเพื่อนวิ่งบ้าง?',
  ],
  'เท่คูล': [
    'ไม่ต้องพูดเยอะ มองกล้องแล้วเดินผ่านไปแบบนี้ละกัน',
    'โหมดเท่ประจำวัน ลมเย็นๆ กับสายตาที่รู้งาน',
    'คูลแบบไม่ตั้งใจ แต่กล้องจับได้หมด',
  ],
  'สายกิน': [
    'ได้กลิ่นขนมปุ๊บ หางสั่นปั๊บ ใครเข้าใจบ้าง?',
    'มื้อนี้คือความสุขที่วัดเป็นกรัมไม่ได้',
    'กินก่อน ถ่ายทีหลัง แต่ขอเบิ้ลอีกคำนะ',
  ],
  'ง่วงนอน': [
    'หลับตาแป๊บเดียวก็กลายเป็นสามชั่วโมง',
    'โหมดชาร์จแบตกลางแดด อ่อนโยนสุดๆ',
    'อย่าเรียกตอนนี้ กำลังเก็บพลังงานสำหรับวิ่งรอบดึก',
  ],
};

const GENERIC = [
  'วันนี้แดดดี หัวใจก็ดีตาม บันทึกโมเมนต์นี้ไว้ก่อน',
  'ออกไปสูดอากาศ แล้วกลับมาเป็นเด็กดีที่บ้าน',
  'แค่วินาทีธรรมดา ที่อยากเก็บไว้ดูอีกหลายรอบ',
  'ชีวิตดีๆ เริ่มจากเดินช้าๆ กับคนที่รัก',
];

function uniqueKeep(items: string[], limit = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function withHashtags(caption: string, tags: string[]): string {
  const cleaned = tags
    .map((tag) => String(tag).replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((tag) => `#${tag}`);
  if (cleaned.length === 0) return caption;
  if (cleaned.some((tag) => caption.includes(tag))) return caption;
  return `${caption} ${cleaned.join(' ')}`.trim();
}

export function suggestCaptions(ctx: CaptionContext): string[] {
  const name = (ctx.dogName || 'น้องหมา').trim() || 'น้องหมา';
  const mood = (ctx.mood || '').trim();
  const location = (ctx.location || '').trim();
  const tags = Array.isArray(ctx.hashtags) ? ctx.hashtags : [];

  const pool: string[] = [];

  if (mood && MOOD_LINES[mood]) {
    pool.push(...MOOD_LINES[mood].map((line) => `${name} ${line}`));
  }

  if (location) {
    pool.push(
      `${name} พาไปเดินที่ ${location} ลมดีจนไม่อยากกลับบ้าน`,
      `พิกัด ${location} ก้าวเล็กๆ ของ ${name} ที่ทำให้วันธรรมดาพิเศษขึ้น`,
      `แวะ ${location} วันนี้ เก็บโมเมนต์ของ ${name} ไว้เต็มอัลบั้ม`,
    );
  }

  pool.push(
    ...GENERIC.map((line) => `${name} ${line}`),
    `บันทึกวันนี้ของ ${name} ไว้ก่อน เผื่อวันหลังอยากยิ้มอีกครั้ง`,
  );

  const tagged = pool.map((line) => withHashtags(line, tags.length > 0 ? tags : ['InstaDog']));
  return uniqueKeep(tagged, 3);
}
