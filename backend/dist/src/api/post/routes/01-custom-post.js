"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'POST',
            path: '/posts/:id/like',
            handler: 'post.toggleLike',
            config: { policies: [] },
        },
        {
            method: 'POST',
            path: '/posts/:id/save',
            handler: 'post.toggleSave',
            config: { policies: [] },
        },
        {
            method: 'GET',
            path: '/posts/:id/comments',
            handler: 'post.listComments',
            config: { policies: [] },
        },
        {
            method: 'POST',
            path: '/posts/:id/comments',
            handler: 'post.addComment',
            config: { policies: [] },
        },
    ],
};
