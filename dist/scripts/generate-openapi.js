"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const swagger_1 = require("@nestjs/swagger");
async function generateOpenApi() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: false,
    });
    const document = swagger_1.SwaggerModule.createDocument(app, {
        openapi: '3.1.0',
        info: { title: 'MET Flight Radar API', version: '1.0.0' },
    });
    const outputPath = (0, path_1.join)(__dirname, '..', 'public', 'openapi.json');
    (0, fs_1.writeFileSync)(outputPath, JSON.stringify(document, null, 2));
    console.log(`✅ OpenAPI document generated at ${outputPath}`);
    await app.close();
}
void generateOpenApi().catch((err) => {
    console.error('❌ Failed to generate OpenAPI document:', err);
    process.exit(1);
});
//# sourceMappingURL=generate-openapi.js.map