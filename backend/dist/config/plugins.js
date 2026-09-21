"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowedMediaTypes = ['image/*'];
const deniedTypes = [
    'image/svg+xml',
    'application/vnd.microsoft.portable-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-executable',
    'application/x-dosexec',
    'application/x-sh',
    'text/x-shellscript',
    'application/x-mach-binary',
];
const config = ({ env }) => ({
    'users-permissions': {
        config: {
            // Bearer-token auth. The default 'refresh' mode issues httpOnly cookies,
            // which a Flutter client cannot read.
            jwtManagement: 'legacy-support',
            jwt: {
                expiresIn: env('JWT_EXPIRES_IN', '30d'),
            },
        },
    },
    upload: {
        config: {
            sizeLimit: 10 * 1024 * 1024,
            security: {
                allowedTypes: allowedMediaTypes,
                deniedTypes,
            },
        },
    },
});
exports.default = config;
