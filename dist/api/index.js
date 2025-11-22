"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const path_1 = require("path");
const fs_1 = require("fs");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
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
        cachedApp = app;
    }
    return cachedApp;
}
async function handler(req, res) {
    const app = await bootstrap();
    app.getHttpAdapter().getInstance()(req, res);
}
//# sourceMappingURL=index.js.map