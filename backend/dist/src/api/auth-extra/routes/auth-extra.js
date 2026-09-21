"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'POST',
            path: '/auth/register-with-dog',
            handler: 'auth-extra.registerWithDog',
            config: { policies: [], auth: false },
        },
    ],
};
