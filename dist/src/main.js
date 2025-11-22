"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const nestjs_api_reference_1 = require("@scalar/nestjs-api-reference");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use('/docs', (0, nestjs_api_reference_1.apiReference)({
        url: '/openapi.json',
        theme: 'default',
    }));
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'));
    const port = process.env.PORT ? +process.env.PORT : 3000;
    await app.listen(port);
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`📄 Docs available at http://localhost:${port}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map