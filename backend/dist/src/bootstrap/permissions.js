"use strict";
/**
 * Permission matrix แบบรันซ้ำได้
 * ตั้งในโค้ดแทนการคลิกใน Admin เพื่อให้เครื่องนักเรียนทุกเครื่องได้ผลเหมือนกัน
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPermissions = applyPermissions;
const PUBLIC_ACTIONS = [
    'plugin::users-permissions.auth.callback',
    'plugin::users-permissions.auth.register',
    'plugin::users-permissions.auth.forgotPassword',
    'plugin::users-permissions.auth.resetPassword',
    'api::auth-extra.auth-extra.registerWithDog',
    'api::breed.breed.find',
    'api::breed.breed.findOne',
    'api::explore-category.explore-category.find',
];
const AUTHENTICATED_ACTIONS = [
    // Auth และบัญชี
    'plugin::users-permissions.user.me',
    'plugin::users-permissions.auth.changePassword',
    'plugin::upload.content-api.upload',
    // ข้อมูลอ้างอิง
    'api::breed.breed.find',
    'api::breed.breed.findOne',
    'api::explore-category.explore-category.find',
    'api::explore-category.explore-category.findOne',
    'api::achievement.achievement.find',
    'api::grooming-style.grooming-style.find',
    'api::hashtag.hashtag.find',
    // ฟีดและโพสต์
    'api::feed.feed.find',
    'api::post.post.find',
    'api::post.post.findOne',
    'api::post.post.create',
    'api::post.post.delete',
    'api::post.post.toggleLike',
    'api::post.post.toggleSave',
    'api::post.post.listComments',
    'api::post.post.addComment',
    // สตอรี่
    'api::story.story.ring',
    'api::story.story.publish',
    'api::story.story.markViewed',
    'api::story.story.reply',
    // สำรวจและค้นหา
    'api::explore.explore.categories',
    'api::explore.explore.find',
    'api::explore.explore.search',
    // แจ้งเตือน
    'api::notification.notification.list',
    'api::notification.notification.unreadCount',
    'api::notification.notification.readAll',
    // โปรไฟล์สุนัข
    'api::dog.dog.find',
    'api::dog.dog.findOne',
    'api::dog.dog.update',
    'api::dog.dog.profile',
    'api::dog.dog.posts',
    'api::dog.dog.photos',
    'api::dog.dog.about',
    'api::dog.dog.toggleFollow',
    'api::dog.dog.followers',
    'api::dog.dog.following',
    // บัญชีของฉัน
    'api::me.me.profile',
    'api::me.me.updateProfile',
    'api::me.me.dogs',
    'api::me.me.addDog',
    'api::me.me.saved',
    // กิจกรรมและการดูแล
    'api::activity.activity.today',
    'api::activity.activity.week',
    'api::activity.activity.startWalk',
    'api::activity.activity.stopWalk',
    'api::activity.activity.listWalks',
    'api::activity.activity.careRoutines',
    'api::activity.activity.toggleCareLog',
    'api::activity.activity.careInsight',
    'api::activity.activity.updateTodayNote',
    'api::activity.activity.createCareRoutine',
    'api::activity.activity.updateCareRoutine',
    'api::activity.activity.deleteCareRoutine',
    'api::post.post.suggestCaption',
    // AI Bark
    'api::bark.bark.thread',
    'api::bark.bark.sendMessage',
    'api::bark.bark.groomingStyles',
    'api::bark.bark.createBooking',
    'api::bark.bark.nutritionPlan',
];
async function applyRole(strapi, roleType, allowed) {
    const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: roleType } });
    if (!role) {
        strapi.log.warn(`[instadog] ไม่พบ role "${roleType}" ข้ามการตั้งสิทธิ์`);
        return;
    }
    const allowedSet = new Set(allowed);
    const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findMany({ where: { role: role.id }, limit: -1 });
    const existingByAction = new Map(existing.map((p) => [p.action, p]));
    for (const action of allowedSet) {
        const found = existingByAction.get(action);
        if (found) {
            if (!found.enabled) {
                await strapi.db
                    .query('plugin::users-permissions.permission')
                    .update({ where: { id: found.id }, data: { enabled: true } });
            }
        }
        else {
            await strapi.db
                .query('plugin::users-permissions.permission')
                .create({ data: { action, role: role.id, enabled: true } });
        }
    }
    // ปิดทุกอย่างที่ไม่ได้อยู่ในรายการ เพื่อให้รันซ้ำแล้วผลลัพธ์คงที่
    for (const permission of existing) {
        if (!allowedSet.has(permission.action) && permission.enabled) {
            await strapi.db
                .query('plugin::users-permissions.permission')
                .update({ where: { id: permission.id }, data: { enabled: false } });
        }
    }
}
async function applyPermissions(strapi) {
    var _a;
    await applyRole(strapi, 'public', PUBLIC_ACTIONS);
    await applyRole(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
    // ปิดการยืนยันอีเมล และเปิดสมัครสมาชิก ตามสเปก MVP
    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const advanced = (_a = (await store.get({ key: 'advanced' }))) !== null && _a !== void 0 ? _a : {};
    await store.set({
        key: 'advanced',
        value: {
            ...advanced,
            email_confirmation: false,
            allow_register: true,
            default_role: 'authenticated',
            unique_email: true,
        },
    });
    strapi.log.info('[instadog] ตั้งค่าสิทธิ์และ Users & Permissions เรียบร้อย');
}
