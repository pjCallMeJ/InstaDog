"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'GET',
            path: '/feed',
            handler: 'feed.find',
            config: { policies: [] },
        },
    ],
};
