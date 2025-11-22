import { join } from 'path';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { apiReference } from '@scalar/nestjs-api-reference';

let cachedApp: NestExpressApplication;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
    });

    // Serve static assets dari folder public
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Serve prebuilt OpenAPI JSON
    app.use('/openapi.json', (req, res) => {
      const json = readFileSync(
        join(__dirname, '..', 'public/openapi.json'),
        'utf-8',
      );
      res.type('json').send(json);
    });

    // Daftarkan Swagger UI /docs
    app.use('/docs', apiReference({ url: '/openapi.json', theme: 'default' }));

    await app.init(); // wajib di serverless supaya Nest siap sebelum handle request
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();

  // Forward request ke Nest Express
  expressApp(req, res);
}
