import { clampInt, lastSevenDateKeys, toDateKey } from '../../../utils/format';
import { absoluteUrl } from '../../../utils/serializers';
import { findDogByRef, getPrimaryDog, requireUser } from '../../../utils/viewer';

const WEEKDAY_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

async function resolveDog(ctx: any, userId: number) {
  if (ctx.params.ref) return findDogByRef(strapi, ctx.params.ref);
  return getPrimaryDog(strapi, userId);
}

async function ensureTodayActivity(dogId: number) {
  const date = toDateKey();
  let row = await strapi.db.query('api::daily-activity.daily-activity').findOne({
    where: { dog: dogId, date },
  });
  if (!row) {
    row = await strapi.db.query('api::daily-activity.daily-activity').create({
      data: { dog: dogId, date, steps: 0, distanceKm: 0, calories: 0, stepGoal: 7000, publishedAt: new Date() },
    });
  }
  return row;
}

export default {
  /** GET /api/dogs/:ref/activity/today — วงแหวนเป้าหมายเดินเล่นวันนี้ */
  async today(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await resolveDog(ctx, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const row = await ensureTodayActivity(dog.id);
    const activeWalk = await strapi.db.query('api::walk-session.walk-session').findOne({
      where: { dog: dog.id, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });

    const steps = Number(row.steps ?? 0);
    const goal = Number(row.stepGoal ?? 7000);

    ctx.body = {
      data: {
        date: row.date,
        steps,
        stepGoal: goal,
        progress: goal > 0 ? Math.min(1, steps / goal) : 0,
        distanceKm: Number(row.distanceKm ?? 0),
        calories: Number(row.calories ?? 0),
        activeWalk: activeWalk
          ? { documentId: activeWalk.documentId, startedAt: activeWalk.startedAt }
          : null,
      },
    };
  },

  /** GET /api/dogs/:ref/activity/week — กราฟแนวโน้ม 7 วัน */
  async week(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await resolveDog(ctx, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const keys = lastSevenDateKeys();
    const rows = await strapi.db.query('api::daily-activity.daily-activity').findMany({
      where: { dog: dog.id, date: { $in: keys } },
    });
    const byDate = new Map(rows.map((r: any) => [String(r.date), r]));

    ctx.body = {
      data: keys.map((key) => {
        const row: any = byDate.get(key);
        return {
          date: key,
          weekdayTh: WEEKDAY_TH[new Date(key).getDay()],
          steps: Number(row?.steps ?? 0),
          distanceKm: Number(row?.distanceKm ?? 0),
          calories: Number(row?.calories ?? 0),
          stepGoal: Number(row?.stepGoal ?? 7000),
        };
      }),
    };
  },

  /** POST /api/walks/start */
  async startWalk(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const dog = body.dog
      ? await findDogByRef(strapi, String(body.dog))
      : await getPrimaryDog(strapi, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');
    if (dog.owner?.id !== user.id) return ctx.forbidden('เริ่มเดินเล่นได้เฉพาะสุนัขของตัวเอง');

    const running = await strapi.db.query('api::walk-session.walk-session').findOne({
      where: { dog: dog.id, status: 'active' },
    });
    if (running) {
      ctx.body = { data: { documentId: running.documentId, startedAt: running.startedAt, resumed: true } };
      return;
    }

    const created = await strapi.db.query('api::walk-session.walk-session').create({
      data: {
        dog: dog.id,
        user: user.id,
        startedAt: new Date(),
        status: 'active',
        publishedAt: new Date(),
      },
    });

    ctx.body = { data: { documentId: created.documentId, startedAt: created.startedAt, resumed: false } };
  },

  /**
   * POST /api/walks/:id/stop
   * แอปส่งค่าที่นับได้จากตัวจับเวลาฝั่ง client มาสรุป แล้วรวมเข้ากิจกรรมของวันนี้
   */
  async stopWalk(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    const walk = await strapi.db.query('api::walk-session.walk-session').findOne({
      where: { documentId: ctx.params.id },
      populate: { dog: true, user: true },
    });
    if (!walk) return ctx.notFound('ไม่พบรอบเดินเล่น');
    if (walk.user?.id !== user.id) return ctx.forbidden('ไม่ใช่รอบเดินเล่นของคุณ');

    const endedAt = new Date();
    const durationSec =
      body.durationSec !== undefined
        ? Math.max(0, Number(body.durationSec))
        : Math.max(0, Math.round((endedAt.getTime() - new Date(walk.startedAt).getTime()) / 1000));

    const steps = Math.max(0, Number(body.steps ?? Math.round(durationSec * 1.6)));
    const distanceKm = Number(body.distanceKm ?? Number((steps * 0.00065).toFixed(2)));
    const calories = Math.max(0, Number(body.calories ?? Math.round(steps * 0.045)));

    await strapi.db.query('api::walk-session.walk-session').update({
      where: { id: walk.id },
      data: { endedAt, durationSec, steps, distanceKm, calories, status: 'finished' },
    });

    const activity = await ensureTodayActivity(walk.dog.id);
    await strapi.db.query('api::daily-activity.daily-activity').update({
      where: { id: activity.id },
      data: {
        steps: Number(activity.steps ?? 0) + steps,
        distanceKm: Number((Number(activity.distanceKm ?? 0) + distanceKm).toFixed(2)),
        calories: Number(activity.calories ?? 0) + calories,
      },
    });

    await strapi.db.query('api::dog.dog').update({
      where: { id: walk.dog.id },
      data: {
        accumulatedKm: Number((Number(walk.dog.accumulatedKm ?? 0) + distanceKm).toFixed(2)),
      },
    });

    ctx.body = { data: { documentId: walk.documentId, durationSec, steps, distanceKm, calories } };
  },

  /** GET /api/walks — ประวัติการเดินเล่น */
  async listWalks(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const limit = clampInt(ctx.query.pageSize, 20, 1, 50);
    const rows = await strapi.db.query('api::walk-session.walk-session').findMany({
      where: { user: user.id, status: 'finished' },
      orderBy: { startedAt: 'desc' },
      limit,
      populate: { routePhoto: true, dog: true },
    });

    ctx.body = {
      data: rows.map((w: any) => ({
        documentId: w.documentId,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        durationSec: w.durationSec,
        steps: w.steps,
        distanceKm: Number(w.distanceKm ?? 0),
        calories: w.calories,
        routePhotoUrl: absoluteUrl(w.routePhoto?.url),
        dogNameTh: w.dog?.nameTh ?? null,
      })),
    };
  },

  /** GET /api/dogs/:ref/care-routines?date=YYYY-MM-DD — ตารางดูแลประจำวัน */
  async careRoutines(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await resolveDog(ctx, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const date = ctx.query.date ? String(ctx.query.date) : toDateKey();
    const routines = await strapi.db.query('api::care-routine.care-routine').findMany({
      where: { dog: dog.id, isActive: true },
      orderBy: { order: 'asc' },
      limit: 50,
    });

    const logs = await strapi.db.query('api::care-log.care-log').findMany({
      where: { date, routine: { id: { $in: routines.map((r: any) => r.id) } } },
      populate: { routine: true },
    });
    const byRoutine = new Map(logs.map((l: any) => [l.routine?.id, l]));

    const items = routines.map((r: any) => {
      const log: any = byRoutine.get(r.id);
      return {
        documentId: r.documentId,
        title: r.title,
        scheduledTime: r.scheduledTime,
        category: r.category,
        icon: r.icon,
        isCompleted: Boolean(log?.isCompleted),
        completedAt: log?.completedAt ?? null,
      };
    });

    ctx.body = {
      data: items,
      meta: {
        date,
        completed: items.filter((i) => i.isCompleted).length,
        total: items.length,
      },
    };
  },

  /** POST /api/care-logs/toggle — ติ๊กเสร็จ/ยกเลิก */
  async toggleCareLog(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    if (!body.routine) return ctx.badRequest('ต้องระบุรายการดูแล');
    const date = body.date ? String(body.date) : toDateKey();

    const routine = await strapi.db.query('api::care-routine.care-routine').findOne({
      where: { documentId: String(body.routine) },
      populate: { dog: { populate: { owner: true } } },
    });
    if (!routine) return ctx.notFound('ไม่พบรายการดูแล');
    if (routine.dog?.owner?.id !== user.id) return ctx.forbidden('ไม่ใช่รายการของคุณ');

    const existing = await strapi.db.query('api::care-log.care-log').findOne({
      where: { routine: routine.id, date },
    });

    let isCompleted: boolean;
    let completedAt: Date | null;

    if (existing) {
      isCompleted = !existing.isCompleted;
      completedAt = isCompleted ? new Date() : null;
      await strapi.db.query('api::care-log.care-log').update({
        where: { id: existing.id },
        data: { isCompleted, completedAt },
      });
    } else {
      isCompleted = true;
      completedAt = new Date();
      await strapi.db.query('api::care-log.care-log').create({
        data: { routine: routine.id, date, isCompleted, completedAt, publishedAt: new Date() },
      });
    }

    ctx.body = { documentId: routine.documentId, date, isCompleted, completedAt };
  },

  /** GET /api/dogs/:ref/care-insight — การ์ด AI Care Insight */
  async careInsight(ctx: any) {
    const user = requireUser(ctx);
    if (!user) return;

    const dog = await resolveDog(ctx, user.id);
    if (!dog) return ctx.notFound('ไม่พบสุนัข');

    const date = toDateKey();
    const routines = await strapi.db.query('api::care-routine.care-routine').findMany({
      where: { dog: dog.id, isActive: true },
    });
    const logs = await strapi.db.query('api::care-log.care-log').findMany({
      where: { date, isCompleted: true, routine: { id: { $in: routines.map((r: any) => r.id) } } },
    });
    const activity = await ensureTodayActivity(dog.id);

    const done = logs.length;
    const total = routines.length;
    const steps = Number(activity.steps ?? 0);
    const goal = Number(activity.stepGoal ?? 7000);

    let title: string;
    let message: string;

    if (total > 0 && done === total) {
      title = 'ดูแลครบทุกรายการแล้ว';
      message = `เยี่ยมมาก วันนี้ ${dog.nameTh} ได้รับการดูแลครบทุกข้อ รักษาจังหวะนี้ไว้นะ`;
    } else if (steps < goal * 0.5) {
      title = 'ยังเดินไม่ถึงครึ่งเป้าหมาย';
      message = `วันนี้ ${dog.nameTh} เดินได้ ${steps.toLocaleString('th-TH')} ก้าว จากเป้า ${goal.toLocaleString('th-TH')} ก้าว ลองพาออกไปเดินอีกสัก 15 นาที`;
    } else {
      title = 'ไปได้สวย';
      message = `ทำไปแล้ว ${done} จาก ${total} รายการ และเดินได้ ${steps.toLocaleString('th-TH')} ก้าว เหลืออีกนิดเดียวก็ครบเป้า`;
    }

    ctx.body = {
      data: {
        title,
        message,
        completedRoutines: done,
        totalRoutines: total,
        steps,
        stepGoal: goal,
      },
    };
  },
};
