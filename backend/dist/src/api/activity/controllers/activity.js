"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../../utils/format");
const serializers_1 = require("../../../utils/serializers");
const viewer_1 = require("../../../utils/viewer");
const WEEKDAY_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
async function resolveDog(ctx, userId) {
    if (ctx.params.ref)
        return (0, viewer_1.findDogByRef)(strapi, ctx.params.ref);
    return (0, viewer_1.getPrimaryDog)(strapi, userId);
}
async function ensureTodayActivity(dogId) {
    const date = (0, format_1.toDateKey)();
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
exports.default = {
    /** GET /api/dogs/:ref/activity/today — วงแหวนเป้าหมายเดินเล่นวันนี้ */
    async today(ctx) {
        var _a, _b, _c, _d;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await resolveDog(ctx, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const row = await ensureTodayActivity(dog.id);
        const activeWalk = await strapi.db.query('api::walk-session.walk-session').findOne({
            where: { dog: dog.id, status: 'active' },
            orderBy: { startedAt: 'desc' },
        });
        const steps = Number((_a = row.steps) !== null && _a !== void 0 ? _a : 0);
        const goal = Number((_b = row.stepGoal) !== null && _b !== void 0 ? _b : 7000);
        ctx.body = {
            data: {
                date: row.date,
                steps,
                stepGoal: goal,
                progress: goal > 0 ? Math.min(1, steps / goal) : 0,
                distanceKm: Number((_c = row.distanceKm) !== null && _c !== void 0 ? _c : 0),
                calories: Number((_d = row.calories) !== null && _d !== void 0 ? _d : 0),
                activeWalk: activeWalk
                    ? { documentId: activeWalk.documentId, startedAt: activeWalk.startedAt }
                    : null,
            },
        };
    },
    /** GET /api/dogs/:ref/activity/week — กราฟแนวโน้ม 7 วัน */
    async week(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await resolveDog(ctx, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const keys = (0, format_1.lastSevenDateKeys)();
        const rows = await strapi.db.query('api::daily-activity.daily-activity').findMany({
            where: { dog: dog.id, date: { $in: keys } },
        });
        const byDate = new Map(rows.map((r) => [String(r.date), r]));
        ctx.body = {
            data: keys.map((key) => {
                var _a, _b, _c, _d;
                const row = byDate.get(key);
                return {
                    date: key,
                    weekdayTh: WEEKDAY_TH[new Date(key).getDay()],
                    steps: Number((_a = row === null || row === void 0 ? void 0 : row.steps) !== null && _a !== void 0 ? _a : 0),
                    distanceKm: Number((_b = row === null || row === void 0 ? void 0 : row.distanceKm) !== null && _b !== void 0 ? _b : 0),
                    calories: Number((_c = row === null || row === void 0 ? void 0 : row.calories) !== null && _c !== void 0 ? _c : 0),
                    stepGoal: Number((_d = row === null || row === void 0 ? void 0 : row.stepGoal) !== null && _d !== void 0 ? _d : 7000),
                };
            }),
        };
    },
    /** POST /api/walks/start */
    async startWalk(ctx) {
        var _a, _b, _c, _d;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const dog = body.dog
            ? await (0, viewer_1.findDogByRef)(strapi, String(body.dog))
            : await (0, viewer_1.getPrimaryDog)(strapi, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        if (((_d = dog.owner) === null || _d === void 0 ? void 0 : _d.id) !== user.id)
            return ctx.forbidden('เริ่มเดินเล่นได้เฉพาะสุนัขของตัวเอง');
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
    async stopWalk(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        const walk = await strapi.db.query('api::walk-session.walk-session').findOne({
            where: { documentId: ctx.params.id },
            populate: { dog: true, user: true },
        });
        if (!walk)
            return ctx.notFound('ไม่พบรอบเดินเล่น');
        if (((_d = walk.user) === null || _d === void 0 ? void 0 : _d.id) !== user.id)
            return ctx.forbidden('ไม่ใช่รอบเดินเล่นของคุณ');
        const endedAt = new Date();
        const durationSec = body.durationSec !== undefined
            ? Math.max(0, Number(body.durationSec))
            : Math.max(0, Math.round((endedAt.getTime() - new Date(walk.startedAt).getTime()) / 1000));
        const steps = Math.max(0, Number((_e = body.steps) !== null && _e !== void 0 ? _e : Math.round(durationSec * 1.6)));
        const distanceKm = Number((_f = body.distanceKm) !== null && _f !== void 0 ? _f : Number((steps * 0.00065).toFixed(2)));
        const calories = Math.max(0, Number((_g = body.calories) !== null && _g !== void 0 ? _g : Math.round(steps * 0.045)));
        await strapi.db.query('api::walk-session.walk-session').update({
            where: { id: walk.id },
            data: { endedAt, durationSec, steps, distanceKm, calories, status: 'finished' },
        });
        const activity = await ensureTodayActivity(walk.dog.id);
        await strapi.db.query('api::daily-activity.daily-activity').update({
            where: { id: activity.id },
            data: {
                steps: Number((_h = activity.steps) !== null && _h !== void 0 ? _h : 0) + steps,
                distanceKm: Number((Number((_j = activity.distanceKm) !== null && _j !== void 0 ? _j : 0) + distanceKm).toFixed(2)),
                calories: Number((_k = activity.calories) !== null && _k !== void 0 ? _k : 0) + calories,
            },
        });
        await strapi.db.query('api::dog.dog').update({
            where: { id: walk.dog.id },
            data: {
                accumulatedKm: Number((Number((_l = walk.dog.accumulatedKm) !== null && _l !== void 0 ? _l : 0) + distanceKm).toFixed(2)),
            },
        });
        ctx.body = { data: { documentId: walk.documentId, durationSec, steps, distanceKm, calories } };
    },
    /** GET /api/walks — ประวัติการเดินเล่น */
    async listWalks(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const limit = (0, format_1.clampInt)(ctx.query.pageSize, 20, 1, 50);
        const rows = await strapi.db.query('api::walk-session.walk-session').findMany({
            where: { user: user.id, status: 'finished' },
            orderBy: { startedAt: 'desc' },
            limit,
            populate: { routePhoto: true, dog: true },
        });
        ctx.body = {
            data: rows.map((w) => {
                var _a, _b, _c, _d;
                return ({
                    documentId: w.documentId,
                    startedAt: w.startedAt,
                    endedAt: w.endedAt,
                    durationSec: w.durationSec,
                    steps: w.steps,
                    distanceKm: Number((_a = w.distanceKm) !== null && _a !== void 0 ? _a : 0),
                    calories: w.calories,
                    routePhotoUrl: (0, serializers_1.absoluteUrl)((_b = w.routePhoto) === null || _b === void 0 ? void 0 : _b.url),
                    dogNameTh: (_d = (_c = w.dog) === null || _c === void 0 ? void 0 : _c.nameTh) !== null && _d !== void 0 ? _d : null,
                });
            }),
        };
    },
    /** GET /api/dogs/:ref/care-routines?date=YYYY-MM-DD — ตารางดูแลประจำวัน */
    async careRoutines(ctx) {
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await resolveDog(ctx, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const date = ctx.query.date ? String(ctx.query.date) : (0, format_1.toDateKey)();
        const routines = await strapi.db.query('api::care-routine.care-routine').findMany({
            where: { dog: dog.id, isActive: true },
            orderBy: { order: 'asc' },
            limit: 50,
        });
        const logs = await strapi.db.query('api::care-log.care-log').findMany({
            where: { date, routine: { id: { $in: routines.map((r) => r.id) } } },
            populate: { routine: true },
        });
        const byRoutine = new Map(logs.map((l) => { var _a; return [(_a = l.routine) === null || _a === void 0 ? void 0 : _a.id, l]; }));
        const items = routines.map((r) => {
            var _a;
            const log = byRoutine.get(r.id);
            return {
                documentId: r.documentId,
                title: r.title,
                scheduledTime: r.scheduledTime,
                category: r.category,
                icon: r.icon,
                isCompleted: Boolean(log === null || log === void 0 ? void 0 : log.isCompleted),
                completedAt: (_a = log === null || log === void 0 ? void 0 : log.completedAt) !== null && _a !== void 0 ? _a : null,
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
    async toggleCareLog(ctx) {
        var _a, _b, _c, _d, _e;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const body = (_c = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : ctx.request.body) !== null && _c !== void 0 ? _c : {};
        if (!body.routine)
            return ctx.badRequest('ต้องระบุรายการดูแล');
        const date = body.date ? String(body.date) : (0, format_1.toDateKey)();
        const routine = await strapi.db.query('api::care-routine.care-routine').findOne({
            where: { documentId: String(body.routine) },
            populate: { dog: { populate: { owner: true } } },
        });
        if (!routine)
            return ctx.notFound('ไม่พบรายการดูแล');
        if (((_e = (_d = routine.dog) === null || _d === void 0 ? void 0 : _d.owner) === null || _e === void 0 ? void 0 : _e.id) !== user.id)
            return ctx.forbidden('ไม่ใช่รายการของคุณ');
        const existing = await strapi.db.query('api::care-log.care-log').findOne({
            where: { routine: routine.id, date },
        });
        let isCompleted;
        let completedAt;
        if (existing) {
            isCompleted = !existing.isCompleted;
            completedAt = isCompleted ? new Date() : null;
            await strapi.db.query('api::care-log.care-log').update({
                where: { id: existing.id },
                data: { isCompleted, completedAt },
            });
        }
        else {
            isCompleted = true;
            completedAt = new Date();
            await strapi.db.query('api::care-log.care-log').create({
                data: { routine: routine.id, date, isCompleted, completedAt, publishedAt: new Date() },
            });
        }
        ctx.body = { documentId: routine.documentId, date, isCompleted, completedAt };
    },
    /** GET /api/dogs/:ref/care-insight — การ์ด AI Care Insight */
    async careInsight(ctx) {
        var _a, _b;
        const user = (0, viewer_1.requireUser)(ctx);
        if (!user)
            return;
        const dog = await resolveDog(ctx, user.id);
        if (!dog)
            return ctx.notFound('ไม่พบสุนัข');
        const date = (0, format_1.toDateKey)();
        const routines = await strapi.db.query('api::care-routine.care-routine').findMany({
            where: { dog: dog.id, isActive: true },
        });
        const logs = await strapi.db.query('api::care-log.care-log').findMany({
            where: { date, isCompleted: true, routine: { id: { $in: routines.map((r) => r.id) } } },
        });
        const activity = await ensureTodayActivity(dog.id);
        const done = logs.length;
        const total = routines.length;
        const steps = Number((_a = activity.steps) !== null && _a !== void 0 ? _a : 0);
        const goal = Number((_b = activity.stepGoal) !== null && _b !== void 0 ? _b : 7000);
        let title;
        let message;
        if (total > 0 && done === total) {
            title = 'ดูแลครบทุกรายการแล้ว';
            message = `เยี่ยมมาก วันนี้ ${dog.nameTh} ได้รับการดูแลครบทุกข้อ รักษาจังหวะนี้ไว้นะ`;
        }
        else if (steps < goal * 0.5) {
            title = 'ยังเดินไม่ถึงครึ่งเป้าหมาย';
            message = `วันนี้ ${dog.nameTh} เดินได้ ${steps.toLocaleString('th-TH')} ก้าว จากเป้า ${goal.toLocaleString('th-TH')} ก้าว ลองพาออกไปเดินอีกสัก 15 นาที`;
        }
        else {
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
