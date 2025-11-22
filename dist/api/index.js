"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const express_1 = __importDefault(require("express"));
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const platform_express_1 = require("@nestjs/platform-express");
const aws_serverless_express_1 = require("aws-serverless-express");
let cachedServer;
async function bootstrapServer() {
    const expressApp = (0, express_1.default)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
    app.useStaticAssets('public');
    await app.init();
    return (0, aws_serverless_express_1.createServer)(expressApp);
}
async function handler(req, res) {
    if (!cachedServer) {
        cachedServer = await bootstrapServer();
    }
    return (0, aws_serverless_express_1.proxy)(cachedServer, req, res, 'PROMISE').promise;
}
//# sourceMappingURL=index.js.map