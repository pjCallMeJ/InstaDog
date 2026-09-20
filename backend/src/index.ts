import type { Core } from '@strapi/strapi';

import { applyPermissions } from './bootstrap/permissions';
import { runSeed } from './bootstrap/seed';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ทั้งสองขั้นตอนรันซ้ำได้ เครื่องนักเรียนจึงเริ่มจากสถานะเดียวกันเสมอ
    await applyPermissions(strapi);

    if (process.env.SKIP_SEED !== 'true') {
      try {
        await runSeed(strapi);
      } catch (error) {
        strapi.log.error('[instadog] seed ล้มเหลว');
        strapi.log.error(error);
      }
    }
  },
};
