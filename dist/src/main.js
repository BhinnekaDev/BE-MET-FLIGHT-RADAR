"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const core_1 = require("@nestjs/core");
const fs_1 = require("fs");
const nestjs_api_reference_1 = require("@scalar/nestjs-api-reference");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const document = swagger_1.SwaggerModule.createDocument(app, {
        openapi: '3.1.0',
        info: {
            title: 'MET Flight Radar API',
            version: '1.0.0',
            description: 'API Documentation',
        },
    });
    const publicDir = (0, path_1.join)(__dirname, '..', 'public');
    if (!(0, fs_1.existsSync)(publicDir))
        (0, fs_1.mkdirSync)(publicDir, { recursive: true });
    const filePath = (0, path_1.join)(publicDir, 'openapi.json');
    (0, fs_1.writeFileSync)(filePath, JSON.stringify(document, null, 2));
    app.use('/docs', (0, nestjs_api_reference_1.apiReference)({
        url: '/openapi.json',
        theme: 'default',
    }));
    app.useStaticAssets(publicDir);
    const port = process.env.PORT ? +process.env.PORT : 3000;
    await app.listen(port);
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`📄 Docs available at http://localhost:${port}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map