"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_module_1 = require("./app.module");
const core_1 = require("@nestjs/core");
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
    app.use('/openapi.json', (req, res) => {
        res.json(document);
    });
    app.use('/docs', (0, nestjs_api_reference_1.apiReference)({
        url: '/openapi.json',
        theme: 'default',
    }));
    await app.listen(process.env.PORT ? +process.env.PORT : 3000);
    console.log(`🚀 Server ready at http://localhost:${process.env.PORT ?? 3000}`);
    console.log(`📄 Docs available at http://localhost:${process.env.PORT ?? 3000}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map