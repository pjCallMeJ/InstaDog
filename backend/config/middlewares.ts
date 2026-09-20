import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          upgradeInsecureRequests: null,
        },
      },
      // Flutter web (CanvasKit) อ่านรูปจากพอร์ต 1337 คนละ origin กับแอป
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Strapi 5 เทียบ origin แบบ string ตรง ๆ (regex ใน array ใช้ไม่ได้)
      // ค่า '*' จะสะท้อน Origin ของ request กลับไป จึงรองรับ Flutter web ที่สุ่มพอร์ต
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      credentials: true,
      keepHeadersOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
