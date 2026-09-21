"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("./bootstrap/permissions");
const seed_1 = require("./bootstrap/seed");
exports.default = {
    register( /* { strapi }: { strapi: Core.Strapi } */) { },
    async bootstrap({ strapi }) {
        // ทั้งสองขั้นตอนรันซ้ำได้ เครื่องนักเรียนจึงเริ่มจากสถานะเดียวกันเสมอ
        await (0, permissions_1.applyPermissions)(strapi);
        if (process.env.SKIP_SEED !== 'true') {
            try {
                await (0, seed_1.runSeed)(strapi);
            }
            catch (error) {
                strapi.log.error('[instadog] seed ล้มเหลว');
                strapi.log.error(error);
            }
        }
    },
};
