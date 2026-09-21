"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        { method: 'GET', path: '/notifications', handler: 'notification.list', config: { policies: [] } },
        {
            method: 'GET',
            path: '/notifications/unread-count',
            handler: 'notification.unreadCount',
            config: { policies: [] },
        },
        {
            method: 'POST',
            path: '/notifications/read-all',
            handler: 'notification.readAll',
            config: { policies: [] },
        },
    ],
};
