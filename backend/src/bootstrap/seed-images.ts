import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

/**
 * สร้างรูปตัวอย่างสำหรับ seed จากภาพต้นฉบับสองไฟล์ใน data/seed-source
 * ทำแบบออฟไลน์ล้วน เครื่องนักเรียนจึงไม่ต้องต่ออินเทอร์เน็ตเพื่อให้เดโมมีรูป
 */

type Recipe = {
  file: string;
  source: 'golden' | 'shiba';
  /** สัดส่วนพื้นที่ที่จะครอบ (0-1) */
  crop: { left: number; top: number; size: number };
  width: number;
  height: number;
  /** ปรับสีเล็กน้อยเพื่อให้แต่ละรูปดูไม่ซ้ำกันบนกริด */
  hue?: number;
  saturation?: number;
  brightness?: number;
  flip?: boolean;
};

const RECIPES: Recipe[] = [
  { file: 'bruni-avatar.jpg', source: 'golden', crop: { left: 0.28, top: 0.05, size: 0.46 }, width: 512, height: 512 },
  { file: 'bruni-cover.jpg', source: 'golden', crop: { left: 0.06, top: 0.0, size: 0.9 }, width: 1080, height: 720 },
  { file: 'momo-avatar.jpg', source: 'shiba', crop: { left: 0.26, top: 0.08, size: 0.48 }, width: 512, height: 512 },
  { file: 'momo-cover.jpg', source: 'shiba', crop: { left: 0.05, top: 0.05, size: 0.9 }, width: 1080, height: 720 },

  { file: 'post-walk.jpg', source: 'golden', crop: { left: 0.0, top: 0.0, size: 1.0 }, width: 1080, height: 1080 },
  { file: 'post-cafe.jpg', source: 'shiba', crop: { left: 0.0, top: 0.0, size: 1.0 }, width: 1080, height: 1080 },
  { file: 'post-park.jpg', source: 'golden', crop: { left: 0.2, top: 0.3, size: 0.7 }, width: 1080, height: 1080, hue: 12, saturation: 1.1 },
  { file: 'post-sunset.jpg', source: 'golden', crop: { left: 0.05, top: 0.35, size: 0.62 }, width: 1080, height: 1080, hue: -14, brightness: 1.05 },
  { file: 'post-nap.jpg', source: 'shiba', crop: { left: 0.18, top: 0.2, size: 0.66 }, width: 1080, height: 1080, hue: 8, brightness: 0.97 },
  { file: 'post-treat.jpg', source: 'shiba', crop: { left: 0.3, top: 0.05, size: 0.58 }, width: 1080, height: 1080, hue: -10, saturation: 1.15, flip: true },
  { file: 'post-beach.jpg', source: 'golden', crop: { left: 0.32, top: 0.1, size: 0.55 }, width: 1080, height: 1080, hue: 20, flip: true },
  { file: 'post-groom.jpg', source: 'golden', crop: { left: 0.1, top: 0.45, size: 0.5 }, width: 1080, height: 1080, saturation: 0.85 },
  { file: 'post-play.jpg', source: 'shiba', crop: { left: 0.4, top: 0.3, size: 0.52 }, width: 1080, height: 1080, hue: 25 },

  { file: 'story-bruni.jpg', source: 'golden', crop: { left: 0.1, top: 0.0, size: 0.8 }, width: 1080, height: 1920 },
  { file: 'story-momo.jpg', source: 'shiba', crop: { left: 0.12, top: 0.0, size: 0.78 }, width: 1080, height: 1920, hue: 6 },
  { file: 'story-biggy.jpg', source: 'golden', crop: { left: 0.25, top: 0.12, size: 0.6 }, width: 1080, height: 1920, hue: -18 },
  { file: 'story-chin.jpg', source: 'shiba', crop: { left: 0.05, top: 0.25, size: 0.68 }, width: 1080, height: 1920, hue: 16, saturation: 1.1 },

  { file: 'walk-route.jpg', source: 'golden', crop: { left: 0.0, top: 0.55, size: 1.0 }, width: 1080, height: 600, saturation: 0.9 },

  { file: 'groom-fluffy.jpg', source: 'golden', crop: { left: 0.25, top: 0.02, size: 0.5 }, width: 720, height: 720 },
  { file: 'groom-teddy.jpg', source: 'shiba', crop: { left: 0.24, top: 0.06, size: 0.52 }, width: 720, height: 720, hue: 10 },
  { file: 'groom-summer.jpg', source: 'golden', crop: { left: 0.3, top: 0.2, size: 0.45 }, width: 720, height: 720, hue: -12, brightness: 1.06 },
];

export type SeedImage = { name: string; filePath: string };

export async function ensureSeedImages(strapi: any): Promise<Map<string, string>> {
  const backendRoot = strapi.dirs?.app?.root ?? process.cwd();
  const sourceDir = path.join(backendRoot, 'data', 'seed-source');
  const outDir = path.join(backendRoot, '.tmp', 'seed-images');

  await fs.mkdir(outDir, { recursive: true });

  const sources: Record<string, Buffer> = {
    golden: await fs.readFile(path.join(sourceDir, 'golden.webp')),
    shiba: await fs.readFile(path.join(sourceDir, 'shiba.webp')),
  };

  const result = new Map<string, string>();

  for (const recipe of RECIPES) {
    const outPath = path.join(outDir, recipe.file);
    result.set(recipe.file, outPath);

    try {
      await fs.access(outPath);
      continue; // สร้างไว้แล้ว ไม่ต้องทำซ้ำ
    } catch {
      // ยังไม่มี สร้างใหม่ด้านล่าง
    }

    const input = sources[recipe.source];
    const meta = await sharp(input).metadata();
    const w = meta.width ?? 1000;
    const h = meta.height ?? 1000;
    const side = Math.round(Math.min(w, h) * recipe.crop.size);

    let pipeline = sharp(input).extract({
      left: Math.min(Math.round(w * recipe.crop.left), Math.max(0, w - side)),
      top: Math.min(Math.round(h * recipe.crop.top), Math.max(0, h - side)),
      width: side,
      height: side,
    });

    if (recipe.flip) pipeline = pipeline.flop();

    if (recipe.hue !== undefined || recipe.saturation !== undefined || recipe.brightness !== undefined) {
      pipeline = pipeline.modulate({
        hue: recipe.hue ?? 0,
        saturation: recipe.saturation ?? 1,
        brightness: recipe.brightness ?? 1,
      });
    }

    const buffer = await pipeline
      .resize(recipe.width, recipe.height, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();

    await fs.writeFile(outPath, buffer);
  }

  strapi.log.info(`[instadog] เตรียมรูป seed ${result.size} ไฟล์`);
  return result;
}
