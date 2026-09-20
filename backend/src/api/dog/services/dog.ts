import { factories } from '@strapi/strapi';

import { lastSevenDateKeys } from '../../../utils/format';

/** เปลี่ยนชื่อเป็น handle แบบ browny.thegolden */
function slugifyHandle(input: string): string {
  const base = String(input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
  return base || 'dog';
}

const DEFAULT_ROUTINES = [
  { title: 'อาหารเช้า + วิตามิน', scheduledTime: '07:30 น.', category: 'food', icon: 'restaurant', order: 1 },
  { title: 'เดินเช้า 20 นาที', scheduledTime: '08:00 น.', category: 'walk', icon: 'directions_walk', order: 2 },
  { title: 'หวีขน', scheduledTime: '12:00 น.', category: 'groom', icon: 'content_cut', order: 3 },
  { title: 'อาหารเย็น', scheduledTime: '18:00 น.', category: 'food', icon: 'restaurant', order: 4 },
  { title: 'นัดวัคซีนพิษสุนัขบ้า', scheduledTime: 'พรุ่งนี้ 10:00 น.', category: 'health', icon: 'vaccines', order: 5 },
];

export default factories.createCoreService('api::dog.dog', ({ strapi }) => ({
  /** กัน handle ชนกันโดยต่อท้ายด้วยตัวเลข */
  async buildUniqueHandle(source: string): Promise<string> {
    const base = slugifyHandle(source).slice(0, 34);
    let candidate = base;
    let suffix = 1;

    // eslint-disable-next-line no-await-in-loop
    while (await strapi.db.query('api::dog.dog').findOne({ where: { handle: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  },

  /**
   * สุนัขใหม่ต้องมีตารางดูแล แผนโภชนาการ และกิจกรรมย้อนหลัง 7 วัน
   * ไม่งั้นหน้ากิจกรรมและ AI Bark จะว่างเปล่าทันทีที่สมัครเสร็จ
   */
  async seedDefaultsFor(dogId: number): Promise<void> {
    const existingRoutines = await strapi.db
      .query('api::care-routine.care-routine')
      .count({ where: { dog: dogId } });

    if (existingRoutines === 0) {
      for (const routine of DEFAULT_ROUTINES) {
        // eslint-disable-next-line no-await-in-loop
        await strapi.db.query('api::care-routine.care-routine').create({
          data: { ...routine, dog: dogId, isActive: true, publishedAt: new Date() },
        });
      }
    }

    const hasPlan = await strapi.db
      .query('api::nutrition-plan.nutrition-plan')
      .count({ where: { dog: dogId } });
    if (hasPlan === 0) {
      await strapi.db.query('api::nutrition-plan.nutrition-plan').create({
        data: {
          dog: dogId,
          dailyKcal: 1150,
          dryFoodGram: 320,
          mealsPerDay: 2,
          proteinPct: 26,
          fatPct: 14,
          forbiddenFoods: ['ช็อกโกแลต', 'องุ่นและลูกเกด', 'หัวหอม/กระเทียม', 'ไซลิทอล', 'อะโวคาโด'],
          publishedAt: new Date(),
        },
      });
    }

    const hasActivity = await strapi.db
      .query('api::daily-activity.daily-activity')
      .count({ where: { dog: dogId } });
    if (hasActivity === 0) {
      const keys = lastSevenDateKeys();
      for (let i = 0; i < keys.length; i += 1) {
        const steps = 3200 + Math.round(Math.sin(i * 1.3) * 1400) + i * 420;
        // eslint-disable-next-line no-await-in-loop
        await strapi.db.query('api::daily-activity.daily-activity').create({
          data: {
            dog: dogId,
            date: keys[i],
            steps,
            distanceKm: Number((steps * 0.00065).toFixed(2)),
            calories: Math.round(steps * 0.045),
            stepGoal: 7000,
            publishedAt: new Date(),
          },
        });
      }
    }
  },
}));
