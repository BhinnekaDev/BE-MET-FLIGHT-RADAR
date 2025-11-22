"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const path_1 = require("path");
const fs_1 = require("fs");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const nestjs_api_reference_1 = require("@scalar/nestjs-api-reference");
let cachedApp;
async function bootstrap() {
    if (!cachedApp) {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: false,
        });
        app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
        app.use('/openapi.json', (req, res) => {
            const json = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', 'public/openapi.json'), 'utf-8');
            res.type('json').send(json);
        });
        app.use('/docs', (0, nestjs_api_reference_1.apiReference)({ url: '/openapi.json', theme: 'default' }));
        await app.init();
        cachedApp = app;
    }
    return cachedApp;
}
async function handler(req, res) {
    try {
        const app = await bootstrap();
        const expressApp = app.getHttpAdapter().getInstance();
        expressApp(req, res);
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ message: 'Internal Server Error', error: err?.message || err });
    }
}
//# sourceMappingURL=index.js.map