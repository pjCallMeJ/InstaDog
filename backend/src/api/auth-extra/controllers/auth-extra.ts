import { serializeDogDetail } from '../../../utils/serializers';

/**
 * สมัครสมาชิกพร้อม Quick Add สุนัขตัวแรกในคำขอเดียว
 * ตรงกับฟอร์ม Register ที่เก็บทั้งข้อมูลเจ้าของและน้องหมา
 */
export default {
  async registerWithDog(ctx: any) {
    const body = ctx.request.body ?? {};
    const { username, email, password, displayName, dog } = body;

    if (!username || !email || !password) {
      return ctx.badRequest('ต้องกรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน');
    }
    if (String(password).length < 6) {
      return ctx.badRequest('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร');
    }

    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const settings: any = await pluginStore.get({ key: 'advanced' });

    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: settings?.default_role ?? 'authenticated' },
    });

    const [emailTaken, usernameTaken] = await Promise.all([
      strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: String(email).toLowerCase() },
      }),
      strapi.db.query('plugin::users-permissions.user').findOne({ where: { username } }),
    ]);
    if (emailTaken) return ctx.badRequest('อีเมลนี้ถูกใช้แล้ว');
    if (usernameTaken) return ctx.badRequest('ชื่อผู้ใช้นี้ถูกใช้แล้ว');

    const user = await strapi.plugin('users-permissions').service('user').add({
      username,
      email: String(email).toLowerCase(),
      password,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: role?.id,
    });

    await strapi.db.query('api::owner-profile.owner-profile').create({
      data: {
        user: user.id,
        displayName: displayName || username,
        isPublic: true,
        publishedAt: new Date(),
      },
    });

    let createdDog: any = null;
    if (dog?.nameTh) {
      const handle = await strapi
        .service('api::dog.dog')
        .buildUniqueHandle(dog.handle ?? dog.nameEn ?? dog.nameTh);

      let breedId: number | null = null;
      if (dog.breed) {
        const breed = await strapi.db.query('api::breed.breed').findOne({
          where: { $or: [{ documentId: String(dog.breed) }, { slug: String(dog.breed) }] },
        });
        breedId = breed?.id ?? null;
      }

      createdDog = await strapi.db.query('api::dog.dog').create({
        data: {
          owner: user.id,
          handle,
          nameTh: dog.nameTh,
          nameEn: dog.nameEn ?? null,
          breed: breedId,
          gender: dog.gender === 'female' ? 'female' : 'male',
          birthDate: dog.birthDate ?? null,
          weight: dog.weight !== undefined ? Number(dog.weight) : null,
          bio: dog.bio ?? null,
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
      dog: createdDog ? serializeDogDetail(createdDog, { isMine: true }) : null,
    };
  },
};
