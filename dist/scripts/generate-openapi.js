"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
async function generate() {
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
    console.log('✅ openapi.json generated in public folder');
    await app.close();
}
void generate();
//# sourceMappingURL=generate-openapi.js.map