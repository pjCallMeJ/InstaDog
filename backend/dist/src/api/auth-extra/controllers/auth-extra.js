"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serializers_1 = require("../../../utils/serializers");
/**
 * สมัครสมาชิกพร้อม Quick Add สุนัขตัวแรกในคำขอเดียว
 * ตรงกับฟอร์ม Register ที่เก็บทั้งข้อมูลเจ้าของและน้องหมา
 */
exports.default = {
    async registerWithDog(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const body = (_a = ctx.request.body) !== null && _a !== void 0 ? _a : {};
        const { username, email, password, displayName, dog } = body;
        if (!username || !email || !password) {
            return ctx.badRequest('ต้องกรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน');
        }
        if (String(password).length < 6) {
            return ctx.badRequest('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร');
        }
        const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
        const settings = await pluginStore.get({ key: 'advanced' });
        const role = await strapi.db.query('plugin::users-permissions.role').findOne({
            where: { type: (_b = settings === null || settings === void 0 ? void 0 : settings.default_role) !== null && _b !== void 0 ? _b : 'authenticated' },
        });
        const [emailTaken, usernameTaken] = await Promise.all([
            strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: String(email).toLowerCase() },
            }),
            strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } }),
        ]);
        if (emailTaken)
            return ctx.badRequest('อีเมลนี้ถูกใช้แล้ว');
        if (usernameTaken)
            return ctx.badRequest('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
        const user = await strapi.plugin('users-permissions').service('user').add({
            username,
            email: String(email).toLowerCase(),
            password,
            provider: 'local',
            confirmed: true,
            blocked: false,
            role: role === null || role === void 0 ? void 0 : role.id,
        });
        await strapi.db.query('api::owner-profile.owner-profile').create({
            data: {
                user: user.id,
                displayName: displayName || username,
                isPublic: true,
                publishedAt: new Date(),
            },
        });
        let createdDog = null;
        if (dog === null || dog === void 0 ? void 0 : dog.nameTh) {
            const handle = await strapi
                .service('api::dog.dog')
                .buildUniqueHandle((_d = (_c = dog.handle) !== null && _c !== void 0 ? _c : dog.nameEn) !== null && _d !== void 0 ? _d : dog.nameTh);
            let breedId = null;
            if (dog.breed) {
                const breed = await strapi.db.query('api::breed.breed').findOne({
                    where: { $or: [{ documentId: String(dog.breed) }, { slug: String(dog.breed) }] },
                });
                breedId = (_e = breed === null || breed === void 0 ? void 0 : breed.id) !== null && _e !== void 0 ? _e : null;
            }
            createdDog = await strapi.db.query('api::dog.dog').create({
                data: {
                    owner: user.id,
                    handle,
                    nameTh: dog.nameTh,
                    nameEn: (_f = dog.nameEn) !== null && _f !== void 0 ? _f : null,
                    breed: breedId,
                    gender: dog.gender === 'female' ? 'female' : 'male',
                    birthDate: (_g = dog.birthDate) !== null && _g !== void 0 ? _g : null,
                    weight: dog.weight !== undefined ? Number(dog.weight) : null,
                    bio: (_h = dog.bio) !== null && _h !== void 0 ? _h : null,
                    isPublic: true,
                    isPrimary: true,
                    publishedAt: new Date(),
                },
            });
            await strapi.service('api::dog.dog').seedDefaultsFor(createdDog.id);
            createdDog = await strapi.db.query('api::dog.dog').findOne({
                where: { id: createdDog.id },
                populate: { avatar: true, coverImage: true, breed: true, owner: true },
            });
        }
        const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });
        ctx.body = {
            jwt,
            user: {
                id: user.id,
                documentId: user.documentId,
                username: user.username,
                email: user.email,
                confirmed: user.confirmed,
            },
            dog: createdDog ? (0, serializers_1.serializeDogDetail)(createdDog, { isMine: true }) : null,
        };
    },
};
