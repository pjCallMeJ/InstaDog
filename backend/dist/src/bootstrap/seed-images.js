"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSeedImages = ensureSeedImages;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const sharp_1 = __importDefault(require("sharp"));
const RECIPES = [
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
async function ensureSeedImages(strapi) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const backendRoot = (_c = (_b = (_a = strapi.dirs) === null || _a === void 0 ? void 0 : _a.app) === null || _b === void 0 ? void 0 : _b.root) !== null && _c !== void 0 ? _c : process.cwd();
    const sourceDir = node_path_1.default.join(backendRoot, 'data', 'seed-source');
    const outDir = node_path_1.default.join(backendRoot, '.tmp', 'seed-images');
    await promises_1.default.mkdir(outDir, { recursive: true });
    const sources = {
        golden: await promises_1.default.readFile(node_path_1.default.join(sourceDir, 'golden.webp')),
        shiba: await promises_1.default.readFile(node_path_1.default.join(sourceDir, 'shiba.webp')),
    };
    const result = new Map();
    for (const recipe of RECIPES) {
        const outPath = node_path_1.default.join(outDir, recipe.file);
        result.set(recipe.file, outPath);
        try {
            await promises_1.default.access(outPath);
            continue; // สร้างไว้แล้ว ไม่ต้องทำซ้ำ
        }
        catch {
            // ยังไม่มี สร้างใหม่ด้านล่าง
        }
        const input = sources[recipe.source];
        const meta = await (0, sharp_1.default)(input).metadata();
        const w = (_d = meta.width) !== null && _d !== void 0 ? _d : 1000;
        const h = (_e = meta.height) !== null && _e !== void 0 ? _e : 1000;
        const side = Math.round(Math.min(w, h) * recipe.crop.size);
        let pipeline = (0, sharp_1.default)(input).extract({
            left: Math.min(Math.round(w * recipe.crop.left), Math.max(0, w - side)),
            top: Math.min(Math.round(h * recipe.crop.top), Math.max(0, h - side)),
            width: side,
            height: side,
        });
        if (recipe.flip)
            pipeline = pipeline.flop();
        if (recipe.hue !== undefined || recipe.saturation !== undefined || recipe.brightness !== undefined) {
            pipeline = pipeline.modulate({
                hue: (_f = recipe.hue) !== null && _f !== void 0 ? _f : 0,
                saturation: (_g = recipe.saturation) !== null && _g !== void 0 ? _g : 1,
                brightness: (_h = recipe.brightness) !== null && _h !== void 0 ? _h : 1,
            });
        }
        const buffer = await pipeline
            .resize(recipe.width, recipe.height, { fit: 'cover', position: 'attention' })
            .jpeg({ quality: 86, mozjpeg: true })
            .toBuffer();
        await promises_1.default.writeFile(outPath, buffer);
    }
    strapi.log.info(`[instadog] เตรียมรูป seed ${result.size} ไฟล์`);
    return result;
}
